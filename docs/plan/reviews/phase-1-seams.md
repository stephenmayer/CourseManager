# Phase 1 (take-home build): plan and seams review

Status: designs approved by Stephen on 2026-10-27 ([design/README.md](../../design/README.md)); schema reviewed with Stephen on 2026-10-28; nothing built.

## What changes

The whole prototype, built from scratch: parts 1.1-1.11 in [phases.md](../phases.md).

## Why it is needed (verified)

The repo has no application code yet (greenfield). Every requirement traces to `docs/requirements/requirements.md` (R1-R9, M1-M4, M6) or a decision Q1-Q19. There are no existing systems to break, so this review covers the seams **between the parts** and between the build and the approved docs.

## Summary

- 16 seams: 0 blockers, 8 must-resolve (each owned by a part), 7 minor, 1 resolved by Stephen. 12 edge cases. 0 open owner questions.
- Top 3 risks:
  1. **Duplicates and removal by the wrong key.** Aisha has SS402 twice. If the API removes "SS402 for S008" instead of a request ID, removing the duplicate elective also removes her priority. Fix: every edit addresses a request by `id` (S3).
  2. **Removing a SIS request must not come back.** If remove deletes the row, the Phase 2 sync re-adds it. Fix: soft delete from day one (S4).
  3. **Done drifting out of sync with edits.** Editing a Done student must reopen it on every write path, including the Courses dialog. Fix: one service function owns the reopen rule; both screens call the same endpoints (S6).

## Seams review

| # | Seam | Finding | Resolution | Severity, part |
|---|---|---|---|---|
| S1 | `SisSource` vs Q18 snapshots | The two-port story (overview §1) said "seed in code". With Q18, SIS data lives in `sis_*` tables per import. | `SisSource` keeps its interface (students, catalog, SIS requests) and reads the **current import**; a seed loader writes import #1. The swap story becomes: replace the loader with an SIS connector. Update overview §1. | must-resolve, 1.2 |
| S2 | `course_code` has no foreign key (Q5) | Joins to the catalog can drop SS303 silently if written as an inner join. | Join in code with "not found" handled; unknown codes surface as the unknown-course error and in the Courses "Not in catalog" row. Test with S008. | must-resolve, 1.3, 1.4 |
| S3 | Duplicate requests | S008 has SS402 as P and E. Any edit keyed by (student, course) hits both. | All write endpoints take a request `id`. The seed's `sis_key` counter (`S008|SS402|1`, `|2`) keeps them distinct. Test: removing the elective copy leaves the priority. | must-resolve, 1.2, 1.4 |
| S4 | Remove vs future sync (Q2, Q18) | Hard delete would let the Phase 2 import re-add a removed SIS request. | Soft delete (`removed_at`); every read filters active rows; counts exclude removed. Test: removed request absent from detail, list counts and Courses. | must-resolve, 1.2, 1.4 |
| S5 | `edited_in_app` | Must be set on switch type, reason change and remove, but not on add (add creates `source = app`). Missing one breaks Q2 later. | Set in the store's update and remove methods, not in routes. Tests per action. | must-resolve, 1.4 |
| S6 | Review status rules (Q3) | Done refused with errors; any request edit on a Done student reopens it; On hold needs a reason. Two screens (detail, Courses dialog) edit requests. | One service function `apply_request_change` runs the edit, the reopen rule and returns the full student (overview §7). Both screens call the same endpoints. Tests: reopen from the dialog path too. | must-resolve, 1.4 |
| S7 | Warnings with reasons (Q1) | Reason lives on the request. Switching P/E keeps it; removing and re-adding the course starts without one. | Documented behaviour; test both. | minor, 1.4 |
| S8 | Rule overlap | An unknown course has no grades, so out-of-grade must not also fire on SS303. A duplicate fires once per pair, not twice. | Out-of-grade skips unknown codes; duplicate reports on the second occurrence with a link to the first. Tests with S008. | must-resolve, 1.3 |
| S9 | Core-subject check (Q4) | Switching a core priority to elective (e.g. Jordan's ENG201) must raise the warning; the seed raises none. | Test the switch case. AP load counts priority and elective (S009's five APs include an elective). | minor, 1.3 |
| S10 | Catalog grade checkboxes | Courses list grades as `9/10`. A course shows if **any** checked grade is in its list. | Parse to a list in the loader; filter in the UI. Test with AT101 (9/10) under Grade 10 only. | minor, 1.2, 1.7 |
| S11 | Student list "From profile" column | The approved design shows short notes ("Retaking Algebra I") that the SIS does not provide; the profile is a paragraph. | Stephen (2026-10-28): store the full SIS text untouched; the list shows the first 40 characters with a "more" link that expands in place, up to 255 characters; the student page shows the full text. | resolved, 1.6 |
| S12 | Header "SIS data as of" | Comes from the current import's `received_at`. On a fresh seed that is the load time, not "Oct 27, 6:00 AM". | Use load time; designs used a sample time. | minor, 1.5 |
| S13 | Reset re-seeds (Q8) | Deleting the SQLite file while the app holds a connection fails on some platforms. | Reset closes the connection, drops and recreates tables, reloads import #1, in one call. Test: edits gone after reset. | minor, 1.2 |
| S14 | Theme toggle | Defaults to the system setting; remembered per browser. Storage can throw in private windows. | Wrap storage in try/catch; fall back to system setting. | minor, 1.5 |
| S15 | Docs ownership | Schema, rules, screens and decisions each have one owner doc. | Parts that change behaviour update `schema.md`, `overview.md` §3-4 or `design/README.md` in the same PR. | minor, all |
| S16 | Courses screen counts vs student list counts | Both count active requests; if one path forgets `removed_at` they disagree. | One store query for counts used by both; a test asserts list totals equal Courses totals. | must-resolve, 1.4 |

