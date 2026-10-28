from fastapi import APIRouter, FastAPI

app = FastAPI(title="CourseManager API")
api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api)
