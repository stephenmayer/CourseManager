import pytest

from tests_required import check


@pytest.mark.parametrize(
    ("changed", "body", "ok"),
    [
        (["backend/app/main.py"], "", False),
        (["backend/app/main.py", "backend/tests/test_health.py"], "", True),
        (["frontend/src/App.tsx"], "", False),
        (["frontend/src/App.tsx", "frontend/src/App.test.tsx"], "", True),
        (["frontend/src/api/client.ts", "frontend/src/api/client.test.ts"], "", True),
        (["docs/plan/phases.md", "README.md"], "", True),
        (["backend/app/main.py"], "Refactor only.\n\nno new tests: rename", True),
        (["backend/app/main.py"], "No New Tests", True),
        (["backend/tests/test_health.py"], "", True),
        (["backend/pyproject.toml", "Makefile"], "", True),
        ([], "", True),
    ],
)
def test_check(changed: list[str], body: str, ok: bool) -> None:
    passed, _message = check(changed, body)
    assert passed is ok


def test_failure_message_names_the_code_files() -> None:
    passed, message = check(["backend/app/rules.py", "docs/x.md"], "")
    assert not passed
    assert "backend/app/rules.py" in message
    assert "docs/x.md" not in message