## Edge cases

| # | Case | Behaviour | Owning part |
|---|---|---|---|
| E1 | Mark Done with an error (Aisha) | Refused with "Fix 2 errors to mark Done" | 1.4, 1.7 |
| E2 | Mark Done with only warnings (Jordan) | Allowed | 1.4 |
| E3 | Edit a Done student (Alex) | Status becomes In progress | 1.4 |
| E4 | Put on hold without a reason | Refused | 1.4, 1.7 |
| E5 | Add a course already on the list | Blocked in the UI ("On list"); the API also rejects it to avoid creating a new duplicate | 1.4, 1.7 |
| E6 | Add an out-of-grade course | Allowed; warning appears, asks for a reason | 1.3, 1.7 |
| E7 | Remove the last core priority in a subject | Core-subject warning appears | 1.3 |
| E8 | Student with no requests | Detail shows an empty state; core warnings for grades 9-11 | 1.7 |
| E9 | Unknown student or request id | 404 with a plain message | 1.4 |
| E10 | Remove SS303 from the Courses "Not in catalog" row | Same endpoint as the student page; Aisha's error count drops | 1.8 |
| E11 | Search with no match | Empty state "No students match" | 1.6 |
| E12 | Status and checks filters both set | Combined (AND) | 1.6 |

## Open questions for the owner (each with a default)

None open. Question 1 (student list profile text) answered by Stephen on 2026-10-28; see S11.

## Build plan (dependency order)

See [phases.md](../phases.md), Phase 1. Each part's issue lists the seams (S#) and edge cases (E#) it must handle and the tests that prove them. Part 1.1 defines the single `verify` command every later part runs.

## Documentation

- `architecture/overview.md` §1: SisSource reads the current import (S1).
- `architecture/schema.md`: any column change in 1.2.
- `CLAUDE.md` Commands section: filled in by 1.1.
- `design/README.md`: note S11's outcome (40 characters, "more" expands to 255).

## Seams review applied

2026-10-28: resolutions folded into the Phase 1 parts and issues. Owner question 1 answered by Stephen the same day (S11).
