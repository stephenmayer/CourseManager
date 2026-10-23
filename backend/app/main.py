"""HTTP layer. Thin by design: parse input, call the service, map errors to status codes."""

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.models import Course, NewRequest, RequestPatch, StatusUpdate, StudentDetail, StudentSummary, TallyRow
from app.repositories import InMemoryRequestRepository, SeedReferenceData
from app.service import Conflict, CourseRequestService, Invalid, NotFound

SCHOOL_YEAR = "2027-28"
DEFAULT_ACTOR = "Demo Counselor"  # no auth in the prototype


def build_service() -> CourseRequestService:
    # The one place that decides where data comes from. Swap these for SIS/DB-backed classes later.
    return CourseRequestService(SeedReferenceData(), InMemoryRequestRepository())


def create_app() -> FastAPI:
    app = FastAPI(title="Course Request Manager", version="0.1.0")
    app.state.service = build_service()
    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

    def svc(request: Request) -> CourseRequestService:
        return request.app.state.service

    def run(fn, *args):
        try:
            return fn(*args)
        except NotFound as e:
            raise HTTPException(404, str(e))
        except Conflict as e:
            raise HTTPException(409, str(e))
        except Invalid as e:
            raise HTTPException(422, str(e))

    @app.get("/api/meta")
    def meta() -> dict:
        return {"school_year": SCHOOL_YEAR}

    @app.get("/api/courses")
    def courses(request: Request) -> list[Course]:
        return svc(request).reference.list_courses()

    @app.get("/api/students")
    def students(request: Request) -> list[StudentSummary]:
        return svc(request).list_students()

    @app.get("/api/students/{student_id}")
    def student(student_id: str, request: Request) -> StudentDetail:
        return run(svc(request).get_student_detail, student_id)

    @app.post("/api/students/{student_id}/requests", status_code=201)
    def add_request(student_id: str, body: NewRequest, request: Request,
                    x_user: str = Header(DEFAULT_ACTOR)) -> StudentDetail:
        return run(svc(request).add_request, student_id, body, x_user)

    @app.patch("/api/students/{student_id}/requests/{request_id}")
    def update_request(student_id: str, request_id: str, body: RequestPatch, request: Request,
                       x_user: str = Header(DEFAULT_ACTOR)) -> StudentDetail:
        return run(svc(request).update_request, student_id, request_id, body, x_user)

    @app.delete("/api/students/{student_id}/requests/{request_id}")
    def remove_request(student_id: str, request_id: str, request: Request,
                       x_user: str = Header(DEFAULT_ACTOR)) -> StudentDetail:
        return run(svc(request).remove_request, student_id, request_id, x_user)

    @app.put("/api/students/{student_id}/status")
    def set_status(student_id: str, body: StatusUpdate, request: Request,
                   x_user: str = Header(DEFAULT_ACTOR)) -> StudentDetail:
        return run(svc(request).set_status, student_id, body.status, x_user)

    @app.get("/api/tally")
    def tally(request: Request) -> list[TallyRow]:
        return svc(request).tally()

    @app.post("/api/reset", status_code=204)
    def reset(request: Request) -> None:
        request.app.state.service = build_service()

    return app


app = create_app()
