---
id: q006-timebox-and-mvp-scope
title: Timebox and MVP scope
status: current
decided: 2026-10-24, by Stephen
---

<a id="q006"></a>
# Q6: How much time do we spend, and what is in the MVP?

## Context

The exercise suggests about 3 hours: roughly 2 on the prototype and 1 on the SIS design extension. Candidate features are M1-M10 in [requirements.md](../requirements/requirements.md#6-mvp-candidates-beyond-r1-r4-to-brainstorm).

## Resolution

**Timebox:** 2 hours on the prototype, 1 hour on the SIS design, as the exercise says. AI does the heavy lifting, so we can deliver more than a hand-built version would in that time. The README says so, and says what we would do with more time.

**MVP scope (as proposed, accepted by Stephen when moving to architecture):**

- In: M1 data-error checks ([Q5](q005-bad-sis-request-data.md)), M2 judgment warnings with a reason ([Q1](q001-out-of-grade-courses.md), [Q4](q004-priority-core-check.md)), M3 review status ([Q3](q003-student-review-status.md)), M4 request source ([Q2](q002-request-ownership.md)). M5 notes fold into the M2 reason.
- If time allows: M6 course demand tally.
- Out, with one sentence each in the README: M7 audit history, M8 prerequisites, M9 schedule conflicts, M10 auth and roles. AP sign-off is deferred (Q3). All four complex students are handled through warnings and errors.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/requirements.md` (sections 6 and 8)
- [x] Plan: `plan/README.md`
- [x] Decisions index row
