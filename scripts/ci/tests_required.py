"""CI gate: a PR that changes app code must add or change a test (CLAUDE.md, TDD).

Usage: tests_required.py <file listing changed paths>   (PR body in $PR_BODY)
"""

import os
import re
import sys
from pathlib import Path

CODE_ROOTS = ("backend/app/", "frontend/src/")
TEST_FILE = re.compile(r"^(backend/tests/(.+/)?test_[^/]+\.py|frontend/src/.+\.test\.tsx?)$")
OPT_OUT = re.compile(r"no new tests", re.IGNORECASE)


def check(changed: list[str], body: str) -> tuple[bool, str]:
    tests = [path for path in changed if TEST_FILE.match(path)]
    code = [path for path in changed if path.startswith(CODE_ROOTS) and path not in tests]
    if not code:
        return True, "No app code changed."
    if tests:
        return True, f"App code changed with {len(tests)} test file(s)."
    if OPT_OUT.search(body):
        return True, "App code changed without tests; PR body says 'no new tests'."
    listing = "\n".join(f"  {path}" for path in code)
    return False, (
        "App code changed but no test was added or changed (TDD, CLAUDE.md):\n"
        f"{listing}\n"
        "Add a test, or say 'no new tests' and why in the PR body."
    )


def main() -> int:
    changed = Path(sys.argv[1]).read_text().split()
    passed, message = check(changed, os.environ.get("PR_BODY", ""))
    print(message)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
