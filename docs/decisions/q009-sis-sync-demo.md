---
id: q009-sis-sync-demo
title: SIS sync demo in the prototype
status: current
amends: Q6 (orders the "if time" work)
decided: 2026-10-25, by Stephen
---

<a id="q009"></a>
# Q9: Should the prototype include a clickable SIS sync demo, or keep sync in the design doc?

## Context

[Q2](q002-request-ownership.md) keeps counselor-edited requests and flags SIS differences. A demo: Ms. Lee changes Jordan's AT201 to AT202; "Run SIS sync" loads a second seed file standing in for tomorrow's export (AT201 unchanged, one untouched request changed, one student's grade changed); Jordan shows "SIS has a different value", the untouched request updates, the grade change appears. DuckDB diffs the two files ([Q7](q007-stack.md)). Estimated 30-40 minutes of the 2-hour budget.

## Options

| Option | Tradeoffs |
|---|---|
| A. Design doc only | Focused prototype; Q2's flag never fires |
| B. Sync demo button | Q2 is clickable; costs a third of the prototype time; tally likely drops |
| C. Demo only if time allows | Counselor flow first; demo is the first "if time" item |

## Resolution

**C.** Build order: the counselor flow (R1-R4 and M1-M4) first and complete; then the sync demo if time remains; then the course tally (M6) only after that. The README states whichever way it lands. Data model fields for Q2 (source, edited in app) are built regardless, since the counselor flow sets them.

## Impacts (all updated in the same change)

- [x] Architecture: `architecture/overview.md` (A3)
- [x] Requirements: `requirements/requirements.md` (M6 ordering)
- [x] Decisions index row
