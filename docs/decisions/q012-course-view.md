---
id: q012-course-view
title: Course view for fixing requests
status: current
amends: Q6 (M6 moves into the core build), Q9 (build order)
decided: 2026-10-26, by Stephen
---

<a id="q012"></a>
# Q12: What should a course list screen let a counselor correct?

## Context

Looking at the [application flow](../architecture/app-flow.md), Stephen noted the only way in was student by student: "there should be a way to see the list of courses and make corrections there if something is off." The catalog itself is SIS-owned and read-only (exercise, SIS section), so "corrections" could mean fixing requests from the course side, or editing the catalog.

## Options

| Option | Tradeoffs |
|---|---|
| A. Course view, fix requests | Course-side fixing; catalog stays read-only; finds bad codes in one place |
| B. A + "report a catalog problem" note | Shows the SIS boundary; a feature nobody acts on in the prototype |
| C. Editable catalog | Breaks the read-only rule; the next sync overwrites edits |
| D. Keep the read-only tally, if time | No change |

## Resolution

**A.** Screen 3, **Courses**: every catalog course with its request count (priority and elective), grouped by department, plus a **"Not in catalog"** row collecting requests whose code doesn't exist (Aisha's SS303). Selecting a course lists the students requesting it, with type and any check on that request; from there the counselor can remove a request, switch P/E, or open the student. The catalog is never edited.

This replaces the course tally (M6) and moves it into the core build, ahead of the SIS sync demo, which stays "if time" ([Q9](q009-sis-sync-demo.md)). Estimated extra cost: 20-30 minutes. All edits go through the same backend path as the student screen, so checks and status rules apply identically (e.g. removing a request from a Done student reopens it, [Q3](q003-student-review-status.md)).

## Impacts (all updated in the same change)

- [x] Architecture: `architecture/overview.md` (screens), `architecture/app-flow.md` (diagram and image)
- [x] Requirements: `requirements/requirements.md` (M6, question 3)
- [x] Decisions index row
