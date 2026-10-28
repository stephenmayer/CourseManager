---
id: q008-prototype-storage
title: Where counselor edits are stored in the prototype
status: current
decided: 2026-10-25, by Stephen
---

<a id="q008"></a>
# Q8: Where should counselor edits be stored in the prototype?

## Context

Students and the catalog always load fresh from the seed; this covers only what counselors change (requests, reasons, review status). Example: Ms. Lee gives Jordan's retake a reason and marks Mei Done, then the server restarts. Timely runs MongoDB in production. Every option sits behind the same `RequestStore` interface.

## Options

| Option | After a restart | Tradeoffs |
|---|---|---|
| A. In memory, with reset | Work is gone | Zero setup; repeatable demos |
| B. SQLite file | Work is still there | Built into Python; a small schema; reset deletes the file |
| C. MongoDB | Work is still there | Matches production; reviewers must run Mongo |

## Resolution

**B. SQLite file.** Edits survive a restart with nothing to install. A reset (button or command) re-seeds by deleting the file. Tests use a fresh in-memory SQLite database each, so they stay fast and isolated. Implementation detail decided as obvious: Python's built-in `sqlite3` with plain SQL behind the `RequestStore` interface, no ORM, so Mongo can replace that one class later.

## Impacts (all updated in the same change)

- [x] Architecture: `architecture/overview.md` (diagram, testing, A2)
- [x] Requirements: `requirements/requirements.md` (assumption A4)
- [x] Decisions index row
