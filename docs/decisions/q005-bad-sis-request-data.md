---
id: q005-bad-sis-request-data
title: Bad request data from the SIS
status: current
decided: 2026-10-24, by Stephen
---

<a id="q005"></a>
# Q5: What should the app do with bad request data from the SIS, like Aisha's?

## Context

Aisha (S008) arrives with SS303 (not in the catalog) and SS402 twice (P and E). Her profile wants Psychology (SS403) and Economics (SS302), so these look like source typos ([gaps.md](../requirements/gaps.md) C5, G6, G27). This also settles whether true data errors block anything, which [Q1](q001-out-of-grade-courses.md) left open.

## Options

| Option | Aisha's list | Tradeoffs |
|---|---|---|
| A. Clean the seed | Fixed by hand before load | Hides the problem; guesses intent |
| B. Drop on import | Silently shrinks; logged | Counselor never sees what was lost |
| C. Load, flag, block Done | Shown as errors; editable; can't be marked Done until fixed | Blocks only the status, never editing |
| D. Flag and suggest a fix | As C, plus "Did you mean SS403?" | More to build; still a guess |

## Resolution

**C.** Requests load exactly as the SIS sent them. Data errors (a course code not in the catalog; the same course requested twice) show as errors on the student. The counselor can edit freely, but the student can't be set to Done ([Q3](q003-student-review-status.md)) while an error remains. This is the line between the two kinds of check: **data errors block Done; judgment calls warn and are kept with a reason** (Q1, [Q4](q004-priority-core-check.md)). Suggested fixes are a later step.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/requirements.md` (M1, question 2)
- [x] Gaps: `requirements/gaps.md` (G6, G27 answered)
- [x] Decisions index row
