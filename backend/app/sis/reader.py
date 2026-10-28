"""Layer 3, SisSource: the only read path for SIS data. Reads the current import (seams S1)."""

import sqlite3
from typing import Protocol

from app.models import Course, SisImport, Student


class SisSource(Protocol):
    def current_import(self) -> SisImport: ...
    def students(self) -> list[Student]: ...
    def student(self, student_id: str) -> Student | None: ...
    def catalog(self) -> list[Course]: ...


CURRENT = "(SELECT id FROM sis_import WHERE is_current = 1)"


class SqliteSisSource:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def current_import(self) -> SisImport:
        row = self.conn.execute(
            "SELECT id, state, source, received_at, finished_at FROM sis_import"
            " WHERE is_current = 1"
        ).fetchone()
        return SisImport(**row)

    def students(self) -> list[Student]:
        rows = self.conn.execute(
            f"SELECT id, name, grade, profile FROM sis_student WHERE import_id = {CURRENT}"
            " ORDER BY id"
        ).fetchall()
        return [_student(row) for row in rows]

    def student(self, student_id: str) -> Student | None:
        row = self.conn.execute(
            f"SELECT id, name, grade, profile FROM sis_student WHERE import_id = {CURRENT}"
            " AND id = ?",
            (student_id,),
        ).fetchone()
        return _student(row) if row else None

    def catalog(self) -> list[Course]:
        rows = self.conn.execute(
            "SELECT code, name, department, grades, is_ap FROM sis_course"
            f" WHERE import_id = {CURRENT} ORDER BY rowid"
        ).fetchall()
        return [
            Course(
                code=row["code"],
                name=row["name"],
                department=row["department"],
                grades=[int(g) for g in row["grades"].split(",")],
                is_ap=bool(row["is_ap"]),
            )
            for row in rows
        ]


def _student(row: sqlite3.Row) -> Student:
    return Student(id=row["id"], name=row["name"], grade=row["grade"], profile=row["profile"] or "")
