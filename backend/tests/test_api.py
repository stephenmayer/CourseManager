from collections.abc import Iterator
from sqlite3 import Connection
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(conn: Connection) -> Iterator[TestClient]:
    with TestClient(create_app(conn)) as test_client:
        yield test_client


def student(client: TestClient, student_id: str) -> dict[str, Any]:
    response = client.get(f"/api/students/{student_id}")
    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    return body


def request_id(client: TestClient, student_id: str, code: str, type: str) -> str:
    [match] = [
        r
        for r in student(client, student_id)["requests"]
        if r["course_code"] == code and r["type"] == type
    ]
    return str(match["id"])


def set_status(client: TestClient, student_id: str, status: str, **extra: str) -> Any:
    return client.put(f"/api/students/{student_id}/review", json={"status": status, **extra})


# Reads


def test_current_import(client: TestClient) -> None:
    body = client.get("/api/sis/current-import").json()

    assert body["id"] == 1
    assert body["source"] == "seed"
    assert body["received_at"]


def test_student_list_rows(client: TestClient) -> None:
    body = client.get("/api/students").json()

    assert body["sis_as_of"] == client.get("/api/sis/current-import").json()["received_at"]
    rows = {row["id"]: row for row in body["students"]}
    assert len(rows) == 10
    aisha = rows["S008"]
    assert aisha["name"] == "Aisha Johnson"
    assert aisha["grade"] == 12
    assert aisha["profile"].startswith("On track for graduation.")
    assert (aisha["priority_count"], aisha["elective_count"]) == (3, 3)
    assert (aisha["error_count"], aisha["warning_count"]) == (2, 0)
    assert aisha["status"] == "not_started"
    assert (rows["S006"]["error_count"], rows["S006"]["warning_count"]) == (0, 3)


def test_student_detail(client: TestClient) -> None:
    body = student(client, "S008")

    assert body["name"] == "Aisha Johnson"
    assert body["status"] == "not_started"
    assert body["hold_reason"] is None
    assert [r["type"] for r in body["requests"]] == ["priority"] * 3 + ["elective"] * 3
    ss303 = next(r for r in body["requests"] if r["course_code"] == "SS303")
    assert ss303["course_name"] is None
    assert ss303["source"] == "sis"
    sci403 = next(r for r in body["requests"] if r["course_code"] == "SCI403")
    assert sci403["course_name"] == "Anatomy & Physiology"
    assert sci403["department"] == "Science"
    assert sci403["grades"] == [12]
    assert [i["rule"] for i in body["issues"]] == ["unknown_course", "duplicate_course"]
    assert body["issues"][0]["request_id"] == ss303["id"]


def test_catalog(client: TestClient) -> None:
    catalog = client.get("/api/catalog").json()

    assert len(catalog) == 37
    assert catalog[0] == {
        "code": "MTH101",
        "name": "Algebra I",
        "department": "Math",
        "grades": [9],
        "is_ap": False,
    }


def test_courses_counts_and_not_in_catalog(client: TestClient) -> None:
    body = client.get("/api/courses").json()

    ss402 = next(c for c in body["courses"] if c["code"] == "SS402")
    assert (ss402["priority"], ss402["elective"], ss402["total"]) == (2, 1, 3)
    assert ss402["name"] == "AP Government"
    unrequested = next(c for c in body["courses"] if c["code"] == "MTH102")
    assert unrequested["total"] == 0
    assert body["not_in_catalog"] == [{"code": "SS303", "priority": 0, "elective": 1, "total": 1}]


def test_course_requests_for_the_dialog(client: TestClient) -> None:
    rows = client.get("/api/courses/SS402/requests").json()

    assert [(r["student_name"], r["request"]["type"]) for r in rows] == [
        ("Aisha Johnson", "priority"),
        ("Aisha Johnson", "elective"),
        ("Liam O'Brien", "priority"),
    ]
    assert [i["rule"] for i in rows[1]["issues"]] == ["duplicate_course"]
    assert rows[0]["issues"] == []


