"""Reset and first-run seeding: the seed export becomes SIS import #1 plus fresh app data."""

import sqlite3
from uuid import uuid4

from app.db import CHECK_SETTING, SCHEMA, TABLES, now, transaction
from app.sis.export import ExportSource
from app.sis.loader import write_import


def reset(conn: sqlite3.Connection, sis: ExportSource) -> None:
    """Drop everything, recreate the schema and load `sis` as import #1, in one transaction.

    Works on an open connection, so the app never has to delete its file (seams S13).
    """
    export = sis.fetch()
    with transaction(conn):
        for table in TABLES:
            conn.execute(f"DROP TABLE IF EXISTS {table}")
        for statement in SCHEMA:
            conn.execute(statement)
        import_id = write_import(conn, export, source="seed")
        _start_app_data(conn, import_id)


def ensure_seeded(conn: sqlite3.Connection, sis: ExportSource) -> None:
    """Seed a new database; leave the data in one that already has a current import alone."""
    has_imports = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sis_import'"
    ).fetchone()
    if (
        not has_imports
        or not conn.execute("SELECT 1 FROM sis_import WHERE is_current = 1").fetchone()
    ):
        reset(conn, sis)
    else:
        conn.execute(CHECK_SETTING)  # tables added since the file was made


def _start_app_data(conn: sqlite3.Connection, import_id: int) -> None:
    """One SIS-sourced request per SIS request and one not-started review per student."""
    stamp = now()
    rows = conn.execute(
        "SELECT sis_key, student_id, course_code, type FROM sis_request"
        " WHERE import_id = ? ORDER BY rowid",
        (import_id,),
    ).fetchall()
    conn.executemany(
        "INSERT INTO request (id, student_id, course_code, type, source, sis_key,"
        " base_import_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'sis', ?, ?, ?, ?)",
        [
            (uuid4().hex, r["student_id"], r["course_code"], r["type"], r["sis_key"], import_id)
            + (stamp, stamp)
            for r in rows
        ],
    )
    conn.execute(
        "INSERT INTO review (student_id, updated_at) SELECT id, ? FROM sis_student"
        " WHERE import_id = ?",
        (stamp, import_id),
    )
