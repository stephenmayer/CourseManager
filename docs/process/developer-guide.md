---
id: developer-guide
title: Developer guide
status: current
owns: "how to set up, run, test and verify the code, and what CI enforces"
updated: 2026-10-28
---

# Developer guide

## Setup

Needs Python 3.12 and [uv](https://docs.astral.sh/uv/), Node 22 with npm, and GNU make. `make install` (run by every other target) syncs `backend/.venv` from `backend/uv.lock` and installs `frontend/node_modules` from `frontend/package-lock.json`.

## Layout

| Path | What |
| --- | --- |
| `backend/app/` | FastAPI app. All routes live under `/api`. |
| `backend/tests/` | pytest suite. |
| `frontend/src/` | React + TypeScript (Vite). Tests sit next to the code as `*.test.ts(x)` (Vitest, Testing Library). |
| `scripts/dev.sh` | Runs the API and the app together (`make dev`). |
| `scripts/ci/` | CI helpers and their tests (`tests_required.py`). |

## Run

`make dev` starts the API on `127.0.0.1:8000` (auto-reload) and the app on `localhost:5173`. Vite proxies `/api` to the API, so the browser only talks to one origin. Check it with `curl localhost:5173/api/health`.

## Data and API

The API keeps its data in `backend/data/coursemanager.sqlite3` (override with `COURSEMANAGER_DB`), seeded from `backend/seed/sis_export.json` on first start. `POST /api/reset` (or deleting the file while the API is stopped) restores the seed. Endpoints (all under `/api`, JSON; every write returns the full updated student; errors are `{"detail": "<plain message>"}` with 404, 409 or 422):

| Method and path | What |
| --- | --- |
| `GET /sis/current-import` | `{id, received_at, source}` of the import the app reads ("SIS data as of") |
| `GET /students` | `{sis_as_of, students: [{id, name, grade, profile, status, priority_count, elective_count, error_count, warning_count}]}` |
| `GET /students/{id}` | Profile, status, hold reason, requests (priority first) and issues |
| `POST /students/{id}/requests` | `{course_code, type?}` add from the catalog (default elective); 409 if already on the list |
| `PATCH /requests/{id}` | `{type?, reason?}`; `reason: null` clears it |
| `DELETE /requests/{id}` | Soft remove |
| `PUT /students/{id}/review` | `{status, hold_reason?}`; Done refused while errors remain; On hold needs a reason |
| `GET /catalog` | The current catalog |
| `GET /courses` | `{courses: [catalog course + priority, elective, total], not_in_catalog: [{code, priority, elective, total}]}` |
| `GET /courses/{code}/requests` | For the course dialog: `[{student_id, student_name, request, issues}]` |
| `POST /reset` | Re-seed |

## Test first

Every issue follows `implement-change`: commit the failing tests (`test(<part>): ...`), then the code, then refactor. Inner loop: run only the tests near the change (`uv run pytest tests/test_x.py`, `npx vitest run src/x.test.tsx`).

## Verify (the merge gate)

`make verify` refuses a dirty tree, runs lint, typecheck and tests for both sides, checks the tree is still clean, and prints `verify: PASSED at commit <sha> (<subject>)`. Paste that line in the PR as the receipt; every push needs a fresh one.

| Step | Backend | Frontend |
| --- | --- | --- |
| Lint | `ruff check`, `ruff format --check` | `eslint .` |
| Typecheck | `mypy` (strict) | `tsc --noEmit` |
| Test | `pytest` (also runs `scripts/ci` tests) | `vitest run` |

## CI

Two workflows run on pull requests to `main`:

- **verify**: `make verify` on a clean checkout (also on pushes to `main`).
- **tests-required**: fails when the PR changes non-test files under `backend/app/` or `frontend/src/` and adds or changes no test file (`backend/tests/**/test_*.py`, `frontend/src/**/*.test.ts(x)`; fixtures such as `conftest.py` alone don't count). A PR body containing `no new tests` (with the reason) passes it. Editing the PR body re-runs only this check.

Both should be marked required in `main`'s branch protection (Settings > Branches), which only the repo owner can do.
