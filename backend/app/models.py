"""Domain types shared by the SIS read path, the request store and (later) the rules."""

from dataclasses import dataclass
from typing import Literal

RequestType = Literal["priority", "elective"]
RequestSource = Literal["sis", "app"]
ReviewStatus = Literal["not_started", "in_progress", "on_hold", "done"]
ImportState = Literal["submitted", "started", "completed", "errored"]


@dataclass(frozen=True)
class Student:
    id: str
    name: str
    grade: int  # the upcoming grade
    profile: str


@dataclass(frozen=True)
class Course:
    code: str
    name: str
    department: str
    grades: list[int]
    is_ap: bool


@dataclass(frozen=True)
class SisImport:
    id: int
    state: ImportState
    source: str
    received_at: str
    finished_at: str | None


@dataclass(frozen=True)
class Request:
    id: str
    student_id: str
    course_code: str
    type: RequestType
    source: RequestSource
    edited_in_app: bool
    reason: str | None
    sis_key: str | None
    base_import_id: int | None
    sis_conflict: str | None
    removed_at: str | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class Review:
    student_id: str
    status: ReviewStatus
    hold_reason: str | None
    updated_at: str


@dataclass(frozen=True)
class CourseCounts:
    priority: int
    elective: int

    @property
    def total(self) -> int:
        return self.priority + self.elective
