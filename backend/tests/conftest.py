from collections.abc import Iterator
from sqlite3 import Connection

import pytest
from fastapi.testclient import TestClient

from app.db import connect
from app.main import create_app
from app.seed import reset
from app.sis.export import SeedFileSource


@pytest.fixture
def conn() -> Iterator[Connection]:
    """A fresh in-memory database holding the seed as SIS import #1."""
    connection = connect(":memory:")
    reset(connection, SeedFileSource())
    yield connection
    connection.close()


@pytest.fixture
def client(conn: Connection) -> Iterator[TestClient]:
    with TestClient(create_app(conn)) as test_client:
        yield test_client
