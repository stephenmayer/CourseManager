"""In-memory implementations loaded from seed JSON (stands in for the SIS API and a database)."""

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from app.models import (
    Course,
    CourseRequest,
    HistoryEvent,
    PlanStatus,
    RequestSource,
    RequestType,
    Student,
)

SEED_DIR = Path(__file__).resolve().parent.parent / "seed"


def _load(name: str) -> list[dict]:
    return json.loads((SEED_DIR / name).read_text())


class SeedReferenceData:
    def __init__(self) -> None:
        self._students = {s["id"]: Student(**s) for s in _load("students.json")}
        self._courses = {c["code"]: Course(**c) for c in _load("catalog.json")}

    def list_students(self) -> list[Student]:
        return sorted(self._students.values(), key=lambda s: (s.grade, s.name))

    def get_student(self, student_id: str) -> Student | None:
        return self._students.get(student_id)

    def list_courses(self) -> list[Course]:
        return list(self._courses.values())

    def get_course(self, code: str) -> Course | None:
        return self._courses.get(code)


class InMemoryRequestRepository:
    def __init__(self, seed: bool = True) -> None:
        self._requests: dict[str, CourseRequest] = {}
        self._status: dict[str, PlanStatus] = {}
        self._history: dict[str, list[HistoryEvent]] = defaultdict(list)
        if seed:
            self._load_seed()

    def _load_seed(self) -> None:
        now = datetime.now(timezone.utc)
        for i, r in enumerate(_load("requests.json"), 1):
            req = CourseRequest(
                id=f"R{i:03d}",
                student_id=r["student_id"],
                course_code=r["course_code"],
                type=RequestType(r["type"]),
                source=RequestSource.SIS,
                sis_id=r["sis_id"],
                note=r["note"],
                updated_at=now,
                updated_by="SIS import",
            )
            self._requests[req.id] = req

    def list_requests(self, student_id: str | None = None) -> list[CourseRequest]:
        return [r for r in self._requests.values() if student_id is None or r.student_id == student_id]

    def get_request(self, request_id: str) -> CourseRequest | None:
        return self._requests.get(request_id)

    def save_request(self, request: CourseRequest) -> CourseRequest:
        self._requests[request.id] = request
        return request

    def delete_request(self, request_id: str) -> None:
        self._requests.pop(request_id, None)

    def get_status(self, student_id: str) -> PlanStatus:
        return self._status.get(student_id, PlanStatus.NOT_STARTED)

    def set_status(self, student_id: str, status: PlanStatus) -> None:
        self._status[student_id] = status

    def list_history(self, student_id: str) -> list[HistoryEvent]:
        return list(reversed(self._history[student_id]))

    def add_history(self, student_id: str, event: HistoryEvent) -> None:
        self._history[student_id].append(event)
