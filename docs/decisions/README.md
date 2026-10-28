---
id: decisions-index
title: Decisions log
status: current
owns: "the index of numbered decisions (Qn) and open questions"
updated: 2026-10-24
---

# Decisions log

One file per decision (`q0NN-<slug>.md`, template in `.claude/process-kit/templates/decision.md.template`). Numbers are never reused. Open questions live in [`open/`](open/) until Stephen answers.

| Q | Decision | Status | Decided |
| --- | --- | --- | --- |
| [Q1](q001-out-of-grade-courses.md) | Out-of-grade courses warn; counselor keeps them with a reason | current | 2026-10-24, Stephen |
| [Q2](q002-request-ownership.md) | Edited requests are kept; SIS changes to them are flagged, never overwritten | current | 2026-10-24, Stephen |
| [Q3](q003-student-review-status.md) | Counselor sets per-student status (Not started, In progress, On hold with reason, Done); edits reopen Done | current | 2026-10-24, Stephen |
| [Q4](q004-priority-core-check.md) | Priority is a counselor label plus one warning: missing a priority course in a core subject | current | 2026-10-24, Stephen |
| [Q5](q005-bad-sis-request-data.md) | Bad SIS request data loads as-is, shows as errors, and blocks Done until fixed | current | 2026-10-24, Stephen |
| [Q6](q006-timebox-and-mvp-scope.md) | 2h prototype + 1h SIS design, AI-accelerated; MVP is M1-M4, M6 if time | current | 2026-10-24, Stephen |
| [Q7](q007-stack.md) | FastAPI + React/TS; DuckDB only for SIS file diffs and the tally | current | 2026-10-25, Stephen |
| [Q8](q008-prototype-storage.md) | Counselor edits stored in a SQLite file; reset re-seeds; tests use in-memory SQLite | current | 2026-10-25, Stephen |
| [Q9](q009-sis-sync-demo.md) | SIS sync demo only if time: counselor flow first, then sync demo, then tally | current | 2026-10-25, Stephen |
| [Q10](q010-sis-design-format.md) | SIS design is Markdown in the repo to start; PDF later if wanted | current | 2026-10-25, Stephen |
| [Q11](q011-student-preferences.md) | Both: students may arrive with picks (via the SIS) or choose live; one screen | current | 2026-10-25, Stephen |
| [Q12](q012-course-view.md) | Courses screen: request counts per course, Not-in-catalog row, fix requests from the course side; catalog stays read-only | current | 2026-10-26, Stephen |
| [Q13](q013-sis-sync-runs.md) | SIS syncs are versioned runs (Timely job states); failed runs write nothing; roll back in one action; no approval gate | current | 2026-10-27, Stephen |
| [Q14](q014-sis-sync-on-queue.md) | SIS sync runs as jobs on RabbitMQ (Timely's queue) with a jobs view to monitor background work; prototype uses an in-process queue behind an interface | current | 2026-10-27, Stephen |
| [Q15](q015-history-and-grad-rules.md) | Student history (transcript feed) and graduation rules are designed as seams, not built; Q4 core check holds the place | current | 2026-10-27, Stephen |
| [Q16](q016-alternate-requests.md) | Alternate requests designed (alternate_for + rank on electives), not built; ready to add live in the follow-up | current | 2026-10-27, Stephen |
| [Q17](q017-provisional-students.md) | Students missing from the SIS get a provisional record matched on sync with counselor confirmation; designed as an add-on, not built | current | 2026-10-27, Stephen |
| [Q18](q018-sis-import-versioning.md) | SIS imports are versioned snapshots; requests keep their SIS base and reconcile three ways; schema now, compare logic if time | current | 2026-10-28, Stephen |
| [Q19](q019-one-way-sync-baseline.md) | Assume one-way SIS sync; the app always merges (Q18); write-back is an optional per-district job that reduces conflicts | current | 2026-10-28, Stephen |
| [Q20](q020-powerschool-first.md) | First SIS target is PowerSchool: OneRoster for students and courses, a PowerQuery for requests; plus a CSV file connection; both tested against a PowerSchool mock (#34, #35) | current | 2026-10-28, Stephen |
