"""Layer 2, the Loader: normalizes a raw export into our model and writes one import snapshot.

Normalization lives here and only here: grades "9/10" -> "9,10", is_ap from the course
name (gaps G9), P/E -> priority/elective, and sis_key = student|course|n (Q18).
"""

import sqlite3
from collections import Counter

from app.db import now, transaction
from app.sis.export import ExportSource, RawExport

REQUEST_TYPES = {"P": "priority", "E": "elective"}


def load_import(conn: sqlite3.Connection, sis: ExportSource, *, source: str) -> int:
    """Fetch, normalize and store a new import, and make it current. All or nothing."""
    export = sis.fetch()
    with transaction(conn):
        return write_import(conn, export, source=source)


def write_import(conn: sqlite3.Connection, export: RawExport, *, source: str) -> int:
    """Write `export` as the new current import inside the caller's transaction."""
    students = [(s["id"], s["name"], int(s["grade"]), s["profile"]) for s in export["students"]]
    courses = [
        (
            c["code"],
            c["name"],
            c["department"],
            ",".join(g.strip() for g in c["grades"].split("/")),
            int(c["name"].startswith("AP ")),
        )
        for c in export["courses"]
    ]
    seen: Counter[tuple[str, str]] = Counter()
    requests = []
    for r in export["requests"]:
        seen[(r["student_id"], r["course_code"])] += 1
        n = seen[(r["student_id"], r["course_code"])]
        sis_key = f"{r['student_id']}|{r['course_code']}|{n}"
        requests.append((sis_key, r["student_id"], r["course_code"], REQUEST_TYPES[r["type"]]))

    stamp = now()
    conn.execute("UPDATE sis_import SET is_current = 0 WHERE is_current = 1")
    cursor = conn.execute(
        "INSERT INTO sis_import (state, is_current, source, received_at, finished_at)"
        " VALUES ('completed', 1, ?, ?, ?)",
        (source, stamp, stamp),
    )
    import_id = cursor.lastrowid
    assert import_id is not None
    conn.executemany(
        "INSERT INTO sis_student (import_id, id, name, grade, profile) VALUES (?, ?, ?, ?, ?)",
        [(import_id, *s) for s in students],
    )
    conn.executemany(
        "INSERT INTO sis_course (import_id, code, name, department, grades, is_ap)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        [(import_id, *c) for c in courses],
    )
    conn.executemany(
        "INSERT INTO sis_request (import_id, sis_key, student_id, course_code, type)"
        " VALUES (?, ?, ?, ?, ?)",
        [(import_id, *r) for r in requests],
    )
    return import_id
