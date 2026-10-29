---
id: q023-full-snapshots-school-year
title: SIS imports are stored as full copies and kept for the school year
status: current
amends: Q18 (sets N and the storage form)
decided: 2026-10-28, by Stephen
---

<a id="q023"></a>
# Q23: How are SIS imports stored, and how long are they kept?

## Context

[Q18](q018-sis-import-versioning.md) made each import an immutable snapshot and left the storage form and "keep the last N" open. Example: a 2,000-student district with about 7 requests per student (assumption) stores about 16,000 rows per nightly import, about 5.8 million a year as full copies, almost all identical night to night. In April, Ms. Lee asks what the SIS said about Nina Torres in February.

## Options

| Option | What happens (same example) | Tradeoffs |
|---|---|---|
| A. Full copies always, kept for the school year, then archived | February is still readable in April | Simplest reads and diffs; storage grows as students × nights, which a database handles |
| B. Full copies now, changed rows (valid-from/valid-to) at scale | Same answers | Less storage; more complex queries and a later migration |
| C. Last 30 days or last N | February is gone by April | Smallest footprint; restore and compare reach back only a month |

## Resolution

**A.** Every import is a full copy, at every scale. Every import is kept for the whole school year and archived to S3 at year-end rollover. An import a request still uses as its base is never pruned. Changed-rows storage stays the known fallback if volume ever demands it; it gives the same answers.

## Impacts (all updated in the same change)

- [x] SIS design: `sis-sync-design.md` (D4, 3.4, section 5, MVP milestones)
- [x] Architecture: `architecture/schema.md` (§2 storage note, §6 retention)
- [x] Decisions index row
