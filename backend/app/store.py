"""RequestStore: the app-owned data (requests, reviews, check settings). SQLite today (Q8)."""

import sqlite3
from typing import Final, Protocol
from uuid import uuid4

from app.db import now
from app.models import CourseCounts, Request, RequestType, Review, ReviewStatus


class Unset:
    pass


UNSET: Final = Unset()


class HoldReasonRequired(ValueError):
    """On hold needs a reason (Q3); the review table's CHECK enforces it too."""


class RequestStore(Protocol):
    def list_active(
        self, student_id: str | None = None, *, course_code: str | None = None
    ) -> list[Request]: ...
    def get(self, request_id: str) -> Request | None: ...
    def add(self, student_id: str, course_code: str, type: RequestType) -> Request: ...
    def update(
        self,
        request_id: str,
        *,
        type: RequestType | None = None,
        reason: str | None | Unset = UNSET,
    ) -> Request: ...
    def remove(self, request_id: str) -> Request: ...
    def counts_by_course(self) -> dict[str, CourseCounts]: ...
    def get_review(self, student_id: str) -> Review: ...
    def list_reviews(self) -> dict[str, Review]: ...
    def set_review(
        self, student_id: str, status: ReviewStatus, hold_reason: str | None = None
    ) -> Review: ...
    def disabled_checks(self) -> set[str]: ...
    def set_check(self, rule: str, enabled: bool) -> None: ...


ACTIVE = "removed_at IS NULL"


class SqliteRequestStore:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def list_active(
        self, student_id: str | None = None, *, course_code: str | None = None
    ) -> list[Request]:
        where, args = [ACTIVE], []
        if student_id is not None:
            where.append("student_id = ?")
            args.append(student_id)
        if course_code is not None:
            where.append("course_code = ?")
            args.append(course_code)
        rows = self.conn.execute(
            f"SELECT * FROM request WHERE {' AND '.join(where)} ORDER BY rowid", args
        ).fetchall()
        return [_request(row) for row in rows]

    def get(self, request_id: str) -> Request | None:
        row = self.conn.execute("SELECT * FROM request WHERE id = ?", (request_id,)).fetchone()
        return _request(row) if row else None

    def add(self, student_id: str, course_code: str, type: RequestType) -> Request:
        request_id, stamp = uuid4().hex, now()
        self.conn.execute(
            "INSERT INTO request (id, student_id, course_code, type, source, created_at,"
            " updated_at) VALUES (?, ?, ?, ?, 'app', ?, ?)",
            (request_id, student_id, course_code, type, stamp, stamp),
        )
        return self._must_get(request_id)

    def update(
        self,
        request_id: str,
        *,
        type: RequestType | None = None,
        reason: str | None | Unset = UNSET,
    ) -> Request:
        """Switch type and/or set the reason. A real change marks the request edited (Q2, S5);
        values equal to the current ones are not an edit."""
        current = self._must_get(request_id)
        changes: dict[str, object] = {}
        if type is not None and type != current.type:
            changes["type"] = type
        if not isinstance(reason, Unset) and reason != current.reason:
            changes["reason"] = reason
        if not changes:
            return current
        assignments = ", ".join(f"{column} = ?" for column in changes)
        return self._write(
            f"UPDATE request SET {assignments}, edited_in_app = 1, updated_at = ? WHERE id = ?",
            (*changes.values(), now(), request_id),
            request_id,
        )

    def remove(self, request_id: str) -> Request:
        """Soft delete, so a later SIS import can tell the counselor removed it (S4)."""
        stamp = now()
        return self._write(
            "UPDATE request SET removed_at = ?, edited_in_app = 1, updated_at = ? WHERE id = ?",
            (stamp, stamp, request_id),
            request_id,
        )

    def counts_by_course(self) -> dict[str, CourseCounts]:
        """Active requests per course code, unknown codes included (S2, S16)."""
        rows = self.conn.execute(
            "SELECT course_code,"
            " sum(type = 'priority') AS priority, sum(type = 'elective') AS elective"
            f" FROM request WHERE {ACTIVE} GROUP BY course_code"
        ).fetchall()
        return {
            row["course_code"]: CourseCounts(priority=row["priority"], elective=row["elective"])
            for row in rows
        }

    def get_review(self, student_id: str) -> Review:
        row = self.conn.execute(
            "SELECT * FROM review WHERE student_id = ?", (student_id,)
        ).fetchone()
        if row is None:  # e.g. a student new in a later import: nobody has reviewed them (Q3)
            return Review(student_id, "not_started", None, now())
        return Review(**row)

    def list_reviews(self) -> dict[str, Review]:
        rows = self.conn.execute("SELECT * FROM review").fetchall()
        return {row["student_id"]: Review(**row) for row in rows}

    def set_review(
        self, student_id: str, status: ReviewStatus, hold_reason: str | None = None
    ) -> Review:
        if status == "on_hold" and not (hold_reason and hold_reason.strip()):
            raise HoldReasonRequired("On hold needs a reason")
        self.conn.execute(
            "INSERT INTO review (student_id, status, hold_reason, updated_at) VALUES (?, ?, ?, ?)"
            " ON CONFLICT (student_id) DO UPDATE SET status = excluded.status,"
            " hold_reason = excluded.hold_reason, updated_at = excluded.updated_at",
            (student_id, status, hold_reason if status == "on_hold" else None, now()),
        )
        return self.get_review(student_id)

    def disabled_checks(self) -> set[str]:
        """Rule ids switched off on the Settings screen (Q20); no row means on."""
        rows = self.conn.execute("SELECT rule FROM check_setting WHERE NOT enabled").fetchall()
        return {row["rule"] for row in rows}

    def set_check(self, rule: str, enabled: bool) -> None:
        self.conn.execute(
            "INSERT INTO check_setting (rule, enabled, updated_at) VALUES (?, ?, ?)"
            " ON CONFLICT (rule) DO UPDATE SET enabled = excluded.enabled,"
            " updated_at = excluded.updated_at",
            (rule, int(enabled), now()),
        )

    def _write(self, sql: str, args: tuple[object, ...], request_id: str) -> Request:
        """Run one UPDATE on a request and return it; KeyError if the id is unknown."""
        self.conn.execute(sql, args)
        return self._must_get(request_id)

    def _must_get(self, request_id: str) -> Request:
        request = self.get(request_id)
        if request is None:
            raise KeyError(request_id)
        return request


def _request(row: sqlite3.Row) -> Request:
    return Request(**{**dict(row), "edited_in_app": bool(row["edited_in_app"])})
