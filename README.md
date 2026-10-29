# CourseManager

A localhost prototype of a course request tool for school counselors and assistant principals, plus a design for syncing with a district's SIS. Built for the Timely Director of Engineering take-home.

Counselors review each student's requests for next year, fix bad data from the SIS, add and remove catalog courses, mark each request priority or elective, keep judgment calls with a written reason, and mark a student Done. The SIS sync design is [`docs/sis-sync-design.md`](docs/sis-sync-design.md) ([#20](https://github.com/stephenmayer/CourseManager/pull/20)).

## 1. Run it

You need Python 3.12 with [uv](https://docs.astral.sh/uv/), Node 22 with npm, and GNU make. Then:

```sh
make dev       # installs dependencies and starts the API and the app
```

Open http://localhost:5173. The first start loads the exercise's data as SIS import #1; counselor edits persist across restarts. `curl -X POST localhost:5173/api/reset` starts over. `make verify` runs lint, typecheck and every test. Ports, data files and the API are in the [developer guide](docs/process/developer-guide.md).

## 2. What it does

**Students.** Everyone going into next year with their grade, a preview of their SIS profile, request counts, checks and review status. Filter by status and by checks, and search by name or ID.

![Student list](docs/img/readme/students.png)

**Student detail.** Requests grouped priority first. Each check sits on the request it is about, in plain words. Here Jordan is retaking Algebra I, which the catalog lists for grade 9, so the warning asks for a reason the assistant principal can read. On the right, add courses from the catalog, filtered by grade. Errors block Done; warnings don't.

![Student detail](docs/img/readme/student-detail.png)

**Courses.** Request counts per course by department, so you can see demand. Codes students requested that aren't in the catalog are listed first. Select a course to see who requested it and fix requests from there.

![Courses](docs/img/readme/courses.png)

**Settings.** Switch each warning on or off for everyone. The two data errors stay on.

![Settings](docs/img/readme/settings.png)

## 3. Key decisions

Each decision has its own file with the options, a worked example and the trade-off; the [decisions log](docs/decisions/README.md) is the full list.

- **The data layer is split by who owns the data** ([architecture §1](docs/architecture/overview.md)): the SIS owns students and the catalog (read-only here), the app owns requests and review status. Swapping the seed for a real SIS API means writing one new source; the loader, rules, API and UI don't change.
- [Q18](docs/decisions/q018-sis-import-versioning.md): SIS imports are versioned snapshots; requests keep their SIS base and reconcile three ways.
- [Q1](docs/decisions/q001-out-of-grade-courses.md): Out-of-grade courses warn; counselor keeps them with a reason.
- [Q2](docs/decisions/q002-request-ownership.md): Edited requests are kept; SIS changes to them are flagged, never overwritten.
- [Q3](docs/decisions/q003-student-review-status.md): Counselor sets per-student status (Not started, In progress, On hold with reason, Done); edits reopen Done.
- [Q4](docs/decisions/q004-priority-core-check.md): Priority is a counselor label plus one warning: missing a priority course in a core subject.
- [Q5](docs/decisions/q005-bad-sis-request-data.md): Bad SIS request data loads as-is, shows as errors, and blocks Done until fixed.
- [Q7](docs/decisions/q007-stack.md) and [Q8](docs/decisions/q008-prototype-storage.md): FastAPI + React/TS; counselor edits in a SQLite file behind one store class, tests on in-memory SQLite.
- [Q12](docs/decisions/q012-course-view.md) and [Q20](docs/decisions/q020-checks-on-off.md): the Courses and Settings screens above.

## 4. Testing strategy

Every check is a pure function, unit-tested on the exercise's own students; the API is tested end to end on a fresh in-memory database per test; every screen has component tests. Tests are written and committed failing before the code, and `make verify` runs them all. Browser end-to-end and load tests are left out on purpose; screens are checked against their approved designs. Detail: [architecture §5](docs/architecture/overview.md#5-testing-strategy).

## 5. Pilot vs scale

- **What holds:** the two data ports, so a pilot can start on a nightly SIS file and SQLite and move to a real SIS API and Timely's MongoDB one class at a time; rules that run only in the backend, so every screen agrees; versioned imports, so a bad sync can be undone.
- **What doesn't yet:** sign-in and roles (everyone shares one built-in counselor), tenancy (every query scoped by district and school), audit history beyond soft deletes, and settings per school rather than one for everyone.
- **Next:** the milestones in the [SIS sync design](docs/sis-sync-design.md).

## 6. Known gaps, left on purpose

Each has a "designed, not built" board ([design index](docs/design/README.md)):

- **Student history and graduation rules** ([Q15](docs/decisions/q015-history-and-grad-rules.md)), the biggest. Without transcripts or district rules the core-subject check is a stated stand-in, and Settings can switch it off.
- **Alternates for electives** ([Q16](docs/decisions/q016-alternate-requests.md)) and **students not in the SIS yet** ([Q17](docs/decisions/q017-provisional-students.md)).
- **The SIS sync itself:** running imports, reconciling and rolling back ([Q13](docs/decisions/q013-sis-sync-runs.md), [Q14](docs/decisions/q014-sis-sync-on-queue.md)).
- **Group requests** ("any one of these"): an open question for schools ([G32](docs/requirements/gaps.md)).

## 7. How AI was used and verified

> Draft for Stephen to review (issue #9). Facts are from the repository history.

- **Stephen made the decisions.** Every product decision in [`docs/decisions/`](docs/decisions/README.md) records Stephen as the decider, after he saw options with a worked example and a recommendation. Requirements, architecture, the plan and every screen design were reviewed and approved by him before any code was written. He gave the go to build on 2026-10-28.
- **Claude (Claude Code) did most of the writing**: the code, the tests and the docs, through pull requests. Parallel threads built separate screens.
- **The method is a written process** (`.claude/skills/`). It runs in this order:
  1. Requirements traced to the exercise.
  2. Decisions logged.
  3. Designs approved before building.
  4. Tests written and committed failing before the code.
  5. Before each pull request: one command that must pass (`make verify`), then an automated simplification pass and a code review on the diff, with every finding and what was done about it listed in the PR.
- **Verification.**
  - The full backend and frontend suites run on every change (`make verify`).
  - Screens were checked against their approved designs from screenshots of the running app.
  - Review passes caught real defects before merge. For example, an older local database would have broken every page once the Settings table was added (PR #32).
- **One process slip, fixed.** The first build PRs claimed review passes that had not run. Stephen noticed. The passes were then run on those PRs, their findings were fixed (PR #30), and the rule was written into `CLAUDE.md`.
