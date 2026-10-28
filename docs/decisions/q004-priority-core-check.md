---
id: q004-priority-core-check
title: Priority requests without graduation rules
status: current
decided: 2026-10-24, by Stephen
---

<a id="q004"></a>
# Q4: With no graduation rules given, should priority be just a label or should the app check it?

## Context

The exercise defines priority as "a required course for graduation or one they failed and must retake" but gives no graduation rules ([gaps.md](../requirements/gaps.md) C2, G2). Example: Ms. Lee accidentally removes Marcus's (S005, grade 11) Physics while swapping electives. Every seeded student today has a priority course in each core subject (grade 12: English), so a core check fires only when one is removed.

## Options

| Option | Marcus loses Physics | Tradeoffs |
|---|---|---|
| A. Label only | Unnoticed | Nothing to build |
| B. Label + simple core check | Warning: no priority Science | One rule; an assumption we state |
| C. Configurable grad rules | Caught by credit rules | Needs transcripts and credits we lack |
| D. App infers priority | Core courses forced to priority | Overrides counselor judgment |

## Resolution

**B.** Priority stays a label the counselor sets. One warning rule, following [Q1](q001-out-of-grade-courses.md)'s pattern: grades 9-11 should have a priority course in Math, English, Social Studies and Science; grade 12 in English. It is a stated assumption, kept as data a school would configure, and marks where real graduation rules would plug in.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/requirements.md` (A3)
- [x] Gaps: `requirements/gaps.md` (G2 answered)
- [x] Decisions index row
