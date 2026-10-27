---
id: design-index
title: Approved designs
status: current
owns: "the index of screens Stephen approved (light and dark), the site map, and designed-but-not-built add-ons"
updated: 2026-10-27
---

# Approved designs

Approved by Stephen on 2026-10-27. These boards are the spec for copy, states and numbers (`design-before-build`). Live canvas: https://claude.ai/artifact/Um1wgkPFtw1VkNEsAhENsc (private to Stephen). Archived copies are in [`boards/`](boards/); they open on the canvas, not as plain HTML.

Site map: [site-map.md](site-map.md).

| Board | Screen | State shown | Decisions |
| --- | --- | --- | --- |
| `Main.dc.html` | 1. Student list | Mid-season seed data; filters by status and checks; search | Q3, Q5, Q1 |
| `StudentDetail.dc.html` | 2. Student detail | Jordan in the meeting: out-of-grade warning kept with a reason, elective swapped in app | Q1, Q2, Q3, Q11 |
| `StudentErrors.dc.html` | 2b. Student detail | Aisha: two SIS data errors, Done locked | Q5 |
| `Courses.dc.html` | 3. Courses | Counts by department, Not-in-catalog row, course dialog open (SS402) | Q12 |
| `StudentCourse.dc.html` | 2c. Course dialog from a student page | MTH101 opened from Jordan's page | Q12 |
| `MainDark.dc.html`, `StudentDetailDark.dc.html` | Dark mode | Same screens, dark theme | |

Design notes (choices made during review, 2026-10-27):

- Course detail is a dialog over the page, opened from Courses or from any course code on a student page.
- "Add from catalog" is a table; grade checkboxes 9-12 with the student's grade checked by default.
- Student list filters: status and checks (has errors / has warnings / all clear), combined.
- No "caseload": one shared list in the prototype (gaps G11).
- Light/dark toggle in the header; defaults to the system setting.
- Check copy is plain language (interview feedback F6).
