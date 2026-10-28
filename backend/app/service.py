"""The one service behind the routes: reads join SIS data, app data and the rules;
every write goes through `_apply_request_change` (seams S6) and returns the full student.

The rules always see a student's active requests in the store's order (the order they were
added), on every screen, so order-dependent checks ("the first copy", "the last AP") point
at the same request everywhere. Screens sort for display afterwards.
"""

from collections import Counter, defaultdict
from collections.abc import Callable
from contextlib import AbstractContextManager
from dataclasses import dataclass, replace

from app.models import Course, CourseCounts, Request, RequestType, ReviewStatus, SisImport, Student
from app.rules import (
    CHECKS,
    RULES,
    Check,
    Issue,
    Rule,
    check_student,
    duplicate_course,
    first_name,
)
from app.sis.reader import SisSource
from app.store import UNSET, HoldReasonRequired, RequestStore, Unset


class ServiceError(Exception):
    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFound(ServiceError):
    status_code = 404


class Conflict(ServiceError):
    status_code = 409


class Invalid(ServiceError):
    status_code = 422


@dataclass(frozen=True)
class RequestView:
    request: Request
    course: Course | None  # None when the code isn't in the catalog


@dataclass(frozen=True)
class StudentDetail:
    student: Student
    status: ReviewStatus
    hold_reason: str | None
    requests: list[RequestView]  # priority first, then elective
    issues: list[Issue]


@dataclass(frozen=True)
class StudentRow:
    student: Student
    status: ReviewStatus
    priority_count: int
    elective_count: int
    error_count: int
    warning_count: int


@dataclass(frozen=True)
class CatalogCourseRow:
    course: Course
    counts: CourseCounts
    duplicates: int = 0  # copies the duplicate_course rule flags ("Requested twice")


@dataclass(frozen=True)
class UnknownCourseRow:
    """A code students requested that isn't in the catalog (Q5)."""

    code: str
    counts: CourseCounts
    duplicates: int = 0


@dataclass(frozen=True)
class CourseRequest:
    student: Student
    request: RequestView
    issues: list[Issue]  # the issues that sit on this request


@dataclass(frozen=True)
class CheckRow:
    check: Check
    enabled: bool
    student_count: int  # students it flags now, counted even while it is off


Atomic = Callable[[], AbstractContextManager[object]]


