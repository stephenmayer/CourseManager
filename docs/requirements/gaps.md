---
id: requirements-gaps
title: Gaps and contradictions in the exercise
status: draft
owns: "what the exercise leaves out or contradicts, and the questions each gap raises"
updated: 2026-10-24
---

# Gaps and contradictions in the exercise

The exercise reads as complete, but it leaves out most of the rules a counselor actually applies, and its sample data contradicts itself in places. This file lists what is missing, where the document disagrees with itself, and the questions that would close each gap. Every finding cites the exercise or the sample data; anything I'm inferring is marked *(inferred)*.

Answers go in [`requirements.md`](requirements.md) or, when they are choices, in `../decisions/`.

## 1. Contradictions inside the exercise

These are places where two parts of the document can't both be right. They matter most, because whatever we build will visibly side with one of them.

| # | Contradiction | Evidence | Why it matters |
| --- | --- | --- | --- |
| C1 | **"Accelerated" disagrees with the catalog.** | S004 Priya, grade 10, MTH201 "(P – accelerated)". The catalog lists Algebra II (MTH201) as a grade 10 course, so taking it in grade 10 is on level, not ahead. | Either the catalog's Grade(s) column isn't "the grade you take it in", or the profile is wrong. We can't build a grade check until we know what that column means. |
| C2 | **Priority is defined as "required for graduation", but no graduation rules exist.** | Background: priority = "a required course for graduation or one they failed and must retake". Nothing in the exercise says what graduation requires. | The app can't check or suggest priority; it can only record what the counselor says. Priority becomes a label, not a rule. |
| C3 | **Prerequisites are referenced but don't exist in the data.** | S003 "must retake before advancing in math"; S006 "confirm prerequisites are met"; S007 "should be tracked for SCI301 now" for a senior-year course. The catalog has no prerequisite column and students have no transcripts. | Three of ten profiles ask for something the data can't support. We must say plainly that the app can't verify it, and design where it would plug in. |
| C4 | **Schedule conflicts are requested but impossible to detect.** | S009 "review for schedule conflicts across AP courses". There are no sections, periods or terms anywhere. | Conflicts are a master-scheduling concept; requests come before sections exist. This is out of scope for this tool, and we should say why rather than fake it. |
| C5 | **Profile and requests disagree for S008.** | Aisha wants "Psychology and Economics" (SS403, SS302). Her requests are SS303 (not in the catalog) and SS402 twice (AP Government, once P and once E). | Is this a deliberate data-quality test or a typo in the PDF? Either way, it is exactly the bad SIS data the tool should catch. We shouldn't silently "fix" it. |
| C6 | **Grade-level mismatches the note doesn't mention.** | The note names S002, S003, S009, S010 as the complex cases. But S004 (AT301 is grades 11/12) and S006 (MTH401 and ENG401 are grade 12 only, she's in grade 11) also break the catalog's grade ranges. | Either grade ranges are soft guidance (then a check is a warning), or two "simple" students have errors. Points back to C1. |
| C7 | **Students are "read-only from the SIS", but the counselor has to record things about them.** | SIS section says students are read-only. S010's "credit evaluation pending" and S002's ELL status are student-level facts the counselor acts on. | Where does "transcript review pending" live if the student record is read-only? Probably on the request list or a counselor note, not on the student. *(inferred)* |
| C8 | **"Assign and remove courses from the catalog" reads two ways.** | Prototype minimum, bullet 3. The SIS section says the catalog is read-only. | It almost certainly means assigning catalog courses to a student, not editing the catalog. Worth stating so a reviewer doesn't read it the other way. |
| C9 | **"Indicative" requests also carry explicit errors.** | Appendix B: "Suggested requests are indicative only". S010's list is literally a placeholder. | Are the seed requests what the SIS sent (so load them as-is) or Timely's suggestions (so treat them as drafts)? This decides whether "From SIS" means anything in the prototype. |

## 2. Missing information, by type

### Domain rules (what makes a request list correct)