def test_course_requests_for_an_unknown_code(client: TestClient) -> None:
    rows = client.get("/api/courses/SS303/requests").json()

    assert [r["student_id"] for r in rows] == ["S008"]
    assert client.get("/api/courses/NOPE/requests").status_code == 404


def test_list_and_courses_totals_agree(client: TestClient) -> None:
    """S16: both screens count active requests the same way, including after a remove."""
    client.delete(f"/api/requests/{request_id(client, 'S008', 'SS402', 'elective')}")

    students = client.get("/api/students").json()["students"]
    courses = client.get("/api/courses").json()
    list_total = sum(s["priority_count"] + s["elective_count"] for s in students)
    courses_total = sum(c["total"] for c in courses["courses"] + courses["not_in_catalog"])
    assert list_total == courses_total == 49


# Writes


def test_add_from_catalog(client: TestClient) -> None:
    response = client.post("/api/students/S008/requests", json={"course_code": "SS403"})

    assert response.status_code == 201
    added = next(r for r in response.json()["requests"] if r["course_code"] == "SS403")
    assert added["type"] == "elective"
    assert added["source"] == "app"
    assert added["edited_in_app"] is False


def test_add_a_course_already_on_the_list_is_refused(client: TestClient) -> None:
    """E5: never create a new duplicate."""
    response = client.post("/api/students/S001/requests", json={"course_code": "MTH101"})

    assert response.status_code == 409
    assert response.json() == {"detail": "Algebra I is already on Alex's list."}


def test_add_a_removed_course_again_is_allowed(client: TestClient) -> None:
    client.delete(f"/api/requests/{request_id(client, 'S001', 'AT101', 'elective')}")

    response = client.post("/api/students/S001/requests", json={"course_code": "AT101"})

    assert response.status_code == 201


def test_add_an_unknown_code_is_refused(client: TestClient) -> None:
    response = client.post("/api/students/S001/requests", json={"course_code": "SS303"})

    assert response.status_code == 422
    assert response.json() == {"detail": "SS303 isn't in the course catalog."}


def test_switch_type_marks_the_request_edited(client: TestClient) -> None:
    rid = request_id(client, "S003", "ENG201", "priority")

    body = client.patch(f"/api/requests/{rid}", json={"type": "elective"}).json()

    switched = next(r for r in body["requests"] if r["id"] == rid)
    assert switched["type"] == "elective"
    assert switched["edited_in_app"] is True
    assert "No English priority." in [i["message"] for i in body["issues"]]


def test_reason_keeps_a_warning_and_survives_a_type_switch(client: TestClient) -> None:
    """S7: the reason lives on the request."""
    rid = request_id(client, "S003", "MTH101", "priority")

    client.patch(f"/api/requests/{rid}", json={"reason": "Retake"})
    body = client.patch(f"/api/requests/{rid}", json={"type": "elective"}).json()

    assert next(r for r in body["requests"] if r["id"] == rid)["reason"] == "Retake"
    [warning] = [i for i in body["issues"] if i["rule"] == "out_of_grade"]
    assert warning["kept"] is True


def test_clearing_a_reason(client: TestClient) -> None:
    rid = request_id(client, "S003", "MTH101", "priority")
    client.patch(f"/api/requests/{rid}", json={"reason": "Retake"})

    body = client.patch(f"/api/requests/{rid}", json={"reason": None}).json()

    assert next(r for r in body["requests"] if r["id"] == rid)["reason"] is None


def test_removing_the_duplicate_elective_keeps_the_priority(client: TestClient) -> None:
    """S3: edits address a request by id, never by (student, course)."""
    elective = request_id(client, "S008", "SS402", "elective")

    response = client.delete(f"/api/requests/{elective}")

    assert response.status_code == 200
    ss402 = [r for r in response.json()["requests"] if r["course_code"] == "SS402"]
    assert [r["type"] for r in ss402] == ["priority"]
    assert [i["rule"] for i in response.json()["issues"]] == ["unknown_course"]


