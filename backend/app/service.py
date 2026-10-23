"""Business logic for course requests. Routes stay thin; everything testable lives here or in rules."""

import itertools
from datetime import datetime, timezone

from app import rules
from app.models import (
    CourseRequest,
    HistoryEvent,
    Issue,
    NewRequest,
    PlanStatus,
    RequestPatch,
    RequestSource,
    RequestView,
    Severity,
    Student,
    StudentDetail,
    StudentSummary,
    TallyRow,
)
from app.repositories import ReferenceData, RequestRepository


class NotFound(Exception):
    pass


class Conflict(Exception):
    pass


class Invalid(Exception):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


class CourseRequestService:
    def __init__(self, reference: ReferenceData, requests: RequestRepository) -> None:
        self.reference = reference
        self.requests = requests
        self._ids = itertools.count(len(requests.list_requests()) + 1)

    # --- reads ---

    def _catalog(self) -> rules.Catalog:
        return {c.code: c for c in self.reference.list_courses()}

    def _student(self, student_id: str) -> Student:
        student = self.reference.get_student(student_id)
        if not student:
            raise NotFound(f"Student {student_id} not found")
        return student

    def _issues(self, student: Student, reqs: list[CourseRequest]) -> list[Issue]:
        return rules.evaluate(student, reqs, self._catalog())

    def list_students(self) -> list[StudentSummary]:
        summaries = []
        for student in self.reference.list_students():
            reqs = self.requests.list_requests(student.id)
            issues = self._issues(student, reqs)
            summaries.append(
                StudentSummary(
                    student=student,
                    status=self.requests.get_status(student.id),
                    priority_count=sum(r.type == "priority" for r in reqs),
                    elective_count=sum(r.type == "elective" for r in reqs),
                    error_count=sum(i.severity == Severity.ERROR for i in issues),
                    warning_count=sum(i.severity == Severity.WARNING and not i.acknowledged for i in issues),
                )
            )
        return summaries

    def get_student_detail(self, student_id: str) -> StudentDetail:
        student = self._student(student_id)
        reqs = self.requests.list_requests(student_id)
        catalog = self._catalog()
        return StudentDetail(
            student=student,
            status=self.requests.get_status(student_id),
            requests=[RequestView(**r.model_dump(), course=catalog.get(r.course_code)) for r in reqs],
            issues=self._issues(student, reqs),
            history=self.requests.list_history(student_id),
        )

    def tally(self) -> list[TallyRow]:
        reqs = self.requests.list_requests()
        return [
            TallyRow(
                course=c,
                priority=sum(r.course_code == c.code and r.type == "priority" for r in reqs),
                elective=sum(r.course_code == c.code and r.type == "elective" for r in reqs),
            )
            for c in self.reference.list_courses()
        ]

    # --- writes ---

    def _record(self, student_id: str, actor: str, action: str, detail: str) -> None:
        self.requests.add_history(student_id, HistoryEvent(at=_now(), actor=actor, action=action, detail=detail))
        # Any edit reopens the plan: not started -> in progress, complete -> in progress.
        if self.requests.get_status(student_id) in (PlanStatus.NOT_STARTED, PlanStatus.COMPLETE):
            self.requests.set_status(student_id, PlanStatus.IN_PROGRESS)

    def _owned_request(self, student_id: str, request_id: str) -> CourseRequest:
        req = self.requests.get_request(request_id)
        if not req or req.student_id != student_id:
            raise NotFound(f"Request {request_id} not found for student {student_id}")
        return req

    def add_request(self, student_id: str, body: NewRequest, actor: str) -> StudentDetail:
        self._student(student_id)
        course = self.reference.get_course(body.course_code)
        if not course:
            raise Invalid(f"{body.course_code} is not in the course catalog")
        if any(r.course_code == course.code for r in self.requests.list_requests(student_id)):
            raise Conflict(f"{course.code} is already requested")
        self.requests.save_request(
            CourseRequest(
                id=f"R{next(self._ids):03d}",
                student_id=student_id,
                course_code=course.code,
                type=body.type,
                source=RequestSource.COUNSELOR,
                note=body.note,
                updated_at=_now(),
                updated_by=actor,
            )
        )
        self._record(student_id, actor, "added", f"{course.code} {course.name} as {body.type.value}")
        return self.get_student_detail(student_id)

    def update_request(self, student_id: str, request_id: str, patch: RequestPatch, actor: str) -> StudentDetail:
        req = self._owned_request(student_id, request_id)
        changes = patch.model_dump(exclude_unset=True)
        if not changes:
            return self.get_student_detail(student_id)
        updated = req.model_copy(update={**changes, "updated_at": _now(), "updated_by": actor})
        self.requests.save_request(updated)
        detail = ", ".join(f"{k} → {v.value if hasattr(v, 'value') else v or '(cleared)'}" for k, v in changes.items())
        self._record(student_id, actor, "updated", f"{req.course_code}: {detail}")
        return self.get_student_detail(student_id)

    def remove_request(self, student_id: str, request_id: str, actor: str) -> StudentDetail:
        req = self._owned_request(student_id, request_id)
        self.requests.delete_request(request_id)
        self._record(student_id, actor, "removed", f"{req.course_code} ({req.type.value}, from {req.source.value})")
        return self.get_student_detail(student_id)

    def set_status(self, student_id: str, status: PlanStatus, actor: str) -> StudentDetail:
        student = self._student(student_id)
        if status == PlanStatus.COMPLETE:
            errors = [i for i in self._issues(student, self.requests.list_requests(student_id))
                      if i.severity == Severity.ERROR]
            if errors:
                raise Conflict(f"Fix {len(errors)} error(s) before marking complete")
        self.requests.set_status(student_id, status)
        self.requests.add_history(
            student_id, HistoryEvent(at=_now(), actor=actor, action="status", detail=status.value.replace("_", " "))
        )
        return self.get_student_detail(student_id)
