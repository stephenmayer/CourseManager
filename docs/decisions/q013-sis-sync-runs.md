---
id: q013-sis-sync-runs
title: SIS syncs are versioned runs that can be rolled back
status: current
decided: 2026-10-27, by Stephen
---

<a id="q013"></a>
# Q13: Should each SIS sync be a recorded run that can be rolled back, with no approval step?

## Context

From the CTO 1:1 ([interview-feedback.md](../requirements/interview-feedback.md) F4), on write-back: "we don't want necessarily them to have to review it, but it would be good for them to be able to recover if something bad happens." An errored run should write nothing. Example: Tuesday's sync applies 40 changes; a bug in the SIS export marks every grade 11 student as grade 12; Wednesday Ms. Lee sees Ethan covered in grade warnings. [Q2](q002-request-ownership.md) already protects counselor-edited requests; this covers everything else a sync changes.

## Options

| Option | Tradeoffs |
|---|---|
| A. Versioned runs, roll back | Every change recorded against a run ID; one-action rollback; failed runs write nothing |
| B. Approve before applying | Safer; the review gate Faisal said they don't want; stalls nightly syncs |
| C. Apply and fix by hand | Simplest; a bad sync means manual cleanup |

## Resolution

**A.** Each SIS sync is a run (job) with an ID and Timely's own job states: submitted, started, completed, errored (F7). A run applies its changes in one transaction; an errored run writes nothing. Every change records the run that made it and the previous value, so a completed run can be rolled back in one action. Rolling back never touches requests a counselor edited (Q2). No approval step before a run applies. Each run reports how many errors it brought in (Q5 checks, F5).

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/interview-feedback.md` (F4)
- [ ] SIS sync design doc: not written yet; it must state this rule
- [x] Decisions index row