class CourseService:
    def __init__(
        self,
        sis: SisSource,
        store: RequestStore,
        reseed: Callable[[], None],
        atomic: Atomic,
    ) -> None:
        self.sis = sis
        self.store = store
        self.reseed = reseed
        self.atomic = atomic  # wraps each write so an edit and its reopen land together

    # Reads

    def current_import(self) -> SisImport:
        return self.sis.current_import()

    def catalog(self) -> list[Course]:
        return self.sis.catalog()

    def list_students(self) -> list[StudentRow]:
        catalog = self._catalog()
        by_student = self._active_by_student()
        reviews = self.store.list_reviews()
        rules = self._rules()
        rows = []
        for student in self.sis.students():
            requests = by_student.get(student.id, [])
            issues = check_student(student, requests, catalog, rules)
            review = reviews.get(student.id) or self.store.get_review(student.id)
            rows.append(
                StudentRow(
                    student=student,
                    status=review.status,
                    priority_count=sum(r.type == "priority" for r in requests),
                    elective_count=sum(r.type == "elective" for r in requests),
                    error_count=sum(i.severity == "error" for i in issues),
                    warning_count=sum(i.severity == "warning" for i in issues),
                )
            )
        return rows

    def student_detail(self, student_id: str) -> StudentDetail:
        student = self._student(student_id)
        catalog = self._catalog()
        requests = self.store.list_active(student_id)
        review = self.store.get_review(student_id)
        shown = sorted(requests, key=lambda r: r.type != "priority")
        return StudentDetail(
            student=student,
            status=review.status,
            hold_reason=review.hold_reason,
            requests=[RequestView(r, catalog.get(r.course_code)) for r in shown],
            issues=check_student(student, requests, catalog, self._rules()),
        )

    def courses(self) -> tuple[list[CatalogCourseRow], list[UnknownCourseRow]]:
        """Every catalog course with its counts, then codes requested but not in the catalog.

        Counts come from the store's one count query, which excludes removed requests
        like every other read, so they agree with the student list (S16, tested).
        """
        counts = self.store.counts_by_course()
        catalog = self._catalog()
        duplicates = self._duplicates_by_course(catalog)
        in_catalog = [
            CatalogCourseRow(c, counts.get(c.code, CourseCounts(0, 0)), duplicates[c.code])
            for c in catalog.values()
        ]
        not_in_catalog = [
            UnknownCourseRow(code, count, duplicates[code])
            for code, count in sorted(counts.items())
            if code not in catalog
        ]
        return in_catalog, not_in_catalog

    def _duplicates_by_course(self, catalog: dict[str, Course]) -> Counter[str]:
        """How many copies of each course the duplicate_course rule flags, across students."""
        by_student = self._active_by_student()
        codes = {r.id: r.course_code for requests in by_student.values() for r in requests}
        flagged: Counter[str] = Counter()
        for student in self.sis.students():
            for issue in duplicate_course(student, by_student.get(student.id, []), catalog):
                if issue.request_id is not None:
                    flagged[codes[issue.request_id]] += 1
        return flagged

    def course_requests(self, course_code: str) -> list[CourseRequest]:
        catalog = self._catalog()
        requests = self.store.list_active(course_code=course_code)
        if course_code not in catalog and not requests:
            raise NotFound(f"No course with code {course_code}.")
        rules = self._rules()
        issues_by_student: dict[str, tuple[Student, list[Issue]]] = {}
        for student_id in {r.student_id for r in requests}:
            student = self._student(student_id)
            issues_by_student[student_id] = (
                student,
                check_student(student, self.store.list_active(student_id), catalog, rules),
            )
        rows = []
        for request in requests:
            student, issues = issues_by_student[request.student_id]
            rows.append(
                CourseRequest(
                    student=student,
                    request=RequestView(request, catalog.get(course_code)),
                    issues=[i for i in issues if i.request_id == request.id],
                )
            )
        return sorted(
            rows, key=lambda row: (row.student.name, row.request.request.type != "priority")
        )

    def checks(self) -> list[CheckRow]:
        """Every check, whether it is on, and how many students it flags now (Q20)."""
        catalog = self._catalog()
        by_student = self._active_by_student()
        flagged: Counter[str] = Counter()
        for student in self.sis.students():
            issues = check_student(student, by_student.get(student.id, []), catalog, RULES)
            flagged.update({issue.rule for issue in issues})
        disabled = self.store.disabled_checks()
        return [CheckRow(check, check.id not in disabled, flagged[check.id]) for check in CHECKS]

    # Writes

    def add_request(
        self, student_id: str, course_code: str, type: RequestType = "elective"
    ) -> StudentDetail:
        student = self._student(student_id)
        course = self._catalog().get(course_code)
        if course is None:
            raise Invalid(f"{course_code} isn't in the course catalog.")
        if any(r.course_code == course_code for r in self.store.list_active(student_id)):
            raise Conflict(f"{course.name} is already on {first_name(student)}'s list.")
        return self._apply_request_change(
            student_id, lambda: self.store.add(student_id, course_code, type)
        )

    def update_request(
        self,
        request_id: str,
        *,
        type: RequestType | None = None,
        reason: str | None | Unset = UNSET,
    ) -> StudentDetail:
        request = self._active_request(request_id)
        if isinstance(reason, str) and not reason.strip():
            reason = None  # a blank reason is no reason
        unchanged_type = type is None or type == request.type
        unchanged_reason = isinstance(reason, Unset) or reason == request.reason
        if unchanged_type and unchanged_reason:
            return self.student_detail(request.student_id)
        return self._apply_request_change(
            request.student_id, lambda: self.store.update(request_id, type=type, reason=reason)
        )

    def remove_request(self, request_id: str) -> StudentDetail:
        request = self._active_request(request_id)
        return self._apply_request_change(request.student_id, lambda: self.store.remove(request_id))

    def set_review(
        self, student_id: str, status: ReviewStatus, hold_reason: str | None = None
    ) -> StudentDetail:
        """Q3: Done is refused while errors remain; On hold needs a reason (the store's rule)."""
        detail = self.student_detail(student_id)
        if status == "done":
            errors = sum(i.severity == "error" for i in detail.issues)
            if errors:
                noun = "error" if errors == 1 else "errors"
                raise Conflict(f"Fix {errors} {noun} to mark Done.")
        try:
            review = self.store.set_review(student_id, status, hold_reason)
        except HoldReasonRequired:
            raise Invalid("Say why the student is on hold.") from None
        return replace(detail, status=review.status, hold_reason=review.hold_reason)

    def set_check(self, rule: str, enabled: bool) -> list[CheckRow]:
        """Switch a warning on or off for everyone. Errors stay on (Q5). Not a request edit,
        so no student is reopened (Q3)."""
        check = next((c for c in CHECKS if c.id == rule), None)
        if check is None:
            raise NotFound(f"No check called {rule}.")
        if check.locked and not enabled:
            raise Conflict(f"{check.name} is always on.")
        self.store.set_check(rule, enabled)
        return self.checks()

    def reset(self) -> SisImport:
        self.reseed()
        return self.sis.current_import()

    # Internals

    def _apply_request_change(self, student_id: str, change: Callable[[], object]) -> StudentDetail:
        """Run one request edit and Q3's rule (editing a Done student reopens it) as one write."""
        with self.atomic():
            change()
            if self.store.get_review(student_id).status == "done":
                self.store.set_review(student_id, "in_progress")
        return self.student_detail(student_id)

    def _student(self, student_id: str) -> Student:
        student = self.sis.student(student_id)
        if student is None:
            raise NotFound(f"No student with id {student_id}.")
        return student

    def _active_request(self, request_id: str) -> Request:
        request = self.store.get(request_id)
        if request is None or request.removed_at is not None:
            raise NotFound(f"No request with id {request_id}.")
        return request

    def _active_by_student(self) -> dict[str, list[Request]]:
        """All active requests in one query, grouped by student, in store order."""
        grouped: dict[str, list[Request]] = defaultdict(list)
        for request in self.store.list_active():
            grouped[request.student_id].append(request)
        return grouped

    def _rules(self) -> list[Rule]:
        """The switched-on rules, in rule order (Q20)."""
        disabled = self.store.disabled_checks()
        return [check.rule for check in CHECKS if check.id not in disabled]

    def _catalog(self) -> dict[str, Course]:
        return {course.code: course for course in self.sis.catalog()}
