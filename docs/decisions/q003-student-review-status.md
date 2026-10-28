---
id: q003-student-review-status
title: Per-student review status
status: current
decided: 2026-10-24, by Stephen
---

<a id="q003"></a>
# Q3: How does a counselor know which students are done and which still need them?

## Context

The exercise asks for a student list with "key context" but never defines "done" ([gaps.md](../requirements/gaps.md) G12). Every student arrives with SIS requests already filled in, so a list with courses and no warnings looks finished even if nobody reviewed it. Example: Ms. Lee finishes 4 of 10 students Monday and must find the other 6 on Tuesday; Nina (S010) can't be finished until her transcript review is back.

## Options

| Option | Ms. Lee on Tuesday | Tradeoffs |
|---|---|---|
| A. No status | Tracks it in her head | Nothing to build; no work queue |
| B. Computed status | Unreviewed SIS lists show "clean"; Nina can't be parked | No clicks; misleading |
| C. Counselor sets status | Filters to Not started / In progress; Nina is On hold, "transcript pending" | A few clicks; human judgment recorded |
| D. Status plus AP sign-off | As C, plus an approval step | Adds roles not yet scoped |

## Resolution

**C.** Only a person can say "I reviewed this". Statuses: Not started, In progress, On hold (requires a reason), Done. The student list can filter by status. Editing a Done student's requests moves it back to In progress. AP sign-off is a possible next step, not in the MVP.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/requirements.md` (M3)
- [x] Gaps: `requirements/gaps.md` (G12 answered)
- [x] Decisions index row
