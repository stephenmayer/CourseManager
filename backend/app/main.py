import os
import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.db import connect
from app.models import RequestSource, RequestType, ReviewStatus
from app.rules import Severity
from app.seed import ensure_seeded, reset
from app.service import (
    CourseRow,
    CourseService,
    RequestView,
    ServiceError,
    StudentDetail,
)
from app.sis.export import SeedFileSource
from app.sis.reader import SqliteSisSource
from app.store import UNSET, SqliteRequestStore

DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "coursemanager.sqlite3"


# Response shapes. Models that mirror a domain dataclass read it directly (from_attributes),
# so a new field is added in two places, not three.


class FromDomain(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ImportOut(FromDomain):
    id: int
    received_at: str
    source: str


class CourseOut(FromDomain):
    code: str
    name: str
    department: str
    grades: list[int]
    is_ap: bool


class RequestOut(BaseModel):
    id: str
    course_code: str
    course_name: str | None
    department: str | None
    grades: list[int] | None
    is_ap: bool | None
    type: RequestType
    source: RequestSource
    edited_in_app: bool
    reason: str | None


class IssueOut(FromDomain):
    severity: Severity
    rule: str
    message: str
    detail: str
    request_id: str | None
    related_request_id: str | None
    kept: bool


class StudentOut(BaseModel):
    id: str
    name: str
    grade: int
    profile: str
    status: ReviewStatus


class StudentDetailOut(StudentOut):
    hold_reason: str | None
    requests: list[RequestOut]
    issues: list[IssueOut]


class StudentRowOut(StudentOut):
    priority_count: int
    elective_count: int
    error_count: int
    warning_count: int


class StudentListOut(BaseModel):
    sis_as_of: str
    students: list[StudentRowOut]


class CourseCountOut(BaseModel):
    code: str
    priority: int
    elective: int
    total: int


class CatalogCourseCountOut(CourseCountOut):
    name: str
    department: str
    grades: list[int]
    is_ap: bool


class CoursesOut(BaseModel):
    courses: list[CatalogCourseCountOut]
    not_in_catalog: list[CourseCountOut]


class CourseRequestOut(BaseModel):
    student_id: str
    student_name: str
    request: RequestOut
    issues: list[IssueOut]


# Request bodies


class AddRequestIn(BaseModel):
    course_code: str
    type: RequestType = "elective"  # the design adds as elective; switch on the list


class UpdateRequestIn(BaseModel):
    type: RequestType | None = None
    reason: str | None = Field(default=None, description="Omit to leave unchanged; null clears")


class ReviewIn(BaseModel):
    status: ReviewStatus
    hold_reason: str | None = None


# Mapping


def request_out(view: RequestView) -> RequestOut:
    r, c = view.request, view.course
    return RequestOut(
        id=r.id,
        course_code=r.course_code,
        course_name=c.name if c else None,
        department=c.department if c else None,
        grades=c.grades if c else None,
        is_ap=c.is_ap if c else None,
        type=r.type,
        source=r.source,
        edited_in_app=r.edited_in_app,
        reason=r.reason,
    )


def detail_out(detail: StudentDetail) -> StudentDetailOut:
    s = detail.student
    return StudentDetailOut(
        id=s.id,
        name=s.name,
        grade=s.grade,
        profile=s.profile,
        status=detail.status,
        hold_reason=detail.hold_reason,
        requests=[request_out(v) for v in detail.requests],
        issues=[IssueOut.model_validate(i) for i in detail.issues],
    )


def count_out(row: CourseRow) -> CourseCountOut:
    c = row.counts
    return CourseCountOut(code=row.code, priority=c.priority, elective=c.elective, total=c.total)


# Routes. They are `async def` on purpose: they run one at a time on the event loop,
# so the single SQLite connection is never used from two threads at once.

api = APIRouter(prefix="/api")


def get_service(request: Request) -> CourseService:
    service: CourseService = request.app.state.service
    return service


Service = Annotated[CourseService, Depends(get_service)]


@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@api.get("/sis/current-import")
async def current_import(service: Service) -> ImportOut:
    return ImportOut.model_validate(service.current_import())


@api.get("/students")
async def list_students(service: Service) -> StudentListOut:
    rows = [
        StudentRowOut(
            id=row.student.id,
            name=row.student.name,
            grade=row.student.grade,
            profile=row.student.profile,
            status=row.status,
            priority_count=row.priority_count,
            elective_count=row.elective_count,
            error_count=row.error_count,
            warning_count=row.warning_count,
        )
        for row in service.list_students()
    ]
    return StudentListOut(sis_as_of=service.current_import().received_at, students=rows)


@api.get("/students/{student_id}")
async def get_student(student_id: str, service: Service) -> StudentDetailOut:
    return detail_out(service.student_detail(student_id))


@api.post("/students/{student_id}/requests", status_code=201)
async def add_request(student_id: str, body: AddRequestIn, service: Service) -> StudentDetailOut:
    return detail_out(service.add_request(student_id, body.course_code, body.type))


@api.patch("/requests/{request_id}")
async def update_request(
    request_id: str, body: UpdateRequestIn, service: Service
) -> StudentDetailOut:
    reason = body.reason if "reason" in body.model_fields_set else UNSET
    return detail_out(service.update_request(request_id, type=body.type, reason=reason))


@api.delete("/requests/{request_id}")
async def remove_request(request_id: str, service: Service) -> StudentDetailOut:
    return detail_out(service.remove_request(request_id))


@api.put("/students/{student_id}/review")
async def set_review(student_id: str, body: ReviewIn, service: Service) -> StudentDetailOut:
    return detail_out(service.set_review(student_id, body.status, body.hold_reason))


@api.get("/catalog")
async def catalog(service: Service) -> list[CourseOut]:
    return [CourseOut.model_validate(c) for c in service.catalog()]


@api.get("/courses")
async def courses(service: Service) -> CoursesOut:
    in_catalog, not_in_catalog = service.courses()
    return CoursesOut(
        courses=[
            CatalogCourseCountOut(
                code=row.code,
                name=row.course.name,
                department=row.course.department,
                grades=row.course.grades,
                is_ap=row.course.is_ap,
                priority=row.counts.priority,
                elective=row.counts.elective,
                total=row.counts.total,
            )
            for row in in_catalog
            if row.course is not None
        ],
        not_in_catalog=[count_out(row) for row in not_in_catalog],
    )


@api.get("/courses/{course_code}/requests")
async def course_requests(course_code: str, service: Service) -> list[CourseRequestOut]:
    return [
        CourseRequestOut(
            student_id=row.student.id,
            student_name=row.student.name,
            request=request_out(row.request),
            issues=[IssueOut.model_validate(i) for i in row.issues],
        )
        for row in service.course_requests(course_code)
    ]


@api.post("/reset")
async def reset_data(service: Service) -> ImportOut:
    return ImportOut.model_validate(service.reset())


# App


def build_service(conn: sqlite3.Connection) -> CourseService:
    return CourseService(
        sis=SqliteSisSource(conn),
        store=SqliteRequestStore(conn),
        reseed=lambda: reset(conn, SeedFileSource()),
    )


def create_app(conn: sqlite3.Connection | None = None) -> FastAPI:
    """With `conn`, serve that database (tests). Without, open the SQLite file on startup,
    seeding it the first time (Q8). Path: $COURSEMANAGER_DB or backend/data/."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if conn is not None:
            app.state.service = build_service(conn)
            yield
            return
        path = Path(os.environ.get("COURSEMANAGER_DB", DEFAULT_DB))
        path.parent.mkdir(parents=True, exist_ok=True)
        own = connect(path)
        ensure_seeded(own, SeedFileSource())
        app.state.service = build_service(own)
        yield
        own.close()

    app = FastAPI(title="CourseManager API", lifespan=lifespan)

    @app.exception_handler(ServiceError)
    async def service_error(_request: Request, error: ServiceError) -> JSONResponse:
        return JSONResponse(status_code=error.status_code, content={"detail": error.message})

    app.include_router(api)
    return app


app = create_app()
