from dataclasses import replace
from sqlite3 import Connection

from app.models import Request
from app.rules import CHECKS, RULES, Issue, check_student
from app.sis.reader import SqliteSisSource
from app.store import SqliteRequestStore


def issues_for(
    conn: Connection, student_id: str, edit: dict[str, dict[str, object]] | None = None
) -> list[Issue]:
    """Run the rules on a seed student; `edit` maps course code -> fields to change in memory."""
    sis = SqliteSisSource(conn)
    student = sis.student(student_id)
    assert student is not None
    catalog = {course.code: course for course in sis.catalog()}
    requests: list[Request] = SqliteRequestStore(conn).list_active(student_id)
    for code, changes in (edit or {}).items():
        requests = [replace(r, **changes) if r.course_code == code else r for r in requests]  # type: ignore[arg-type]
    return check_student(student, requests, catalog, RULES)


def request_id(conn: Connection, student_id: str, code: str, n: int = 1) -> str:
    matches = [r for r in SqliteRequestStore(conn).list_active(student_id) if r.course_code == code]
    return matches[n - 1].id


def rules(issues: list[Issue]) -> list[str]:
    return sorted(issue.rule for issue in issues)


def test_alex_is_all_clear(conn: Connection) -> None:
    assert issues_for(conn, "S001") == []


def test_aisha_has_exactly_two_errors(conn: Connection) -> None:
    issues = issues_for(conn, "S008")

    assert rules(issues) == ["duplicate_course", "unknown_course"]
    assert all(issue.severity == "error" for issue in issues)


def test_unknown_course_copy_and_no_out_of_grade_on_it(conn: Connection) -> None:
    [unknown] = [i for i in issues_for(conn, "S008") if i.rule == "unknown_course"]

    assert unknown.request_id == request_id(conn, "S008", "SS303")
    assert unknown.message == "SS303 isn't in the course catalog."
    assert unknown.detail == (
        "It can't be scheduled. Remove it and add the course Aisha meant from the catalog."
    )


def test_duplicate_fires_once_on_the_second_copy_and_links_the_first(conn: Connection) -> None:
    [duplicate] = [i for i in issues_for(conn, "S008") if i.rule == "duplicate_course"]

    assert duplicate.request_id == request_id(conn, "S008", "SS402", 2)
    assert duplicate.related_request_id == request_id(conn, "S008", "SS402", 1)
    assert duplicate.message == "AP Government is already on Aisha's list as a priority."
    assert duplicate.detail == "A course can only be requested once. Remove this copy."


def test_different_english_codes_are_not_duplicates(conn: Connection) -> None:
    assert issues_for(conn, "S002") == []


def test_jordans_retake_is_out_of_grade(conn: Connection) -> None:
    [warning] = issues_for(conn, "S003")

    assert warning.rule == "out_of_grade"
    assert warning.severity == "warning"
    assert warning.request_id == request_id(conn, "S003", "MTH101")
    assert warning.message == "Algebra I is a grade 9 course, and Jordan is going into grade 10."
    assert warning.detail == (
        "Keep it if that's intended, and say why so the assistant principal can see it."
    )
    assert warning.kept is False


def test_a_reason_keeps_the_warning(conn: Connection) -> None:
    [warning] = issues_for(conn, "S003", {"MTH101": {"reason": "Retake after failing"}})

    assert warning.rule == "out_of_grade"
    assert warning.kept is True


def test_early_ap_is_out_of_grade_with_a_multi_grade_label(conn: Connection) -> None:
    [warning] = issues_for(conn, "S004")

    assert warning.rule == "out_of_grade"
    assert warning.message == (
        "AP Computer Science A is a grade 11/12 course, and Priya is going into grade 10."
    )


def test_sofia_has_two_out_of_grade_and_an_ap_load_warning(conn: Connection) -> None:
    issues = issues_for(conn, "S006")

    assert rules(issues) == ["ap_load", "out_of_grade", "out_of_grade"]
    out_of_grade = {i.request_id for i in issues if i.rule == "out_of_grade"}
    assert out_of_grade == {request_id(conn, "S006", "MTH401"), request_id(conn, "S006", "ENG401")}


