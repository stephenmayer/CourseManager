from sqlite3 import Connection

import pytest

from app.db import connect
from app.seed import reset
from app.sis.export import RawExport
from app.sis.loader import load_import
from app.sis.reader import SqliteSisSource
from app.store import SqliteRequestStore


class FakeSource:
    """Stands in for a real SIS API: any object returning the raw export shape."""

    def __init__(self, export: RawExport) -> None:
        self.export = export

    def fetch(self) -> RawExport:
        return self.export


TWO_STUDENTS: RawExport = {
    "exported_at": "2026-11-01T06:00:00Z",
    "students": [
        {"id": "X1", "name": "Ada One", "grade": 9, "profile": ""},
        {"id": "X2", "name": "Bo Two", "grade": 10, "profile": "New"},
    ],
    "courses": [{"code": "MTH101", "name": "Algebra I", "department": "Math", "grades": "9"}],
    "requests": [{"student_id": "X1", "course_code": "MTH101", "type": "P"}],
}


def test_seed_loads_the_appendix_as_is(conn: Connection) -> None:
    sis = SqliteSisSource(conn)

    assert len(sis.students()) == 10
    assert len(sis.catalog()) == 37
    assert len(SqliteRequestStore(conn).list_active()) == 50


def test_seed_keeps_aishas_bad_data(conn: Connection) -> None:
    codes = [r.course_code for r in SqliteRequestStore(conn).list_active(student_id="S008")]

    assert "SS303" in codes
    assert codes.count("SS402") == 2


def test_duplicate_requests_get_distinct_keys_and_ids(conn: Connection) -> None:
    requests = SqliteRequestStore(conn).list_active()
    ss402 = [r for r in requests if r.student_id == "S008" and r.course_code == "SS402"]

    assert sorted(r.sis_key or "" for r in ss402) == ["S008|SS402|1", "S008|SS402|2"]
    assert len({r.id for r in requests}) == len(requests)


def test_seed_requests_are_sis_owned_and_based_on_import_1(conn: Connection) -> None:
    for request in SqliteRequestStore(conn).list_active():
        assert request.source == "sis"
        assert request.base_import_id == 1
        assert request.edited_in_app is False
        assert request.removed_at is None


def test_request_type_is_normalized(conn: Connection) -> None:
    by_key = {r.sis_key: r for r in SqliteRequestStore(conn).list_active()}

    assert by_key["S008|SS402|1"].type == "priority"
    assert by_key["S008|SS402|2"].type == "elective"


def test_every_student_starts_not_started(conn: Connection) -> None:
    store = SqliteRequestStore(conn)

    for student in SqliteSisSource(conn).students():
        review = store.get_review(student.id)
        assert review.status == "not_started"
        assert review.hold_reason is None


def test_grades_parse_to_a_list(conn: Connection) -> None:
    catalog = {c.code: c for c in SqliteSisSource(conn).catalog()}

    assert catalog["AT101"].grades == [9, 10]
    assert catalog["MTH101"].grades == [9]


def test_is_ap_comes_from_the_name(conn: Connection) -> None:
    catalog = {c.code: c for c in SqliteSisSource(conn).catalog()}

    assert catalog["MTH401"].name == "AP Calculus AB"
    assert catalog["MTH401"].is_ap is True
    assert catalog["MTH301"].name == "Calculus"
    assert catalog["MTH301"].is_ap is False


def test_student_lookup(conn: Connection) -> None:
    sis = SqliteSisSource(conn)

    student = sis.student("S003")
    assert student is not None
    assert (student.name, student.grade) == ("Jordan Williams", 10)
    assert student.profile.startswith("Failed MTH101")
    assert sis.student("S999") is None


def test_seed_is_the_current_completed_import(conn: Connection) -> None:
    current = SqliteSisSource(conn).current_import()

    assert current.id == 1
    assert current.source == "seed"
    assert current.state == "completed"
    assert current.received_at


def test_loader_accepts_any_source() -> None:
    connection = connect(":memory:")
    reset(connection, FakeSource(TWO_STUDENTS))
    sis = SqliteSisSource(connection)

    assert [s.id for s in sis.students()] == ["X1", "X2"]
    assert [c.code for c in sis.catalog()] == ["MTH101"]
    assert len(SqliteRequestStore(connection).list_active()) == 1


def test_sis_source_reads_only_the_current_import(conn: Connection) -> None:
    import_id = load_import(conn, FakeSource(TWO_STUDENTS), source="file")
    sis = SqliteSisSource(conn)

    assert import_id == 2
    assert sis.current_import().id == 2
    assert [s.id for s in sis.students()] == ["X1", "X2"]
    assert sis.student("S001") is None


def test_a_failed_import_writes_nothing(conn: Connection) -> None:
    broken: RawExport = {**TWO_STUDENTS, "courses": [{"code": "X"}]}  # type: ignore[typeddict-item]

    with pytest.raises(KeyError):
        load_import(conn, FakeSource(broken), source="file")

    sis = SqliteSisSource(conn)
    assert sis.current_import().id == 1
    assert len(sis.students()) == 10
    assert conn.execute("SELECT count(*) FROM sis_import").fetchone()[0] == 1