| # | Missing | Why it matters | Question to ask |
| --- | --- | --- | --- |
| G1 | What the catalog's Grade(s) column means | Decides whether a grade check blocks, warns, or doesn't exist (C1, C6) | "Is Grade(s) who may take it, or who usually takes it? Can a counselor override it?" Assumed for now: warn, keep with a reason ([Q1](../decisions/q001-out-of-grade-courses.md)) |
| G2 | Graduation requirements | Needed to check or suggest priority requests (C2) | "Do schools give you graduation requirements in a structured form, or do counselors carry them in their heads?" Assumed for now: label plus a core-subject warning ([Q4](../decisions/q004-priority-core-check.md)). Designed as a seam, needs history too ([Q15](../decisions/q015-history-and-grad-rules.md)) |
| G3 | Prerequisites | Three profiles depend on them (C3) | "Does the SIS have prerequisites and transcripts? Is checking them in scope for this tool?" Transcript feed designed, not built ([Q15](../decisions/q015-history-and-grad-rules.md)) |
| G4 | How many requests a student needs (min, max) | Lets us say a list is "complete" or "overloaded" | "Is there a target number of courses per student, e.g. one per period?" |
| G5 | Course length and credits | A semester course and a year course aren't equal load | "Are all courses full-year? Do they carry credits?" |
| G6 | Whether a course can be requested twice | S008 has SS402 twice | "Is a duplicate ever valid (e.g. a repeatable course), or always an error?" Assumed for now: always an error ([Q5](../decisions/q005-bad-sis-request-data.md)) |
| G7 | What the request annotations are | "retake", "ELL Support", "accelerated", "early AP" appear on requests | "Do requests carry a reason or note, or is that just commentary in the PDF?" |
| G8 | Alternates | Real request processes collect backup choices for electives *(inferred)* | "Do counselors collect alternate electives? What happens when an elective is full?" |
| G9 | What "AP" is | Heavy-AP-load warnings need it; today it's only in the course name | "Is AP (or honors) a catalog attribute from the SIS?" |

### Users and workflow

| # | Missing | Why it matters | Question to ask |
| --- | --- | --- | --- |
| G10 | Counselor vs assistant principal: what's different | Decides whether there are roles, permissions, or just one screen | "Does an AP approve a counselor's work, or do both just edit?" |
| G11 | Caseloads | A counselor sees their students, not the whole school *(inferred)* | "Is each student assigned to a counselor? Do counselors see others' students?" Stephen 2026-10-27: no caseload in the prototype (one shared list, no login). Assumed for production: assignment comes from the SIS as a read-only student field, not managed in the app; confirm with Timely |
| G12 | What "done" means, and is there a deadline | Decides whether we need a status per student and a progress view | "How does a counselor know they've finished? Who checks?" Assumed for now: counselor sets status ([Q3](../decisions/q003-student-review-status.md)) |
| G13 | What happens after requests | Tells us when lists lock and who consumes them | "Do requests go into Timely's scheduler, back to the SIS, or both? When are they frozen?" |
| G14 | Where electives come from | "Student interest" implies student input, but students have no access | "Do students pick electives somewhere else (paper, SIS portal), and does that arrive as requests?" Answered: both, picks made beforehand arrive via the SIS ([Q11](../decisions/q011-student-preferences.md)) |
| G15 | Several staff editing one student | Last-write-wins could lose work | "Can two staff work on the same student at once?" |
| G16 | "Key context" for the list | Requirement R1 asks for it but doesn't define it | "What does a counselor need to see at a glance to choose who to work on next?" |

### Scale and constraints

| # | Missing | Why it matters | Question to ask |
| --- | --- | --- | --- |
| G17 | Students per school and per counselor | Ten in the seed; real caseloads are hundreds *(inferred)*. Decides search, filtering, paging | "What's a typical caseload and school size?" |
| G18 | Schools per customer, districts | Tenancy and catalog-per-school | "Is the catalog per school or per district?" |
| G19 | Privacy and compliance | Student data: FERPA, SOC 2 (Timely has a platform/security squad) | "What can a counselor see about students not on their caseload?" |
| G20 | Persistence for the prototype | "Simple backend or data layer" doesn't say whether edits must survive a restart | Ours to decide; record it as a decision |

### SIS sync (the design extension)

