"""The checks: pure functions (student, active requests, catalog) -> issues (overview §3).

Run on every read and never stored. Adding a rule = one function here, added to RULES,
plus its tests. A rule only names the request an issue sits on; check_student marks a
warning kept when that request has a reason, so every warning rule gets that for free.
"""

from collections.abc import Callable, Mapping
from dataclasses import dataclass, replace
from typing import Literal

from app.models import Course, Request, Student

Severity = Literal["error", "warning"]
Catalog = Mapping[str, Course]

KEEP_IT = "Keep it if that's intended, and say why so the assistant principal can see it."

# Q4: a stated assumption a school would configure; marks where graduation rules plug in.
CORE_SUBJECTS = {
    9: ["Math", "English", "Social Studies", "Science"],
    10: ["Math", "English", "Social Studies", "Science"],
    11: ["Math", "English", "Social Studies", "Science"],
    12: ["English"],
}
# M2: more than this many AP courses (priority and elective) is a heavy load. An assumption.
AP_LIMIT = 3


@dataclass(frozen=True)
class Issue:
    severity: Severity
    rule: str
    message: str
    detail: str
    request_id: str | None = None
    related_request_id: str | None = None
    kept: bool = False  # a warning whose request carries a reason (Q1); set by check_student


def unknown_course(student: Student, requests: list[Request], catalog: Catalog) -> list[Issue]:
    """Q5: a code the catalog doesn't have can't be scheduled. Blocks Done."""
    return [
        Issue(
            severity="error",
            rule="unknown_course",
            message=f"{r.course_code} isn't in the course catalog.",
            detail=(
                "It can't be scheduled. Remove it and add the course "
                f"{_first_name(student)} meant from the catalog."
            ),
            request_id=r.id,
        )
        for r in requests
        if r.course_code not in catalog
    ]


def duplicate_course(student: Student, requests: list[Request], catalog: Catalog) -> list[Issue]:
    """Q5: the same course twice. Reported on each later copy, linking the first (S8)."""
    first: dict[str, Request] = {}
    issues = []
    for r in requests:
        original = first.setdefault(r.course_code, r)
        if original is r:
            continue
        course = catalog.get(r.course_code)
        name = course.name if course else r.course_code
        issues.append(
            Issue(
                severity="error",
                rule="duplicate_course",
                message=(
                    f"{name} is already on {_first_name(student)}'s list as a {original.type}."
                ),
                detail="A course can only be requested once. Remove this copy.",
                request_id=r.id,
                related_request_id=original.id,
            )
        )
    return issues


def out_of_grade(student: Student, requests: list[Request], catalog: Catalog) -> list[Issue]:
    """Q1: a course outside its catalog grades warns and can be kept with a reason.

    Unknown codes have no grades and are left to `unknown_course` (S8).
    """
    issues = []
    for r in requests:
        course = catalog.get(r.course_code)
        if course is None or student.grade in course.grades:
            continue
        grades = "/".join(str(g) for g in course.grades)
        issues.append(
            Issue(
                severity="warning",
                rule="out_of_grade",
                message=(
                    f"{course.name} is a grade {grades} course, and "
                    f"{_first_name(student)} is going into grade {student.grade}."
                ),
                detail=KEEP_IT,
                request_id=r.id,
            )
        )
    return issues


def core_subject(student: Student, requests: list[Request], catalog: Catalog) -> list[Issue]:
    """Q4: each core subject for the grade needs at least one priority course."""
    covered = {
        catalog[r.course_code].department
        for r in requests
        if r.type == "priority" and r.course_code in catalog
    }
    return [
        Issue(
            severity="warning",
            rule="core_subject",
            message=f"No {subject} priority.",
            detail=(
                f"Grade {student.grade} needs a priority course in {subject}. "
                f"Add one from the catalog, or make a {subject} course priority."
            ),
        )
        for subject in CORE_SUBJECTS.get(student.grade, [])
        if subject not in covered
    ]


def ap_load(student: Student, requests: list[Request], catalog: Catalog) -> list[Issue]:
    """M2: more than AP_LIMIT APs warns. It sits on the last AP so a reason there keeps it."""
    aps = [r for r in requests if r.course_code in catalog and catalog[r.course_code].is_ap]
    if len(aps) <= AP_LIMIT:
        return []
    last = aps[-1]
    return [
        Issue(
            severity="warning",
            rule="ap_load",
            message=f"{len(aps)} AP courses is a heavy load for one year.",
            detail=KEEP_IT,
            request_id=last.id,
        )
    ]


Rule = Callable[[Student, list[Request], Catalog], list[Issue]]
RULES: list[Rule] = [unknown_course, duplicate_course, out_of_grade, core_subject, ap_load]


def check_student(student: Student, requests: list[Request], catalog: Catalog) -> list[Issue]:
    """All issues for one student's active requests: errors first, then warnings."""
    reasons = {r.id: r.reason for r in requests}
    issues = [
        replace(issue, kept=bool(reasons.get(issue.request_id or "")))
        if issue.severity == "warning"
        else issue
        for rule in RULES
        for issue in rule(student, requests, catalog)
    ]
    return sorted(issues, key=lambda issue: issue.severity != "error")


def _first_name(student: Student) -> str:
    return student.name.split()[0]
