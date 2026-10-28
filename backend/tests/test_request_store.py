from pathlib import Path
from sqlite3 import Connection

import pytest

from app.db import connect
from app.seed import ensure_seeded, reset
from app.sis.export import SeedFileSource
from app.store import SqliteRequestStore


def aisha_ss402(store: SqliteRequestStore, n: int) -> str:
    [request] = [r for r in store.list_active("S008") if r.sis_key == f"S008|SS402|{n}"]
    return request.id


def test_list_active_by_student(conn: Connection) -> None:
    requests = SqliteRequestStore(conn).list_active("S001")

    assert [r.course_code for r in requests] == ["MTH101", "ENG101", "SS101", "SCI101", "AT101"]


def test_list_active_by_course(conn: Connection) -> None:
    requests = SqliteRequestStore(conn).list_active(course_code="SS402")

    assert sorted(r.student_id for r in requests) == ["S008", "S008", "S009"]


def test_get_by_id(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    request_id = aisha_ss402(store, 2)

    request = store.get(request_id)
    assert request is not None
    assert request.type == "elective"
    assert store.get("nope") is None


def test_add_creates_an_app_request(conn: Connection) -> None:
    store = SqliteRequestStore(conn)

    added = store.add("S008", "SS403", "elective")

    assert added.source == "app"
    assert added.sis_key is None
    assert added.base_import_id is None
    assert added.edited_in_app is False
    assert added.reason is None
    assert store.get(added.id) == added
    assert "SS403" in [r.course_code for r in store.list_active("S008")]


def test_switching_type_marks_edited_and_keeps_reason(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    request_id = aisha_ss402(store, 1)
    store.update(request_id, reason="Counselor approved")

    updated = store.update(request_id, type="elective")

    assert updated.type == "elective"
    assert updated.reason == "Counselor approved"
    assert updated.edited_in_app is True


def test_setting_and_clearing_a_reason_marks_edited(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    request_id = aisha_ss402(store, 1)

    assert store.update(request_id, reason="Retake").reason == "Retake"
    cleared = store.update(request_id, reason=None)
    assert cleared.reason is None
    assert cleared.edited_in_app is True


def test_update_without_changes_leaves_request_untouched(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    request_id = aisha_ss402(store, 1)

    assert store.update(request_id).edited_in_app is False


def test_remove_is_soft_and_hides_the_request(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    elective = aisha_ss402(store, 2)

    removed = store.remove(elective)

    assert removed.removed_at is not None
    assert removed.edited_in_app is True
    assert store.get(elective) == removed
    remaining = [r.sis_key for r in store.list_active("S008") if r.course_code == "SS402"]
    assert remaining == ["S008|SS402|1"]
    assert elective not in [r.id for r in store.list_active(course_code="SS402")]


def test_unknown_request_id_raises(conn: Connection) -> None:
    store = SqliteRequestStore(conn)

    with pytest.raises(KeyError):
        store.update("nope", type="elective")
    with pytest.raises(KeyError):
        store.remove("nope")


def test_counts_by_course_include_unknown_codes(conn: Connection) -> None:
    counts = SqliteRequestStore(conn).counts_by_course()

    assert (counts["SS402"].priority, counts["SS402"].elective) == (2, 1)
    assert counts["SS402"].total == 3
    assert (counts["SS303"].priority, counts["SS303"].elective) == (0, 1)
    assert "SS403" not in counts


def test_counts_exclude_removed_requests(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    store.remove(aisha_ss402(store, 2))

    counts = store.counts_by_course()

    assert (counts["SS402"].priority, counts["SS402"].elective) == (2, 0)


def test_review_status_round_trip(conn: Connection) -> None:
    store = SqliteRequestStore(conn)

    saved = store.set_review("S003", "on_hold", hold_reason="Waiting on transcript")

    assert saved.status == "on_hold"
    assert saved.hold_reason == "Waiting on transcript"
    assert store.get_review("S003") == saved
    assert store.set_review("S003", "in_progress").hold_reason is None


def test_on_hold_needs_a_reason(conn: Connection) -> None:
    with pytest.raises(ValueError):
        SqliteRequestStore(conn).set_review("S003", "on_hold")


def test_a_student_without_a_review_row_is_not_started(conn: Connection) -> None:
    """Q3: nobody has reviewed a student the store has no row for (e.g. new in an import).
    Whether the student exists is the SIS's question, answered by the service (404)."""
    store = SqliteRequestStore(conn)

    assert store.get_review("X1").status == "not_started"
    assert store.get_review("X1").hold_reason is None
    assert store.set_review("X1", "in_progress").status == "in_progress"


def test_same_values_are_not_an_edit(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    request_id = aisha_ss402(store, 1)

    assert store.update(request_id, type="priority", reason=None).edited_in_app is False


def test_reset_restores_the_seed(conn: Connection) -> None:
    store = SqliteRequestStore(conn)
    store.remove(aisha_ss402(store, 2))
    store.add("S001", "AT102", "elective")
    store.set_review("S001", "done")

    reset(conn, SeedFileSource())

    assert len(store.list_active()) == 50
    assert all(not r.edited_in_app for r in store.list_active())
    assert store.get_review("S001").status == "not_started"


def test_ensure_seeded_loads_an_empty_file_once(tmp_path: Path) -> None:
    path = tmp_path / "app.sqlite3"
    first = connect(path)
    ensure_seeded(first, SeedFileSource())
    SqliteRequestStore(first).set_review("S001", "done")
    first.close()

    second = connect(path)
    ensure_seeded(second, SeedFileSource())

    assert SqliteRequestStore(second).get_review("S001").status == "done"
    second.close()


def test_ensure_seeded_adds_check_settings_to_an_older_file(tmp_path: Path) -> None:
    """A database made before Q20 has no check_setting table; startup adds it, keeping data."""
    path = tmp_path / "old.sqlite3"
    old = connect(path)
    ensure_seeded(old, SeedFileSource())
    SqliteRequestStore(old).set_review("S001", "done")
    old.execute("DROP TABLE check_setting")
    old.close()

    reopened = connect(path)
    ensure_seeded(reopened, SeedFileSource())

    store = SqliteRequestStore(reopened)
    assert store.disabled_checks() == set()
    assert store.get_review("S001").status == "done"
    reopened.close()