def test_removed_request_cannot_be_edited(client: TestClient) -> None:
    rid = request_id(client, "S008", "SS303", "elective")
    client.delete(f"/api/requests/{rid}")

    assert client.patch(f"/api/requests/{rid}", json={"type": "priority"}).status_code == 404
    assert client.delete(f"/api/requests/{rid}").status_code == 404


# Review status (Q3)


def test_done_is_refused_while_errors_remain(client: TestClient) -> None:
    """E1."""
    response = set_status(client, "S008", "done")

    assert response.status_code == 409
    assert response.json() == {"detail": "Fix 2 errors to mark Done."}
    assert student(client, "S008")["status"] == "not_started"


def test_done_after_fixing_errors(client: TestClient) -> None:
    client.delete(f"/api/requests/{request_id(client, 'S008', 'SS303', 'elective')}")
    assert set_status(client, "S008", "done").json() == {"detail": "Fix 1 error to mark Done."}
    client.delete(f"/api/requests/{request_id(client, 'S008', 'SS402', 'elective')}")

    assert set_status(client, "S008", "done").json()["status"] == "done"


def test_done_is_allowed_with_warnings(client: TestClient) -> None:
    """E2."""
    response = set_status(client, "S003", "done")

    assert response.status_code == 200
    assert response.json()["status"] == "done"


@pytest.mark.parametrize(
    "edit",
    [
        lambda c, rid: c.patch(f"/api/requests/{rid}", json={"type": "elective"}),
        lambda c, rid: c.patch(f"/api/requests/{rid}", json={"reason": "Note"}),
        lambda c, rid: c.delete(f"/api/requests/{rid}"),
        lambda c, rid: c.post("/api/students/S001/requests", json={"course_code": "AT102"}),
    ],
    ids=["switch", "reason", "remove", "add"],
)
def test_any_edit_reopens_a_done_student(client: TestClient, edit: Any) -> None:
    """E3 and S6: the same endpoints serve the student page and the course dialog."""
    set_status(client, "S001", "done")

    body = edit(client, request_id(client, "S001", "MTH101", "priority")).json()

    assert body["status"] == "in_progress"


def test_edits_do_not_change_other_statuses(client: TestClient) -> None:
    rid = request_id(client, "S001", "AT101", "elective")

    assert client.delete(f"/api/requests/{rid}").json()["status"] == "not_started"


def test_on_hold_needs_a_reason(client: TestClient) -> None:
    """E4."""
    refused = set_status(client, "S010", "on_hold")
    held = set_status(client, "S010", "on_hold", hold_reason="Transcript pending")

    assert refused.status_code == 422
    assert refused.json() == {"detail": "Say why the student is on hold."}
    assert (held.json()["status"], held.json()["hold_reason"]) == ("on_hold", "Transcript pending")


def test_unknown_status_is_rejected(client: TestClient) -> None:
    assert set_status(client, "S001", "finished").status_code == 422


# Not found (E9)


@pytest.mark.parametrize(
    ("method", "path", "body", "message"),
    [
        ("get", "/api/students/S999", None, "No student with id S999."),
        (
            "post",
            "/api/students/S999/requests",
            {"course_code": "MTH101"},
            "No student with id S999.",
        ),
        ("put", "/api/students/S999/review", {"status": "done"}, "No student with id S999."),
        ("patch", "/api/requests/nope", {"type": "elective"}, "No request with id nope."),
        ("delete", "/api/requests/nope", None, "No request with id nope."),
    ],
)
def test_unknown_ids_are_404_with_a_plain_message(
    client: TestClient, method: str, path: str, body: Any, message: str
) -> None:
    response = client.request(method, path, json=body)

    assert response.status_code == 404
    assert response.json() == {"detail": message}


# Reset


def test_reset_restores_the_seed(client: TestClient) -> None:
    client.delete(f"/api/requests/{request_id(client, 'S008', 'SS303', 'elective')}")
    set_status(client, "S001", "done")

    assert client.post("/api/reset").status_code == 200

    assert student(client, "S001")["status"] == "not_started"
    assert len(student(client, "S008")["issues"]) == 2
