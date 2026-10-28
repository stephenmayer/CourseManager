---
id: q024-restore-to-kept-import
title: Rollback restores to any kept import, undoing later runs newest first
status: current
amends: Q13 (how far back a rollback reaches)
decided: 2026-10-28, by Stephen
---

<a id="q024"></a>
# Q24: Which sync runs can be rolled back?

## Context

[Q13](q013-sis-sync-runs.md) made runs reversible in one action. Example: import #41 marks every grade-11 student as grade 12 (Ethan Park, Sofia Mendez); #42 is good and also fixes Aisha's SS303. Stephen noted that a good later run already overwrites a bad one: students and courses are full snapshots and untouched requests follow the three-way merge. Rollback is for when the SIS is still wrong, or a planning meeting can't wait.

## Options

| Option | What happens (same example) | Tradeoffs |
|---|---|---|
| A. Restore to any kept import, newest first | Restoring to #40 undoes #42 then #41 | Always consistent; good changes return on the next sync |
| B. Latest run only | Only #42 can be undone directly | Simplest; an older bad run needs a re-import |
| C. Any run independently | #41 undone, #42 kept | Needs re-merging history; hardest to build and test |

## Resolution

**A.** A restore to import N undoes every run after N, newest first, restoring request values from `sync_change` and skipping requests a counselor edited since (Q2). Considered for later, not decided: after restoring to #40, re-apply a later kept import (#43) as a new import that copies it, using the normal merge with base #40.

## Impacts (all updated in the same change)

- [x] SIS design: `sis-sync-design.md` (3.7, MVP milestones)
- [x] Decisions index row
