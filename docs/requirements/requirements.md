---
id: requirements
title: Course request management requirements
status: draft
owns: "the problem, users, stated requirements, assumptions, MVP scope candidates and open questions"
updated: 2026-10-24
---

# Course request management: requirements

Draft for the step 2 walkthrough with Stephen. Nothing here is decided until it moves into `docs/decisions/`. Source: the Timely exercise PDF (2026-10-24).

## 1. The problem, as I understand it

Each spring, a counselor or assistant principal builds next year's course request list for every student on their caseload. Each request maps a student to a catalog course and is either **priority** (must take: graduation requirement, retake) or **elective** (interest or recommendation). Those requests feed the master schedule, so a wrong or missing request turns into a scheduling problem later. Today the inputs (students, catalog, sometimes draft requests) come from the school's SIS, and the counselor's job is to review and correct them, one student at a time, using judgment.

**The job to be done:** "Get every student on my caseload to a correct, reviewed request list before the scheduling deadline, and know which students still need me."

## 2. Users

| User | What they do | What "done" looks like |
| --- | --- | --- |
| Counselor (primary) | Works through a caseload of students, builds and fixes each list | Every student reviewed; tricky cases handled with a reason |
| Assistant principal | Same edits, plus oversight of the cohort | Can see who is unfinished or unusual across counselors |
| Out of scope | Students, parents | No access |

Open: is the AP a separate role with different permissions, or the same screen with a cohort view? (Q4 below)

## 3. Stated requirements (from the exercise)

| # | Requirement | Notes / what it implies |
| --- | --- | --- |
| R1 | List students for the upcoming year, showing grade and key context | "Key context" is ours to define: profile flags, request count, status |
| R2 | Select a student; view and edit their requests for next year | |
| R3 | Assign and remove catalog courses, each marked priority or elective | Changing P/E on an existing request is implied |
| R4 | Clear, organized summary of each student's request list | Grouping (P/E, department) is ours to choose |
| R5 | Other features critical for a staff MVP | Our call; see section 6 |
| R6 | Backend or data layer serving students and courses, swappable for a real API | Seed in code is allowed |
| R7 | Runs on localhost, staff only | No auth required |
| R8 | Be ready to discuss: data-layer swap, testing strategy, pilot speed vs scale | Tests not required, strategy is |
| R9 | SIS sync design: requirements, key decisions with options and a recommendation, 1-2 flow/architecture approaches | Students and catalog read-only from SIS; requests may come from SIS and are edited in the app |

## 4. Deliverables and timebox

Working prototype on localhost; source on GitHub; short README (how to run, key architecture decisions); SIS sync design artifact; 5-minute video on the SIS design. Suggested budget: about 3 hours (2 prototype, 1 design). The 60-minute follow-up will add new input and expect us to iterate live, so the code must be easy to extend in conversation.

## 5. What the sample data tells us (checked against Appendix A)

The roster is clean for six students; four are flagged by Timely as intentionally complex. Checking each suggested request against the catalog's grade levels turns up more than the note mentions:

| Student | Grade | Finding |
| --- | --- | --- |
| S002 Mei Chen | 9 | ENG101 and ENG102 both priority: ELL support runs alongside core English, so two English priorities is correct, not a duplicate |
| S003 Jordan Williams | 10 | MTH101 is a grade 9 course: a legitimate retake that a strict grade check would block |
| S004 Priya Patel | 10 | AT301 (AP CS A) is grades 11/12: an early AP the counselor chose deliberately |
| S006 Sofia Mendez | 11 | MTH401 and ENG401 are grade 12 courses; four APs plus AP elective. Profile says "confirm prerequisites, don't overload" |
| S008 Aisha Johnson | 12 | **SS303 does not exist** in the catalog. **SS402 appears twice** (P and E). Profile wants Psychology (SS403) and Economics (SS302), so both look like typos for those |
| S009 Liam O'Brien | 12 | Five AP courses; "review for schedule conflicts across AP courses" |
| S010 Nina Torres | 12 | Requests are a placeholder pending transcript review |

So the data itself argues for three behaviours: catch real data errors (unknown course, duplicate), flag but allow judgment calls (out-of-grade, heavy AP load) with a reason, and mark a student's list as not ready (S010).

## 6. MVP candidates beyond R1-R4

Scope decided in [Q6](../decisions/q006-timebox-and-mvp-scope.md).

| # | Candidate | User value | Cost | My lean |
| --- | --- | --- | --- | --- |
| M1 | Data-error checks: unknown course code, duplicate course | Stops bad SIS data reaching scheduling (S008) | Low | In; errors block Done ([Q5](../decisions/q005-bad-sis-request-data.md)) |
| M2 | Judgment warnings: out-of-grade, missing core subject, heavy AP load, override with a reason | Counselor stays in control; reason is visible to the AP | Low-medium | In, as warnings not blocks (decided for grade levels: [Q1](../decisions/q001-out-of-grade-courses.md)) |
| M3 | Per-student review status (not started / in progress / done / on hold) and a caseload filter | Turns the list into a work queue; covers S010 "on hold" | Low | In ([Q3](../decisions/q003-student-review-status.md)) |
| M4 | Request source: from SIS vs added in app | Needed for any safe SIS sync; links the prototype to the design doc | Low | In (data only, small UI cue); sync rule in [Q2](../decisions/q002-request-ownership.md) |
| M5 | Notes on a student or request | Captures why (retake, early AP) | Low | Maybe: fold into M2's reason |
| M6 | Course demand tally across students | Shows how requests feed scheduling | Low | If time, after the sync demo ([Q9](../decisions/q009-sis-sync-demo.md)) |
| M7 | Change history / audit | Several staff edit the same list | Medium | Out; mention as next |
| M8 | Prerequisite checks | S006 asks for it | High: needs transcript data we don't have | Out; explain why |
| M9 | Schedule conflict detection | S009 asks for it | High: needs sections and periods | Out; this is the scheduler's job, explain why |
| M10 | Auth, roles, persistence across restarts | Production basics | Medium | Out for prototype, except where architecture needs a seam |

## 7. Assumptions (to confirm)

- A1. One school, one upcoming year, about 10 students in the seed but the UI should still work at a few hundred per counselor.
- A2. Seeded suggested requests are what came from the SIS, loaded as-is with their errors.
- A3. Graduation rules are not given; any "missing core subject" check uses a stated simple rule that a school would configure ([Q4](../decisions/q004-priority-core-check.md)).
- A4. Counselor edits persist across restarts in a SQLite file ([Q8](../decisions/q008-prototype-storage.md)).

## 8. Questions walked through (all answered 2026-10-24)

1. **Timebox:** 2 hours prototype, 1 hour SIS design, AI-accelerated ([Q6](../decisions/q006-timebox-and-mvp-scope.md)).
2. **Validation:** judgment calls warn and are kept with a reason ([Q1](../decisions/q001-out-of-grade-courses.md)); data errors block only Done ([Q5](../decisions/q005-bad-sis-request-data.md)).
3. **MVP scope:** M1-M4 in, M5 folded into M2, M6 if time, M7-M10 out ([Q6](../decisions/q006-timebox-and-mvp-scope.md)).
4. **AP role:** same screen; status filter covers oversight; sign-off deferred ([Q3](../decisions/q003-student-review-status.md)).
5. **Complex students:** all handled through warnings and errors ([Q6](../decisions/q006-timebox-and-mvp-scope.md)).
6. **SIS design format:** decided with the architecture (step 3).
