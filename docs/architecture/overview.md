---
id: arch-overview
title: Prototype architecture
status: draft
owns: "the shape of the prototype: components, data model, rules, the swap seam, testing strategy, and the open architecture choices"
updated: 2026-10-24
---

# Prototype architecture (draft for the step 3 brainstorm)

Built from the requirements and decisions Q1-Q6. Section 6 lists the choices that are Stephen's; everything else here is a proposal he can push back on.

## 1. Shape

```
Browser (counselor UI)
   │  JSON over HTTP
   ▼
API (thin routes)
   ▼
Service ── rules (pure functions → issues)
   │
   ├── SisSource      read-only: students, catalog, SIS requests   ← seed today, SIS connector tomorrow
   └── RequestStore   read/write: requests, reasons, review status ← in-memory today, database tomorrow
```

The two ports split the data by **who owns it**, which is the exercise's own split: the SIS owns students and the catalog; the app owns what counselors do. That one seam answers "how is the data layer abstracted so the source is easy to swap?" and is the same seam the SIS sync design hangs off ([Q2](../decisions/q002-request-ownership.md)).

## 2. Data model

| Entity | Fields | Owner |
| --- | --- | --- |
| Student | id, name, grade (upcoming year), profile text | SIS (read-only) |
| Course | code, name, department, grades, is_ap | SIS (read-only) |
| Request | id, student_id, course_code, type (priority/elective), source (sis/app), edited_in_app, reason | App |
| Review | student_id, status (not started / in progress / on hold / done), hold_reason | App |
| Issue (computed, never stored) | severity (error/warning), rule, message, request_id | Derived |

Notes:
- `is_ap` is derived from the name ("AP ...") in the seed adapter only, since the catalog has no AP column ([gaps.md](../requirements/gaps.md) G9). The rest of the code reads the attribute, so a real SIS field replaces it in one place.
- `source` + `edited_in_app` are all Q2 needs in the prototype.
- Grade means the student's **upcoming** grade (every seeded student's core requests match their listed grade).

## 3. Rules

Each rule is a pure function `(student, requests, catalog) → issues`, run on every read. No stored issue state to drift.

| Rule | Severity | Fires on seed | Decision |
| --- | --- | --- | --- |
| Unknown course code | error, blocks Done | S008 SS303 | [Q5](../decisions/q005-bad-sis-request-data.md) |
| Same course requested twice | error, blocks Done | S008 SS402 | Q5 |
| Course outside its catalog grade | warning, kept with a reason | S003, S004, S006 | [Q1](../decisions/q001-out-of-grade-courses.md) |
| No priority course in a core subject | warning | none until one is removed | [Q4](../decisions/q004-priority-core-check.md) |
| Heavy AP load (more than 3 APs) | warning, kept with a reason | S006, S009 (5 each) | M2; threshold is an assumption to state |

Status rules ([Q3](../decisions/q003-student-review-status.md)): Done is refused while any error remains; editing a Done student moves it to In progress; On hold requires a reason.

Adding a rule = one function + its tests. That is the "generalize" story: graduation rules or prerequisites plug in the same way once the data exists.

## 4. Screens (detail comes in the design step)

1. **Student list:** name, grade, status, request count, error/warning counts, profile flag; filter by status; search by name.
2. **Student detail:** profile, requests grouped Priority then Elective, each with source and any issue; add from catalog (filtered to the student's grade, with "show all"); remove; switch P/E; give a reason; set status.
3. **Course tally** (only if time, M6).

## 5. Testing strategy

- Unit tests on every rule, using the seed's own cases (S003, S006, S008) as fixtures: the bulk of the value.
- API tests through the service with a fresh in-memory store per test: add, remove, switch type, Done blocked by an error, edit reopens Done.
- Frontend: typecheck plus one smoke test of the main flow if time allows.
- One command runs it all (the kit's merge gate).

Pilot vs scale, in one line each for the README: the ports let a pilot run on a nightly SIS file and an in-memory or SQLite store, and move to a real database and SIS API without touching rules or UI; what doesn't scale yet is auth, tenancy (every query scoped by school), and audit history.

## 6. Open choices for Stephen

| # | Choice | Options | My lean |
| --- | --- | --- | --- |
| A1 | Stack | FastAPI + React/TS; all TypeScript (Node + React); Python server-rendered pages | FastAPI + React/TS: Timely's own stack, so their engineers can extend it live |
| A2 | Storage in the prototype | In-memory with reset; SQLite file; MongoDB | In-memory: zero setup for reviewers; the port shows where a database goes |
| A3 | Show the SIS sync in the prototype? | Design doc only; a "Run SIS sync" button that loads a changed SIS file and shows Q2's flags | Button, if time: it turns the design doc into something they can click |
| A4 | SIS design format | Markdown + diagram in the repo, exported to PDF; slides | Markdown + PDF, plus a video outline |

## 7. Decided here as obvious engineering (tell Stephen, reversible)

- Rules run in the backend only; the UI shows what the API returns. One source of truth.
- Every write returns the student's full updated detail (requests, issues, status), so the UI never recomputes rules.
- REST JSON API; frontend calls it through one client module so it can be mocked.
- Request IDs are generated in-process; real IDs come with persistence.
