---
id: q007-stack
title: Prototype stack, and where DuckDB fits
status: current
decided: 2026-10-25, by Stephen
---

<a id="q007"></a>
# Q7: Which stack do we build the prototype on?

## Context

Timely's stack is Python, TypeScript/React and MongoDB. Two Timely engineers will extend the code live in the follow-up. Stephen asked which option works with DuckDB, which Timely may use.

## Options

| Option | Tradeoffs |
|---|---|
| A. FastAPI + React/TS (Vite) | Matches Timely; two processes behind one dev script |
| B. All TypeScript (Node + React) | One language; doesn't match Timely's Python backend |
| C. Python server-rendered | Fewest parts; not how Timely builds UI |

## Resolution

**A. FastAPI + React/TypeScript.** Timely's engineers can read and extend it without ramp-up.

**DuckDB:** all three options could use it, but Python has its most mature client (in-process, reads CSV/Parquet/pandas). It is an analytical engine, so it is **not** the store for counselor edits. It earns a place in two spots only: the SIS sync design, as the engine that diffs a nightly SIS export file against the last import (how [Q2](q002-request-ownership.md)'s "SIS has a different value" flag is computed), and the course demand tally (M6). In the prototype it is used only if we build the sync demo or the tally.

## Impacts (all updated in the same change)

- [x] Architecture: `architecture/overview.md` (A1)
- [x] CLAUDE.md stack line
- [x] Decisions index row
