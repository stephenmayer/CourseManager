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
