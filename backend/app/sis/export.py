"""Layer 1, the Source: hands over the SIS export in its raw shape.

The seed file stands in for the SIS today. A real connector (or a per-vendor mapper)
implements `ExportSource` and returns the same shape; nothing downstream changes.
"""

import json
from pathlib import Path
from typing import Literal, Protocol, TypedDict, cast

SEED_FILE = Path(__file__).resolve().parents[2] / "seed" / "sis_export.json"


class RawStudent(TypedDict):
    id: str
    name: str
    grade: int
    profile: str


class RawCourse(TypedDict):
    code: str
    name: str
    department: str
    grades: str  # "9/10"


class RawRequest(TypedDict):
    student_id: str
    course_code: str
    type: Literal["P", "E"]


class RawExport(TypedDict):
    exported_at: str
    students: list[RawStudent]
    courses: list[RawCourse]
    requests: list[RawRequest]


class ExportSource(Protocol):
    def fetch(self) -> RawExport: ...


class SeedFileSource:
    """The exercise appendix as a JSON export, loaded as-is with its errors (Q5)."""

    def __init__(self, path: Path = SEED_FILE) -> None:
        self.path = path

    def fetch(self) -> RawExport:
        return cast(RawExport, json.loads(self.path.read_text(encoding="utf-8")))
