---
id: arch-overview
title: Prototype architecture
status: current
owns: "the shape of the prototype: components, data model, rules, the swap seam, testing strategy, and the open architecture choices"
updated: 2026-10-28
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
   ├── SisSource      read-only: students, catalog, current import ← reads the current SIS import
   └── RequestStore   read/write: requests, reasons, review status ← SQLite file today (Q8), Mongo tomorrow

SIS data arrives in three layers (built in 1.2, seams S1):
   Source (raw export)  →  Loader (normalize, write one import)  →  current import  →  SisSource
   SeedFileSource reads backend/seed/sis_export.json today; an SIS API connector replaces it tomorrow.

Designed, not built (Q15): SisSource gains a transcript feed; a GraduationRules config (per district) joins it.
```

The two ports split the data by **who owns it**, which is the exercise's own split: the SIS owns students and the catalog; the app owns what counselors do. That one seam answers "how is the data layer abstracted so the source is easy to swap?" Swapping the seed for a real SIS means writing a new Source that returns the same raw export shape (`app/sis/export.py`); the Loader, `SisSource`, rules and UI do not change. Only the Loader knows the export's quirks (`9/10` grades, `P`/`E`, AP from the name). It is also the seam the SIS sync design hangs off ([Q2](../decisions/q002-request-ownership.md)).

## 2. Data model

Full schema, constraints and diagram: [schema.md](schema.md). SIS data is stored as versioned import snapshots, and each request keeps the SIS base it last agreed with ([Q18](../decisions/q018-sis-import-versioning.md)).

| Entity | Fields | Owner |
| --- | --- | --- |
| Student | id, name, grade (upcoming year), profile text | SIS (read-only) |
| Course | code, name, department, grades, is_ap | SIS (read-only) |
| Request | id, student_id, course_code, type (priority/elective), source (sis/app), edited_in_app, reason, removed_at, sis_key, base_import_id, sis_conflict (Q18) | App |
| Review | student_id, status (not started / in progress / on hold / done), hold_reason | App |
| Request alternates (Q16, not built) | alternate_for (request id), rank | App |
| Transcript entry (Q15, not built) | student_id, course_code, school_year, grade_earned, credits | SIS (read-only) |
| Graduation rule (Q15, not built) | district, subject area, credits required, named required courses | App config |
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

Checks on and off ([Q20](../decisions/q020-checks-on-off.md)): the Settings screen switches each warning off for the whole tool; the two errors stay on. The service passes only the switched-on rules to `check_student`, so the rules stay pure and nothing is stored about issues. Reset turns every check back on.

Status rules ([Q3](../decisions/q003-student-review-status.md)): Done is refused while any error remains; editing a Done student moves it to In progress; On hold requires a reason.

Designed but not built ([Q15](../decisions/q015-history-and-grad-rules.md)): a graduation progress rule (rules minus earned minus requested credits) that replaces the Q4 core check once transcripts and rules exist, and enables prerequisite checks and a "fills a gap" catalog filter.

Built in 1.3 as `backend/app/rules.py`. Each issue carries a severity, rule id, message and detail (copy from the approved boards for the first three rules), the request it sits on, and `kept` when that request has a reason. Choices made in the build, reversible:

- The duplicate is reported on each later copy and links the first; the unknown-code and core checks ignore unknown codes, so SS303 raises one error only (S8).
- The core check has no request to sit on, so it cannot be kept; it clears when a priority course in the subject is added.
- The heavy AP warning sits on the **last** AP request in the list, so a reason there keeps it. Removing APs below four clears it.
- The rules always see a student's requests in the order they were added, on every screen, so "the first copy" and "the last AP" name the same request on the student page and in the course dialog. Screens sort for display afterwards.

Adding a rule = one function + its tests. That is the "generalize" story: graduation rules or prerequisites plug in the same way once the data exists.

## 4. Screens (detail comes in the design step)

1. **Student list:** name, grade, status, request count, error/warning counts, profile flag; filter by status and by checks (has errors, has warnings, all clear), combined; search by name.
2. **Student detail:** profile, requests grouped Priority then Elective, each with source and any issue; add from catalog (grade checkboxes 9-12, the student's grade checked by default); remove; switch P/E; give a reason; set status; select a course code to open the same course dialog as the Courses screen.
3. **Courses** ([Q12](../decisions/q012-course-view.md)): every course with request counts by department, plus a "Not in catalog" row; select a course to open a dialog showing who requested it, to remove, switch P/E or open the student. Catalog stays read-only.

## 5. Testing strategy

- Unit tests on every rule, using the seed's own cases (S003, S006, S008) as fixtures: the bulk of the value.
- API tests through the service with a fresh in-memory SQLite database per test: add, remove, switch type, Done blocked by an error, edit reopens Done.
- Frontend: typecheck plus one smoke test of the main flow if time allows.
- One command runs it all (the kit's merge gate).

Pilot vs scale, in one line each for the README: the ports let a pilot run on a nightly SIS file and an in-memory or SQLite store, and move to a real database and SIS API without touching rules or UI; what doesn't scale yet is auth, tenancy (every query scoped by school), and audit history.

## 6. Choices made with Stephen (all decided)

| # | Choice | Options | My lean |
| --- | --- | --- | --- |
| A1 | Stack | **Decided: FastAPI + React/TS ([Q7](../decisions/q007-stack.md)).** DuckDB only for SIS file diffs and the tally, never the edit store | |
| A2 | Storage in the prototype | **Decided: SQLite file via built-in `sqlite3`, reset re-seeds ([Q8](../decisions/q008-prototype-storage.md))** | |
| A3 | Show the SIS sync in the prototype? | **Decided: only if time allows, after the counselor flow and before the tally ([Q9](../decisions/q009-sis-sync-demo.md))** | |
| A4 | SIS design format | **Decided: Markdown in the repo to start; PDF later if wanted ([Q10](../decisions/q010-sis-design-format.md))** | |

## 7. Decided here as obvious engineering (tell Stephen, reversible)

- Rules run in the backend only; the UI shows what the API returns. One source of truth.
- Every write returns the student's full updated detail (requests, issues, status), so the UI never recomputes rules.
- REST JSON API; frontend calls it through one client module so it can be mocked.
- Request IDs are generated in-process; real IDs come with persistence.
- Light and dark mode: follows the system setting by default, with a header toggle remembered per browser (local storage). UI only, no backend.
- SIS sync runs are jobs behind a small queue interface: in-process in the prototype, RabbitMQ in production ([Q14](../decisions/q014-sis-sync-on-queue.md)).
