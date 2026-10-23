"""Domain models. These double as the API contract (FastAPI serializes them)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class RequestType(str, Enum):
    PRIORITY = "priority"
    ELECTIVE = "elective"


class RequestSource(str, Enum):
    SIS = "sis"  # imported from the Student Information System
    COUNSELOR = "counselor"  # created in this app


class PlanStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    NEEDS_REVIEW = "needs_review"
    COMPLETE = "complete"


class Severity(str, Enum):
    ERROR = "error"  # must be fixed before the plan can be marked complete
    WARNING = "warning"  # needs counselor judgment; can be acknowledged


# --- Reference data (read-only in the app; owned by the SIS) ---


class Course(BaseModel):
    code: str
    name: str
    department: str
    grades: list[int]

    @property
    def is_ap(self) -> bool:
        return self.name.startswith("AP ")


class Student(BaseModel):
    id: str
    name: str
    grade: int = Field(description="Grade the student will be in for the upcoming school year")
    profile: str = ""
    flags: list[str] = []


# --- App-owned data ---


class CourseRequest(BaseModel):
    id: str
    student_id: str
    course_code: str
    type: RequestType
    source: RequestSource
    sis_id: str | None = None
    note: str = ""
    override_reason: str | None = None
    updated_at: datetime
    updated_by: str


class HistoryEvent(BaseModel):
    at: datetime
    actor: str
    action: str
    detail: str


class Issue(BaseModel):
    rule: str
    severity: Severity
    message: str
    request_id: str | None = None
    acknowledged: bool = False


# --- API inputs ---


class NewRequest(BaseModel):
    course_code: str
    type: RequestType
    note: str = ""


class RequestPatch(BaseModel):
    type: RequestType | None = None
    note: str | None = None
    override_reason: str | None = None


class StatusUpdate(BaseModel):
    status: PlanStatus


# --- API outputs ---


class RequestView(CourseRequest):
    course: Course | None  # None when the code is not in the catalog


class StudentSummary(BaseModel):
    student: Student
    status: PlanStatus
    priority_count: int
    elective_count: int
    error_count: int
    warning_count: int


class StudentDetail(BaseModel):
    student: Student
    status: PlanStatus
    requests: list[RequestView]
    issues: list[Issue]
    history: list[HistoryEvent]


class TallyRow(BaseModel):
    course: Course
    priority: int
    elective: int
