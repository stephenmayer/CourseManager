"""Q20: the Checks screen switches each warning on or off for the whole tool; errors stay on."""

from sqlite3 import Connection
from typing import Any

from fastapi.testclient import TestClient

from app.store import SqliteRequestStore
from tests.test_api import request_id, set_status, student


def checks(client: TestClient) -> dict[str, dict[str, Any]]:
    response = client.get("/api/checks")
    assert response.status_code == 200
    return {check["rule"]: check for check in response.json()}


def switch(client: TestClient, rule: str, enabled: bool) -> Any:
    return client.put(f"/api/checks/{rule}", json={"enabled": enabled})


def rules_on(client: TestClient, student_id: str) -> list[str]:
    return sorted(issue["rule"] for issue in student(client, student_id)["issues"])


def list_row(client: TestClient, student_id: str) -> dict[str, Any]:
    rows = client.get("/api/students").json()["students"]
    row: dict[str, Any] = next(r for r in rows if r["id"] == student_id)
    return row


def test_seed_lists_five_checks_all_on_in_rule_order(client: TestClient) -> None:
    body = client.get("/api/checks").json()

    assert [c["rule"] for c in body] == [
        "unknown_course",
        "duplicate_course",
        "out_of_grade",
        "core_subject",
        "ap_load",
    ]
    assert all(c["enabled"] for c in body)
    assert [c["student_count"] for c in body] == [1, 1, 3, 0, 2]
    assert [c["locked"] for c in body] == [True, True, False, False, False]
    assert [c["severity"] for c in body] == ["error", "error", "warning", "warning", "warning"]


def test_each_check_has_the_board_copy(client: TestClient) -> None:
    by_rule = checks(client)

    assert by_rule["unknown_course"]["name"] == "Unknown course"
    assert by_rule["unknown_course"]["description"] == (
        "A requested course code isn't in the course catalog."
    )
    assert by_rule["duplicate_course"]["name"] == "Course requested twice"
    assert by_rule["out_of_grade"]["name"] == "Course outside its grade"
    assert by_rule["core_subject"]["name"] == "No priority course in a core subject"
    assert by_rule["core_subject"]["note"] == (
        "Our assumption until the school's graduation rules are added."
    )
    assert by_rule["ap_load"]["name"] == "Heavy AP load"
    assert by_rule["ap_load"]["description"] == "More than 3 AP courses in one year."
    assert by_rule["ap_load"]["note"] is None


def test_switching_a_warning_off_returns_the_updated_list(client: TestClient) -> None:
    response = switch(client, "ap_load", False)

    assert response.status_code == 200
    by_rule = {c["rule"]: c for c in response.json()}
    assert by_rule["ap_load"]["enabled"] is False
    assert by_rule["ap_load"]["student_count"] == 2  # what it would flag, shown when back on
    assert checks(client)["ap_load"]["enabled"] is False


def test_a_warning_switched_off_is_hidden_on_every_screen(client: TestClient) -> None:
    assert rules_on(client, "S009") == ["ap_load"]
    assert list_row(client, "S009")["warning_count"] == 1

    switch(client, "ap_load", False)

    assert rules_on(client, "S009") == []
    assert rules_on(client, "S006") == ["out_of_grade", "out_of_grade"]
    assert list_row(client, "S009")["warning_count"] == 0
    assert list_row(client, "S006")["warning_count"] == 2
    dialog = client.get("/api/courses/AT301/requests").json()
    assert all(row["issues"] == [] for row in dialog if row["student_id"] == "S009")


def test_switching_back_on_shows_a_kept_warning_with_its_reason(client: TestClient) -> None:
    rid = request_id(client, "S003", "MTH101", "priority")
    client.patch(f"/api/requests/{rid}", json={"reason": "Retake"})

    switch(client, "out_of_grade", False)
    assert rules_on(client, "S003") == []

    switch(client, "out_of_grade", True)
    [warning] = student(client, "S003")["issues"]
    assert warning["rule"] == "out_of_grade"
    assert warning["kept"] is True
    request = next(r for r in student(client, "S003")["requests"] if r["id"] == rid)
    assert request["reason"] == "Retake"


def test_an_error_cannot_be_switched_off(client: TestClient) -> None:
    response = switch(client, "unknown_course", False)

    assert response.status_code == 409
    assert response.json() == {"detail": "Unknown course is always on."}
    assert checks(client)["unknown_course"]["enabled"] is True
    assert rules_on(client, "S008") == ["duplicate_course", "unknown_course"]


def test_switching_an_error_on_is_allowed(client: TestClient) -> None:
    assert switch(client, "duplicate_course", True).status_code == 200


def test_an_unknown_check_is_404(client: TestClient) -> None:
    response = switch(client, "no_such_rule", False)

    assert response.status_code == 404
    assert response.json() == {"detail": "No check called no_such_rule."}


def test_switching_a_check_is_not_an_edit(client: TestClient) -> None:
    """Q3: only request edits reopen a Done student; a check switch touches no student."""
    set_status(client, "S009", "done")
    before = student(client, "S009")["requests"]

    switch(client, "ap_load", False)
    switch(client, "ap_load", True)

    after = student(client, "S009")
    assert after["status"] == "done"
    assert after["requests"] == before


def test_reset_switches_every_check_back_on(client: TestClient) -> None:
    switch(client, "ap_load", False)
    switch(client, "core_subject", False)

    client.post("/api/reset")

    assert all(c["enabled"] for c in checks(client).values())


def test_a_stored_off_row_cannot_switch_an_error_off(client: TestClient, conn: Connection) -> None:
    """Q5: errors stay on even if a row says otherwise (written directly, or a rule that later
    became an error)."""
    SqliteRequestStore(conn).set_check("unknown_course", False)

    assert rules_on(client, "S008") == ["duplicate_course", "unknown_course"]
    assert checks(client)["unknown_course"]["enabled"] is True
