---
id: q025-abnormal-runs-apply-and-alert
title: A sync with abnormally many changes applies and alerts; it does not pause
status: current
decided: 2026-10-28, by Stephen
---

<a id="q025"></a>
# Q25: When a sync changes far more than usual, should it pause or apply?

## Context

A typical night changes a handful of records. One night the export marks every grade-11 student as grade 12: 40 times the district's normal change count. [Q13](q013-sis-sync-runs.md) chose no approval step (Faisal: recover, don't review; F4).

## Options

| Option | What happens (same example) | Tradeoffs |
|---|---|---|
| A. Apply and alert | Run applies; support alerted; restore if wrong (Q24) | Keeps Q13; counselors may see bad data until restored |
| B. Pause above a threshold | Run waits for a person; counselors keep yesterday's data | An approval gate on bad nights; thresholds need per-district tuning |
| C. Pause only for mass removals | Changes apply; mass removals wait | Middle ground; still a gate |

## Resolution

**A.** The run applies as usual; Datadog alerts support and the jobs view highlights the run; a person restores the previous import if it is wrong. Revisit after the pilot.

## Impacts (all updated in the same change)

- [x] SIS design: `sis-sync-design.md` (3.9, section 5)
- [x] Decisions index row
