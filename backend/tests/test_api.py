"""API tests against the seeded app. Each test gets a fresh app, so state never leaks between tests."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client():
    return TestClient(create_app())


def test_lists_all_seed_students(client):
    students = client.get("/api/students").json()
    assert len(students) == 10
    assert all(s["status"] == "not_started" for s in students)


def test_seed_data_problems_surface_as_errors(client):
    # S008's SIS data has SS303 (not in catalog) and SS402 twice.
    issues = client.get("/api/students/S008").json()["issues"]
    assert {i["rule"] for i in issues if i["severity"] == "error"} == {"unknown_course", "duplicate_course"}


def test_add_request_records_provenance_and_history(client):
    detail = client.post(
        "/api/students/S001/requests", json={"course_code": "AT102", "type": "elective"}, headers={"X-User": "Ms. Lee"}
    ).json()
    added = next(r for r in detail["requests"] if r["course_code"] == "AT102")
    assert added["source"] == "counselor" and added["updated_by"] == "Ms. Lee"
    assert detail["history"][0]["action"] == "added"
    assert detail["status"] == "in_progress"


def test_cannot_add_course_outside_catalog_or_twice(client):
    assert client.post("/api/students/S001/requests", json={"course_code": "XYZ999", "type": "elective"}).status_code == 422
    assert client.post("/api/students/S001/requests", json={"course_code": "MTH101", "type": "priority"}).status_code == 409


def test_switch_type_and_remove(client):
    rid = next(r["id"] for r in client.get("/api/students/S001").json()["requests"] if r["course_code"] == "AT101")
    detail = client.patch(f"/api/students/S001/requests/{rid}", json={"type": "priority"}).json()
    assert next(r for r in detail["requests"] if r["id"] == rid)["type"] == "priority"

    detail = client.delete(f"/api/students/S001/requests/{rid}").json()
    assert rid not in {r["id"] for r in detail["requests"]}


def test_request_ids_are_scoped_to_student(client):
    rid = client.get("/api/students/S001").json()["requests"][0]["id"]
    assert client.delete(f"/api/students/S002/requests/{rid}").status_code == 404


def test_complete_is_blocked_until_errors_fixed(client):
    assert client.put("/api/students/S008/status", json={"status": "complete"}).status_code == 409

    detail = client.get("/api/students/S008").json()
    for issue in detail["issues"]:
        if issue["severity"] == "error":
            client.delete(f"/api/students/S008/requests/{issue['request_id']}")
    assert client.put("/api/students/S008/status", json={"status": "complete"}).json()["status"] == "complete"


def test_tally_counts_requests_per_course(client):
    tally = {row["course"]["code"]: row for row in client.get("/api/tally").json()}
    assert tally["MTH101"]["priority"] == 3  # S001, S002, S003 (retake)
    assert tally["AT301"]["elective"] == 3  # S004, S006, S009
