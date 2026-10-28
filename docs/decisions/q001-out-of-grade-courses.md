---
id: q001-out-of-grade-courses
title: Courses outside their catalog grade
status: current
decided: 2026-10-24, by Stephen
---

<a id="q001"></a>
# Q1: Should taking a course outside its catalog grade be blocked, warned, or ignored?

## Context

The catalog gives each course a Grade(s) column, but the exercise never says whether it is a limit or a typical grade ([gaps.md](../requirements/gaps.md) G1, C1, C6). The sample data breaks it on purpose: Jordan (S003, grade 10) must retake MTH101 (grade 9); Sofia (S006, grade 11) requests MTH401 and ENG401 (grade 12 only); Priya (S004, grade 10) requests AT301 (grades 11/12).

## Options

| Option | What happens (same example) | Tradeoffs |
|---|---|---|
| A. Block | Jordan's retake cannot be entered without an exception path | Treats valid judgment as an error |
| B. Warn, keep with a reason | Warning shown; counselor keeps it by entering a reason ("retake", "early AP"), shown on the summary | One extra field; reason is the audit trail for the AP |
| C. Warn only | Warning shown, nothing recorded | Simplest; the why is lost |
| D. Ignore | Grade shown, no check | Catches nothing |

## Resolution

**B.** Counselor judgment is the job, so the tool supports it rather than blocking it. The reason doubles as the audit trail an assistant principal reviews. This sets the pattern for judgment rules generally: warn and record a reason, never block. Only true data errors (an unknown course code, for example) are candidates for blocking; that is decided separately.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/requirements.md` (M2, question 2)
- [x] Gaps: `requirements/gaps.md` (G1 answered)
- [x] Decisions index row
