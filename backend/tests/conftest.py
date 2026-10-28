from collections.abc import Iterator
from sqlite3 import Connection

import pytest

from app.db import connect
from app.seed import reset
from app.sis.export import SeedFileSource


@pytest.fixture
def conn() -> Iterator[Connection]:
    """A fresh in-memory database holding the seed as SIS import #1."""
    connection = connect(":memory:")
    reset(connection, SeedFileSource())
    yield connection
    connection.close()
