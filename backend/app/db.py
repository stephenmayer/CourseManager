"""SQLite connection, schema (docs/architecture/schema.md §2-3) and transactions."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

# Q20. IF NOT EXISTS so startup can add it to a database made before it existed.
CHECK_SETTING = """CREATE TABLE IF NOT EXISTS check_setting (
  rule       TEXT PRIMARY KEY,
  enabled    INTEGER NOT NULL,
  updated_at TEXT NOT NULL
)"""

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
    CHECK_SETTING,
]

# Children before parents, so foreign keys never block the drop.
TABLES = [
    "check_setting",
    "request",
    "review",
    "sis_request",
    "sis_course",
    "sis_student",
    "sis_import",
]


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
