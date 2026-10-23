# Decision log (v1)

Every call made in the initial build, so Stephen can review, push back, and steer v2.
Each row says what was chosen, what else was on the table, and a question worth asking.

## Product and scope

| # | Decision | Alternatives considered | Why | Revisit for v2? |
| --- | --- | --- | --- | --- |
| P1 | Checks are **warnings**; only true data errors (unknown course, duplicate) block "Complete" | Hard validation that rejects edits | Counselor judgment is the product. Edge cases like retakes and early APs are legitimate | Should grade-eligibility block unless approved? |
| P2 | Grade warnings can be **approved with a reason** (stored on the request) | Silent override; no override | Leaves an audit trail an assistant principal can review | Should only an AP be able to approve? |
| P3 | **Provenance** on each request: From SIS vs Added in app, plus who and when | No provenance | Required for any safe SIS merge (design doc D2) | Show "edited after import" as its own state? |
| P4 | **Per-student status**: Not started, In progress, Needs review, Complete. Any edit reopens to In progress | No workflow | Turns the cohort into a work queue | Is "Needs review" an AP sign-off step? Who sets it? |
| P5 | **Change history** per student | None | Several staff edit the same lists | Enough, or do we need undo? |
| P6 | **Course tally** screen | Skip | Shows why requests matter downstream (section counts) | Add capacity and sections needed? |
| P7 | Seed data **loaded as-is**, errors included (S008 `SS303`, duplicate `SS402`) | Clean the seed | The tool exists to catch bad SIS data, and it's a good debrief story | |
| P8 | "Did you mean" suggestions for unknown codes (string similarity) | None; LLM suggestion | Cheap, deterministic, and explainable | Natural place to show an LLM-assisted cleanup with human approval |
| P9 | Catalog picker defaults to the **student's grade**, with a toggle to show all | Show all | Fewer wrong picks; retakes still reachable | |
| P10 | Out of scope: auth, persistence, prerequisites, credit tracking, alternates, bulk actions | | Stay near the 3-hour budget | Which one would pilot counselors miss first? |

## Rule thresholds (assumptions, all in `backend/app/rules.py`)

| # | Assumption | Revisit? |
| --- | --- | --- |
| R1 | Grades 9 to 11 need a priority course in Math, English, Social Studies, and Science. Grade 12 needs English only | Real graduation rules vary by state and district. Make this a per-school setting |
| R2 | 5 to 7 requests is a normal load | Depends on the bell schedule |
| R3 | More than 3 APs triggers a warning | Ask School Success what counselors actually use |
| R4 | "AP" is detected by the course name starting with "AP " | Should be a catalog attribute from the SIS |

## Architecture

| # | Decision | Alternatives considered | Why | Revisit for v2? |
| --- | --- | --- | --- | --- |
| A1 | FastAPI + React/TypeScript (Vite) | All-TypeScript (Express); Next.js | Matches Timely's stack (Python, TS/React) | |
| A2 | Repositories split by **data ownership**: `ReferenceData` (read-only, SIS-owned) and `RequestRepository` (read/write) | One generic repository | Mirrors production ownership. Each swaps on its own | |
| A3 | Service layer holds business logic; routes are thin | Logic in routes | Testable without HTTP | |
| A4 | Rules are pure functions in a list | Rules engine; config-driven rules | Simple to test and extend | Move to config when schools differ |
| A5 | In-memory storage, reset endpoint | SQLite; Mongo | No setup for reviewers | Mongo repository is the first v2 step |
| A6 | Every write returns the full updated student detail | Return only the changed record and refetch | UI stays consistent with server-computed issues and status in one round trip | Fine at this size. Revisit for big lists |
| A7 | Frontend talks to the backend only through `CourseRequestApi` (`api.ts`) | fetch in components | One place to swap or mock | |
| A8 | Hand-written TS types mirror Pydantic models | OpenAPI codegen | Speed | Generate in v2 |
| A9 | Hand-rolled hash router, plain CSS, no state library | React Router, Tailwind, TanStack Query | Few dependencies, easy to read in a walkthrough | Add TanStack Query if screens multiply |
| A10 | Actor comes from an `X-User` header defaulting to "Demo Counselor" | Real auth | No auth in scope | SSO in v2 |
| A11 | Request IDs are sequential in-process (`R051`...) | UUIDs | Readable in demos | UUIDs once persisted |

## Testing

| # | Decision | Why |
| --- | --- | --- |
| T1 | 18 pytest tests: rules unit tests + API tests on a fresh app per test | Exercise says tests are optional. A small net makes changes safe and backs the "tests are the net" story |
| T2 | No frontend tests yet. The plan is in the README | Time budget |
