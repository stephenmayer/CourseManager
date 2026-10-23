"""Unit tests for the request rules. Pure functions, no app or HTTP needed."""

from datetime import datetime, timezone

from app import rules
from app.models import Course, CourseRequest, RequestSource, RequestType, Student

CATALOG = {
    c.code: c
    for c in [
        Course(code="MTH101", name="Algebra I", department="Math", grades=[9]),
        Course(code="ENG101", name="English 9", department="English", grades=[9]),
        Course(code="SS101", name="World History", department="Social Studies", grades=[9]),
        Course(code="SCI101", name="Biology", department="Science", grades=[9]),
        Course(code="AT101", name="Introduction to Computing", department="Arts & Tech", grades=[9, 10]),
        Course(code="ENG401", name="AP English Language", department="English", grades=[12]),
        Course(code="MTH401", name="AP Calculus AB", department="Math", grades=[12]),
        Course(code="SS402", name="AP Government", department="Social Studies", grades=[12]),
        Course(code="SCI402", name="AP Chemistry", department="Science", grades=[12]),
    ]
}


def student(grade=9, flags=()):
    return Student(id="S1", name="Test Student", grade=grade, flags=list(flags))


def req(code, type_=RequestType.PRIORITY, rid=None, override=None):
    return CourseRequest(
        id=rid or f"R-{code}",
        student_id="S1",
        course_code=code,
        type=type_,
        source=RequestSource.COUNSELOR,
        override_reason=override,
        updated_at=datetime.now(timezone.utc),
        updated_by="test",
    )


FULL_NINTH = [req("MTH101"), req("ENG101"), req("SS101"), req("SCI101"), req("AT101", RequestType.ELECTIVE)]


def rules_hit(issues):
    return sorted(i.rule for i in issues)


def test_clean_ninth_grade_plan_has_no_issues():
    assert rules.evaluate(student(), FULL_NINTH, CATALOG) == []


def test_unknown_course_is_an_error():
    issues = rules.unknown_course(student(), [req("SS303")], CATALOG)
    assert [(i.rule, i.severity.value, i.request_id) for i in issues] == [("unknown_course", "error", "R-SS303")]


def test_unknown_course_suggests_close_matches():
    [issue] = rules.unknown_course(student(), [req("SCI10")], CATALOG)
    assert "Did you mean SCI101 Biology?" in issue.message


def test_duplicate_flags_only_the_later_copy():
    reqs = [req("SS402", rid="R1"), req("SS402", RequestType.ELECTIVE, rid="R2")]
    issues = rules.duplicate_course(student(12), reqs, CATALOG)
    assert [i.request_id for i in issues] == ["R2"]


def test_grade_eligibility_warns_and_override_acknowledges():
    tenth = student(grade=10)
    [issue] = rules.grade_eligibility(tenth, [req("MTH101")], CATALOG)
    assert issue.severity.value == "warning" and not issue.acknowledged

    [issue] = rules.grade_eligibility(tenth, [req("MTH101", override="Retake after failing Algebra I")], CATALOG)
    assert issue.acknowledged


def test_missing_core_only_counts_priority_requests():
    reqs = [req("MTH101"), req("ENG101"), req("SS101"), req("SCI101", RequestType.ELECTIVE)]
    issues = rules.missing_core(student(), reqs, CATALOG)
    assert [i.message for i in issues] == ["No priority Science course."]


def test_seniors_only_need_english():
    assert rules.missing_core(student(12), [req("ENG401")], CATALOG) == []


def test_course_load_bounds():
    assert rules_hit(rules.course_load(student(), FULL_NINTH[:3], CATALOG)) == ["course_load"]
    assert rules.course_load(student(), FULL_NINTH, CATALOG) == []


def test_ap_load_over_threshold():
    reqs = [req("ENG401"), req("MTH401"), req("SS402"), req("SCI402")]
    assert rules_hit(rules.ap_load(student(12), reqs, CATALOG)) == ["ap_load"]
    assert rules.ap_load(student(12), reqs[:3], CATALOG) == []


def test_transcript_pending_flag():
    assert rules_hit(rules.transcript_pending(student(flags=["transcript_pending"]), [], CATALOG)) == [
        "transcript_pending"
    ]
