"""Request-list checks.

Each rule is a pure function: (student, requests, catalog) -> issues. No I/O, so they are easy to
unit test and easy to extend. Rules surface problems; they never block an edit. Counselors make the
call, and a warning tied to a request can be acknowledged with an override reason.

The thresholds below are assumptions for the prototype. In production they'd be school settings.
"""

from collections import Counter
from difflib import get_close_matches
from collections.abc import Callable

from app.models import Course, CourseRequest, Issue, RequestType, Severity, Student

CORE_DEPARTMENTS = ("Math", "English", "Social Studies", "Science")
# Assumption: seniors only need English as a priority; the other cores are usually complete by 12th.
REQUIRED_CORE_BY_GRADE = {9: CORE_DEPARTMENTS, 10: CORE_DEPARTMENTS, 11: CORE_DEPARTMENTS, 12: ("English",)}
MIN_REQUESTS = 5
MAX_REQUESTS = 7
MAX_AP_COURSES = 3

Catalog = dict[str, Course]
Rule = Callable[[Student, list[CourseRequest], Catalog], list[Issue]]


def unknown_course(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    issues = []
    for r in requests:
        if r.course_code in catalog:
            continue
        message = f"{r.course_code} is not in the course catalog. Replace or remove it."
        # Typos in SIS data are common; point the counselor at the likely intended course.
        guesses = get_close_matches(r.course_code, catalog.keys(), n=2, cutoff=0.8)
        if guesses:
            message += " Did you mean " + " or ".join(f"{g} {catalog[g].name}" for g in guesses) + "?"
        issues.append(Issue(rule="unknown_course", severity=Severity.ERROR, message=message, request_id=r.id))
    return issues


def duplicate_course(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    counts = Counter(r.course_code for r in requests)
    issues = []
    for code, n in counts.items():
        if n > 1:
            # Attach to the later duplicates so the first one reads as the "real" request.
            for r in [r for r in requests if r.course_code == code][1:]:
                issues.append(
                    Issue(
                        rule="duplicate_course",
                        severity=Severity.ERROR,
                        message=f"{code} is requested {n} times. Keep one.",
                        request_id=r.id,
                    )
                )
    return issues


def grade_eligibility(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    issues = []
    for r in requests:
        course = catalog.get(r.course_code)
        if course and student.grade not in course.grades:
            grades = "/".join(str(g) for g in course.grades)
            issues.append(
                Issue(
                    rule="grade_eligibility",
                    severity=Severity.WARNING,
                    message=f"{course.code} {course.name} is offered to grade {grades}; "
                    f"{student.name.split()[0]} will be in grade {student.grade}.",
                    request_id=r.id,
                    acknowledged=bool(r.override_reason),
                )
            )
    return issues


def missing_core(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    covered = {
        catalog[r.course_code].department
        for r in requests
        if r.type == RequestType.PRIORITY and r.course_code in catalog
    }
    required = REQUIRED_CORE_BY_GRADE.get(student.grade, CORE_DEPARTMENTS)
    return [
        Issue(rule="missing_core", severity=Severity.WARNING, message=f"No priority {dept} course.")
        for dept in required
        if dept not in covered
    ]


def course_load(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    n = len(requests)
    if n < MIN_REQUESTS:
        return [Issue(rule="course_load", severity=Severity.WARNING,
                      message=f"Only {n} requests; a full year is usually {MIN_REQUESTS}-{MAX_REQUESTS}.")]
    if n > MAX_REQUESTS:
        return [Issue(rule="course_load", severity=Severity.WARNING,
                      message=f"{n} requests is more than a typical schedule holds ({MAX_REQUESTS}).")]
    return []


def ap_load(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    aps = sorted({r.course_code for r in requests if r.course_code in catalog and catalog[r.course_code].is_ap})
    if len(aps) > MAX_AP_COURSES:
        return [Issue(rule="ap_load", severity=Severity.WARNING,
                      message=f"{len(aps)} AP courses ({', '.join(aps)}). Check workload and AP section conflicts.")]
    return []


def transcript_pending(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    if "transcript_pending" in student.flags:
        return [Issue(rule="transcript_pending", severity=Severity.WARNING,
                      message="Credit evaluation is pending. Verify prior coursework before finalizing.")]
    return []


RULES: list[Rule] = [
    unknown_course,
    duplicate_course,
    grade_eligibility,
    missing_core,
    course_load,
    ap_load,
    transcript_pending,
]


def evaluate(student: Student, requests: list[CourseRequest], catalog: Catalog) -> list[Issue]:
    return [issue for rule in RULES for issue in rule(student, requests, catalog)]