| # | Missing | Why it matters | Question to ask |
| --- | --- | --- | --- |
| G21 | Which SIS, and how we get data (API, file export, push, pull) | Shapes the whole sync design | "Which SIS products first? API or nightly file?" |
| G22 | How often the SIS changes during request season | Decides batch vs near-real-time | "How often do students and the catalog change while counselors work?" |
| G23 | Who owns requests once both sides can edit | "May also come from the SIS, and are created and edited in the app" doesn't say who wins a conflict | "After import, is the app the source of truth for requests, or can the SIS still change them?" Assumed for now: edited requests are kept ([Q2](../decisions/q002-request-ownership.md)) |
| G24 | Write-back | Not stated whether requests go back to the SIS | "Do edited requests need to be written back to the SIS?" Baseline one-way, app always merges; write-back optional per district ([Q19](../decisions/q019-one-way-sync-baseline.md)) |
| G25 | Stable identifiers | Course codes or student IDs that change break every link | "Are student IDs and course codes stable year to year?" |
| G26 | What happens to requests when SIS data changes underneath them | A course retired, a student withdraws or changes grade | "If a requested course disappears from the catalog, what should the counselor see?" |
| G27 | Data quality expectations | S008 suggests SIS data arrives dirty | "How bad is the incoming data, and who fixes it today?" Assumed for now: load as-is, flag, block Done ([Q5](../decisions/q005-bad-sis-request-data.md)) |

### The exercise itself (what the reviewers want)

| # | Missing | Why it matters | Question to ask |
| --- | --- | --- | --- |
| G28 | How strictly to hold to 3 hours | The deliverables (prototype, README, design doc, video) are a lot for 3 hours | "Is 3 hours a guide or a limit?" |
| G29 | Whether to handle the complex cases | The note says they "exercise judgment" but can be skipped | Ours to decide (requirements.md Q5) |
| G30 | Audience for the design doc | "Engineering team and product partner": two audiences with different needs | Ours to decide: write the decisions for product, the flow for engineers |
| G31 | What "new input" will come in the follow-up | We should be ready to iterate live | Ours to prepare: keep the design modular around the decisions most likely to flip (G21, G23, G24) |
| G32 | Open slots, alternates, group requests | Every request is one course code; nothing lets the optimizer choose (raised by Stephen 2026-10-27). The prompt also never gives a course or period load per student | "Do schools give the optimizer alternates or 'any one from this group' requests, and does the SIS carry them? How many courses must a student request?" Alternates designed, not built ([Q16](../decisions/q016-alternate-requests.md)); group requests a follow-up question |
| G33 | Students missing from the SIS (late transfers) | Students are read-only from the SIS, so a counselor can't plan for someone not yet enrolled (raised by Stephen 2026-10-27) | "How fast do new enrollments reach the SIS, and do counselors plan before that?" Provisional student, matched on sync, designed not built ([Q17](../decisions/q017-provisional-students.md)) |

## 3. Types of questions, and when to ask each

| Type | Example | Who answers | How we handle it now |
| --- | --- | --- | --- |
| **Product intent** (what the user is trying to do) | G12, G16 | A counselor or product partner | Assume, state the assumption in the README |
| **Domain rule** (what the school's policy is) | G1-G9 | The school, through the SIS or Timely's School Success team | Make the rule configurable or a warning; never hard-code a guess as a block |
| **Data availability** (does the data exist) | G3, G9, G21 | The SIS integration team | Design the seam; say what we'd need |
| **Ownership** (who wins, who can edit) | G10, G15, G23 | Product and engineering together | These are the key decisions in the SIS design |
| **Scale and constraints** | G17-G19 | Product, security | Assume a number, design so it doesn't break at 10x |
| **Exercise scope** | G28-G31 | Us | Decide and log it |

## 4. Suggested handling

Most of these gaps are deliberate, I think: the exercise asks for "what you'd need to understand before committing to a design" in the SIS section, and the complex students exist "to exercise counselor judgment". So the gaps are part of what's being tested. *(inferred)*

I'd recommend we don't email Timely with questions. Instead:

1. Put the top questions and our assumption for each in the README's "Problem and assumptions" section. That is the first thing the CTO-round feedback asked for.
2. Build so each assumption is easy to flip in the follow-up (rules as warnings with configurable thresholds; data behind an interface).
3. Use the contradictions (C1-C6) as debrief material: "here's what the data told me, here's what I chose, here's what I'd ask a counselor."

The ones I'd lead with, because they change the design most:

- **G1 / C1:** what Grade(s) means. Decides block vs warn.
- **G23:** who owns requests after import. Decides the whole SIS sync design.
- **G12:** what "done" means. Decides whether we build a per-student status.
- **C2 / G2:** priority without graduation rules. Decides whether priority is a rule or a label.
- **C5 / G27:** dirty SIS data. Decides whether we validate on import.
