"""The one service behind the routes: reads join SIS data, app data and the rules;
every write goes through `_apply_request_change` (seams S6) and returns the full student."""

from collections.abc import Callable
from dataclasses import dataclass

from app.models import Course, CourseCounts, Request, RequestType, ReviewStatus, SisImport, Student
from app.rules import Issue, check_student
from app.sis.reader import SisSource
from app.store import UNSET, RequestStore, Unset


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
class CourseRow:
    code: str
    course: Course | None
    counts: CourseCounts


@dataclass(frozen=True)
class CourseRequest:
    student: Student
    request: RequestView
    issues: list[Issue]  # the issues that sit on this request


class CourseService:
    def __init__(self, sis: SisSource, store: RequestStore, reseed: Callable[[], None]) -> None:
        self.sis = sis
        self.store = store
        self.reseed = reseed

    # Reads

    def current_import(self) -> SisImport:
        return self.sis.current_import()

    def catalog(self) -> list[Course]:
        return self.sis.catalog()

    def list_students(self) -> list[StudentRow]:
        catalog = self._catalog()
        rows = []
        for student in self.sis.students():
            requests = self.store.list_active(student.id)
            issues = check_student(student, requests, catalog)
            rows.append(
                StudentRow(
                    student=student,
                    status=self.store.get_review(student.id).status,
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
        requests = sorted(self.store.list_active(student_id), key=lambda r: r.type != "priority")
        review = self.store.get_review(student_id)
        return StudentDetail(
            student=student,
            status=review.status,
            hold_reason=review.hold_reason,
            requests=[RequestView(r, catalog.get(r.course_code)) for r in requests],
            issues=check_student(student, requests, catalog),
        )

    def courses(self) -> tuple[list[CourseRow], list[CourseRow]]:
        """Every catalog course with its counts, then codes requested but not in the catalog.

        Counts come from the store's one count query, which excludes removed requests
        like every other read, so they always agree with the student list (S16).
        """
        counts = self.store.counts_by_course()
        catalog = self._catalog()
        in_catalog = [
            CourseRow(c.code, c, counts.get(c.code, CourseCounts(0, 0))) for c in catalog.values()
        ]
        not_in_catalog = [
            CourseRow(code, None, count)
            for code, count in sorted(counts.items())
            if code not in catalog
        ]
        return in_catalog, not_in_catalog

    def course_requests(self, course_code: str) -> list[CourseRequest]:
        catalog = self._catalog()
        requests = self.store.list_active(course_code=course_code)
        if course_code not in catalog and not requests:
            raise NotFound(f"No course with code {course_code}.")
        rows = []
        for request in requests:
            student = self._student(request.student_id)
            issues = check_student(student, self.store.list_active(student.id), catalog)
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

    # Writes

    def add_request(
        self, student_id: str, course_code: str, type: RequestType = "elective"
    ) -> StudentDetail:
        student = self._student(student_id)
        course = self._catalog().get(course_code)
        if course is None:
            raise Invalid(f"{course_code} isn't in the course catalog.")
        if any(r.course_code == course_code for r in self.store.list_active(student_id)):
            raise Conflict(f"{course.name} is already on {_first_name(student)}'s list.")
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
        if type is None and isinstance(reason, Unset):
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
        """Q3: Done is refused while errors remain; On hold needs a reason."""
        detail = self.student_detail(student_id)
        if status == "done":
            errors = sum(i.severity == "error" for i in detail.issues)
            if errors:
                noun = "error" if errors == 1 else "errors"
                raise Conflict(f"Fix {errors} {noun} to mark Done.")
        if status == "on_hold" and not (hold_reason and hold_reason.strip()):
            raise Invalid("Say why the student is on hold.")
        self.store.set_review(student_id, status, hold_reason)
        return self.student_detail(student_id)

    def reset(self) -> SisImport:
        self.reseed()
        return self.sis.current_import()

    # Internals

    def _apply_request_change(self, student_id: str, change: Callable[[], object]) -> StudentDetail:
        """Run one request edit, then Q3's rule: editing a Done student reopens it."""
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

    def _catalog(self) -> dict[str, Course]:
        return {course.code: course for course in self.sis.catalog()}


def _first_name(student: Student) -> str:
    return student.name.split()[0]
