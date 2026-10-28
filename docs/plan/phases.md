---
id: phases
title: Implementation plan, Phase 1 and Phase 2
status: draft
owns: "the build parts for each phase, their order, dependencies and acceptance criteria"
updated: 2026-10-28
---

# Implementation plan

Requested by Stephen on 2026-10-28: Phase 1 is everything the take-home asks for; Phase 2 is the extras we designed. Each part below is one GitHub issue (labels `phase-1`, `phase-2`). Nothing is built until Stephen gives the explicit go (CLAUDE.md, step 4).

- Phase 1 seams review: [reviews/phase-1-seams.md](reviews/phase-1-seams.md) (applied). Phase 2 gets its own seams review before any Phase 2 part starts.
- Designs (spec): [design/README.md](../design/README.md). Schema: [architecture/schema.md](../architecture/schema.md). Rules: [architecture/overview.md](../architecture/overview.md) §3.
- Budget (Q6): about 2 hours for the prototype and 1 hour for the SIS design, AI-accelerated. Phase 1 is ordered so the counselor flow is complete first (Q9).

## Phase 1: the take-home (R1-R9, M1-M4, M6)

| # | Part | Covers | Depends on |
| --- | --- | --- | --- |
| 1.1 ([#1](https://github.com/stephenmayer/CourseManager/issues/1)) | Project setup: FastAPI + React/TS, one `verify` command, CI | Q7, kit merge gate | |
| 1.2 ([#2](https://github.com/stephenmayer/CourseManager/issues/2)) | Data layer: SQLite schema, seed as SIS import #1, reset, `SisSource` and `RequestStore` | R6, Q8, Q18, schema.md | 1.1 |
| 1.3 ([#3](https://github.com/stephenmayer/CourseManager/issues/3)) | Rules: five checks as pure functions | M1, M2, Q1, Q4, Q5 | 1.2 (types only) |
| 1.4 ([#4](https://github.com/stephenmayer/CourseManager/issues/4)) | API: students, student detail, request edits, review status, catalog, courses | R1-R3, M3, M4, Q3, Q12 | 1.2, 1.3 |
| 1.5 ([#5](https://github.com/stephenmayer/CourseManager/issues/5)) | App shell: header, nav, SIS date, light/dark toggle, API client | Designs, Q7 | 1.1 |
| 1.6 ([#6](https://github.com/stephenmayer/CourseManager/issues/6)) | Screen 1: Student list with search, status and checks filters | R1, M3 | 1.4, 1.5 |
| 1.7 ([#7](https://github.com/stephenmayer/CourseManager/issues/7)) | Screen 2: Student detail (requests, checks with reasons, status, add from catalog) | R2-R4, M1-M4, Q11 | 1.4, 1.5 |
| 1.8 ([#8](https://github.com/stephenmayer/CourseManager/issues/8)) | Screen 3: Courses and the course dialog (also from the student page) | M6, Q12 | 1.4, 1.5, 1.7 |
| 1.9 ([#9](https://github.com/stephenmayer/CourseManager/issues/9)) | README: run, key decisions, testing strategy, pilot vs scale, how AI was used, known gaps | Deliverables, R8, F1-F3 | 1.1-1.8 |
| 1.10 ([#10](https://github.com/stephenmayer/CourseManager/issues/10)) | SIS sync design doc (Markdown) | R9, Q2, Q10, Q13, Q14, Q18, Q19 | none (can run in parallel) |
| 1.11 ([#11](https://github.com/stephenmayer/CourseManager/issues/11)) | 5-minute video outline for the SIS design (Stephen records) | Deliverables | 1.10 |

## Phase 2: extras (designed add-ons)

Ordered by value to the follow-up conversation. Items 2.1-2.3 make the SIS story demonstrable; the rest are product add-ons.

| # | Part | Covers | Depends on |
| --- | --- | --- | --- |
| 2.1 ([#12](https://github.com/stephenmayer/CourseManager/issues/12)) | Sync demo: load import #2, three-way reconcile, rollback | Q9, Q13, Q18, Q19 | Phase 1 |
| 2.2 ([#13](https://github.com/stephenmayer/CourseManager/issues/13)) | SIS changes to review in the request editor (Add-on F) | Q2, Q18 | 2.1 |
| 2.3 ([#14](https://github.com/stephenmayer/CourseManager/issues/14)) | Sync jobs view with an in-process queue behind an interface (Add-on A) | Q14 | 2.1 |
| 2.4 ([#15](https://github.com/stephenmayer/CourseManager/issues/15)) | Alternates for electives (Add-on C) | Q16 | Phase 1 |
| 2.5 ([#16](https://github.com/stephenmayer/CourseManager/issues/16)) | "Did you mean?" for unknown and duplicate codes (Add-on D) | Q5 option D | Phase 1 |
| 2.6 ([#17](https://github.com/stephenmayer/CourseManager/issues/17)) | Students not in the SIS yet: provisional students and match on sync (Add-on E) | Q17 | 2.1 |
| 2.7 ([#18](https://github.com/stephenmayer/CourseManager/issues/18)) | Graduation progress and rules setup (Add-on B) | Q15 | Phase 1; needs sample data Stephen approves |
| 2.8 ([#34](https://github.com/stephenmayer/CourseManager/issues/34)) | PowerSchool mock and the OneRoster + PowerQuery adapter | Q20 | Phase 1; feeds 2.1 |
| 2.9 ([#35](https://github.com/stephenmayer/CourseManager/issues/35)) | CSV file adapter: a second SIS connection behind `ExportSource` | Q20 | 2.8 |

Open questions that Phase 2 parts depend on (defaults in brackets): does an unresolved SIS change block Done [yes]; does a quiet SIS update reopen a Done student [only if it adds a check or flag]; group requests ("any one Arts & Tech elective") [follow-up question, not built].

Not planned: write-back to the SIS (Q19 designs it as an optional per-district job; described in 1.10), auth and roles (M10), audit history beyond soft delete (M7), prerequisites and schedule conflicts (M8, M9).
