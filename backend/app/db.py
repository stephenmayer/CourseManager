"""SQLite connection, schema (docs/architecture/schema.md §2-3), reset and first-run seeding."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.sis.export import ExportSource

SCHEMA = [
    """CREATE TABLE sis_import (
  id          INTEGER PRIMARY KEY,
  state       TEXT NOT NULL CHECK (state IN ('submitted', 'started', 'completed', 'errored')),
  is_current  INTEGER NOT NULL DEFAULT 0,
  source      TEXT NOT NULL,
  received_at TEXT NOT NULL,
  finished_at TEXT,
  changes     INTEGER NOT NULL DEFAULT 0,
  errors_in   INTEGER NOT NULL DEFAULT 0
)""",
    "CREATE UNIQUE INDEX one_current_import ON sis_import (is_current) WHERE is_current = 1",
    """CREATE TABLE sis_student (
  import_id INTEGER NOT NULL REFERENCES sis_import (id),
  id        TEXT NOT NULL,
  name      TEXT NOT NULL,
  grade     INTEGER NOT NULL,
  profile   TEXT,
  PRIMARY KEY (import_id, id)
)""",
    """CREATE TABLE sis_course (
  import_id  INTEGER NOT NULL REFERENCES sis_import (id),
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  department TEXT NOT NULL,
  grades     TEXT NOT NULL,
  is_ap      INTEGER NOT NULL,
  PRIMARY KEY (import_id, code)
)""",
    """CREATE TABLE sis_request (
  import_id   INTEGER NOT NULL REFERENCES sis_import (id),
  sis_key     TEXT NOT NULL,
  student_id  TEXT NOT NULL,
  course_code TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('priority', 'elective')),
  PRIMARY KEY (import_id, sis_key)
)""",
    """CREATE TABLE request (
  id               TEXT PRIMARY KEY,
  student_id       TEXT NOT NULL,
  course_code      TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('priority', 'elective')),
  source           TEXT NOT NULL CHECK (source IN ('sis', 'app')),
  edited_in_app    INTEGER NOT NULL DEFAULT 0,
  reason           TEXT,
  sis_key          TEXT,
  base_import_id   INTEGER REFERENCES sis_import (id),
  sis_conflict     TEXT,
  removed_at       TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
)""",
    "CREATE INDEX request_by_student ON request (student_id) WHERE removed_at IS NULL",
    "CREATE INDEX request_by_course ON request (course_code) WHERE removed_at IS NULL",
    """CREATE TABLE review (
  student_id  TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'not_started'
              CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'done')),
  hold_reason TEXT,
  updated_at  TEXT NOT NULL,
  CHECK (status <> 'on_hold' OR hold_reason IS NOT NULL)
)""",
]

# Children before parents, so foreign keys never block the drop.
TABLES = ["request", "review", "sis_request", "sis_course", "sis_student", "sis_import"]


def now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def connect(path: str | Path) -> sqlite3.Connection:
    """Open the database in autocommit mode; multi-statement writes use `transaction`."""
    conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def transaction(conn: sqlite3.Connection) -> Iterator[None]:
    conn.execute("BEGIN")
    try:
        yield
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    conn.execute("COMMIT")


def reset(conn: sqlite3.Connection, sis: ExportSource) -> None:
    """Drop everything, recreate the schema and load `sis` as import #1, in one transaction.

    Works on an open connection, so the app never has to delete its file (seams S13).
    """
    from app.sis.loader import write_import  # the loader builds on this module

    export = sis.fetch()
    with transaction(conn):
        for table in TABLES:
            conn.execute(f"DROP TABLE IF EXISTS {table}")
        for statement in SCHEMA:
            conn.execute(statement)
        import_id = write_import(conn, export, source="seed")
        _start_app_data(conn, import_id)


def ensure_seeded(conn: sqlite3.Connection, sis: ExportSource) -> None:
    """Seed a new database; leave one that already has a current import alone."""
    has_imports = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sis_import'"
    ).fetchone()
    if (
        not has_imports
        or not conn.execute("SELECT 1 FROM sis_import WHERE is_current = 1").fetchone()
    ):
        reset(conn, sis)


def _start_app_data(conn: sqlite3.Connection, import_id: int) -> None:
    """One SIS-sourced request per SIS request and one not-started review per student."""
    stamp = now()
    for row in conn.execute(
        "SELECT sis_key, student_id, course_code, type FROM sis_request"
        " WHERE import_id = ? ORDER BY rowid",
        (import_id,),
    ).fetchall():
        conn.execute(
            "INSERT INTO request (id, student_id, course_code, type, source, sis_key,"
            " base_import_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'sis', ?, ?, ?, ?)",
            (
                uuid4().hex,
                row["student_id"],
                row["course_code"],
                row["type"],
                row["sis_key"],
                import_id,
                stamp,
                stamp,
            ),
        )
    conn.execute(
        "INSERT INTO review (student_id, updated_at) SELECT id, ? FROM sis_student"
        " WHERE import_id = ?",
        (stamp, import_id),
    )
