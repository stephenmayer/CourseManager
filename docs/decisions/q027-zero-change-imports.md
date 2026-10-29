---
id: q027-zero-change-imports
title: A sync that finds nothing new still records an import with zero changes
status: current
decided: 2026-10-28, by Stephen
---

<a id="q027"></a>
# Q27: Should a sync that finds nothing new still record an import?

## Context

On a quiet Saturday, PowerSchool returns exactly Friday's data. The app header shows "SIS data as of" the current import's time ([schema.md](../architecture/schema.md)).

## Options

| Option | What happens (same example) | Tradeoffs |
|---|---|---|
| A. Record it, zero changes | Import #45, header "as of Sat 2:00am", green run with 0 changes | Every successful sync is visible; one extra snapshot per quiet night |
| B. Skip, log the run only | Header stays "as of Fri" | No duplicates; a quiet night looks like a missed one |
| C. Record without a snapshot | New import row pointing at Friday's snapshot | Fresh header, no duplicates; more complex reads |

## Resolution

**A.** "Did last night's sync run?" always has a visible yes. The extra snapshot is archived at year-end like the rest ([Q23](q023-full-snapshots-school-year.md)).

## Impacts (all updated in the same change)

- [x] SIS design: `sis-sync-design.md` (3.4)
- [x] Decisions index row