def test_ap_load_counts_priority_and_elective_and_sits_on_the_last_ap(conn: Connection) -> None:
    [warning] = issues_for(conn, "S009")

    assert warning.rule == "ap_load"
    assert warning.severity == "warning"
    assert warning.message == "5 AP courses is a heavy load for one year."
    assert warning.request_id == request_id(conn, "S009", "AT301")  # the elective
    assert warning.kept is False


def test_ap_load_is_kept_by_a_reason_on_its_request(conn: Connection) -> None:
    [warning] = issues_for(conn, "S009", {"AT301": {"reason": "College-bound, strong record"}})

    assert warning.kept is True


def test_three_aps_is_not_a_heavy_load(conn: Connection) -> None:
    issues = issues_for(
        conn, "S009", {"SCI402": {"course_code": "SCI403"}, "AT301": {"course_code": "SS403"}}
    )

    assert issues == []


def test_switching_a_core_priority_to_elective_raises_the_core_warning(conn: Connection) -> None:
    [warning] = [
        i
        for i in issues_for(conn, "S003", {"ENG201": {"type": "elective"}})
        if i.rule == "core_subject"
    ]

    assert warning.severity == "warning"
    assert warning.message == "No priority English course."
    assert warning.detail == (
        "Grade 10 needs a priority course in English. "
        "Add one from the catalog, or make one of the English courses priority."
    )
    assert warning.request_id is None


def test_removing_a_core_priority_raises_the_core_warning(conn: Connection) -> None:
    issues = issues_for(conn, "S001", {"SCI101": {"course_code": "AT102"}})

    [warning] = [i for i in issues if i.rule == "core_subject"]
    assert warning.message == "No priority Science course."
    assert warning.detail == "Grade 9 needs a priority course in Science. Add one from the catalog."


def test_grade_12_needs_only_an_english_priority(conn: Connection) -> None:
    assert [i for i in issues_for(conn, "S010") if i.rule == "core_subject"] == []
    issues = issues_for(conn, "S010", {"ENG403": {"type": "elective"}})
    core = [i.message for i in issues if i.rule == "core_subject"]
    assert core == ["No priority English course."]


def test_unknown_course_does_not_count_toward_core(conn: Connection) -> None:
    issues = issues_for(conn, "S001", {"MTH101": {"course_code": "MTH999"}})

    assert rules(issues) == ["core_subject", "unknown_course"]


def test_seed_warning_and_error_totals_match_the_approved_student_list(conn: Connection) -> None:
    counts = {}
    for student in SqliteSisSource(conn).students():
        issues = issues_for(conn, student.id)
        counts[student.id] = (
            sum(i.severity == "error" for i in issues),
            sum(i.severity == "warning" for i in issues),
        )

    assert counts == {
        "S001": (0, 0),
        "S002": (0, 0),
        "S003": (0, 1),
        "S004": (0, 1),
        "S005": (0, 0),
        "S006": (0, 3),
        "S007": (0, 0),
        "S008": (2, 0),
        "S009": (0, 1),
        "S010": (0, 0),
    }


def test_every_check_names_its_issues_with_its_own_id_and_severity(conn: Connection) -> None:
    """Q20: Settings switches a check off by id and locks it by severity, so each rule's
    issues must carry exactly its Check's id and severity."""
    sis = SqliteSisSource(conn)
    catalog = {course.code: course for course in sis.catalog()}
    store = SqliteRequestStore(conn)
    cases = [(s, store.list_active(s.id)) for s in sis.students()]
    marcus = next(s for s, _ in cases if s.id == "S005")
    without_physics = [r for r in store.list_active("S005") if r.course_code != "SCI301"]
    cases.append((marcus, without_physics))  # Q4's example: the only core-subject case
    for check in CHECKS:
        issues = [i for student, requests in cases for i in check.rule(student, requests, catalog)]
        assert issues, f"{check.id} fired on no case; add one"
        assert {(i.rule, i.severity) for i in issues} == {(check.id, check.severity)}
