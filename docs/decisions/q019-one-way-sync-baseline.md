---
id: q019-one-way-sync-baseline
title: Assume one-way SIS sync; the app always merges; write-back is an optional per-district capability
status: current
decided: 2026-10-28, by Stephen
---

<a id="q019"></a>
# Q19: Do we design for one-way or two-way SIS sync?

## Context

Stephen (2026-10-28): "This all really depends on whether we have two-way sync with SIS or one way sync. With two-way sync it won't get out of sync so easily. But I have to assume that in a variety of cases there might be only a one-way sync which means the merge has to happen in the application." Open since the requirements walkthrough as [gaps.md](../requirements/gaps.md) G24 (write-back).

## Options

| Option | Tradeoffs |
|---|---|
| A. One-way baseline; app always merges; write-back optional per district | Works with every SIS; write-back reduces conflicts where available; one code path |
| B. Require two-way sync | Fewer conflicts; excludes SIS platforms or districts that don't accept writes |
| C. One-way only, never write back | Simplest; counselor edits never reach the SIS, so conflicts stay frequent and someone re-keys requests |

## Resolution

**A.** The app assumes one-way sync everywhere and always runs the three-way merge (Q18). Two-way sync doesn't remove the merge: the SIS can be edited between a write-back and the next import, write-backs can fail, and some SIS platforms accept writes for some fields only. Where a district's SIS accepts writes to course requests, the app pushes counselor edits back as its own job (Q14), so the next import already agrees and conflicts become rare. Same merge code; fewer flags.

"Does this district's SIS accept writes to course requests, and for which fields?" is a first-order requirement in the SIS design, because it sets how many conflicts counselors will see.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/gaps.md` (G24)
- [x] SIS sync design doc: [sis-sync-design.md](../sis-sync-design.md)
- [x] Decisions index row
