---
id: q011-student-preferences
title: Student elective preferences
status: current
decided: 2026-10-25, by Stephen (both paths); mechanics are Claude's default, open to change
---

<a id="q011"></a>
# Q11: Does a student arrive with elective picks, or choose with the counselor in the meeting?

## Context

The planning-meeting scenario ([planning-meeting.md](../scenarios/planning-meeting.md)) raised whether students state preferences before the meeting (a form, the SIS portal) or pick live with the counselor ([gaps.md](../requirements/gaps.md) G14). Students have no access to this app.

## Resolution

**Both.** Stephen: "I think we will have to handle both situations."

Mechanics (default, reversible): picks made beforehand reach the app the same way any SIS data does, as requests tagged "From SIS" ([Q2](q002-request-ownership.md)). The counselor reviews each in the meeting: keep, swap or remove. Picks made live are added from the catalog and tagged "Added in app". One screen serves both; no separate preferences concept.

Trade-off accepted: the app can't tell a student's own pick from a draft the school entered in the SIS. If that distinction matters (e.g. to show "Jordan asked for this"), a third source value ("Student pick") is a small addition later.

## Impacts (all updated in the same change)

- [x] Scenario: `scenarios/planning-meeting.md` (diagram step 3, table, raised item 3)
- [x] Gaps: `requirements/gaps.md` (G14 answered)
- [x] Decisions index row
