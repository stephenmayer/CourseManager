---
id: q020-checks-on-off
title: Turning checks on and off
status: current
decided: 2026-10-28, by Stephen (scope); the errors-stay-on default is shown on the design board for his approval
---

<a id="q020"></a>
# Q20: Should staff be able to turn the checks on and off?

## Context

The five checks are fixed in code (overview §3). Two of the warnings rest on stated assumptions, not on anything the exercise gives: the core-subject rule's subjects per grade ([Q4](q004-priority-core-check.md), A3) and the heavy AP load limit of 3 (M2). Reviewing PR #27, Stephen saw "No Social Studies priority" and asked where it came from; on reading A3 he asked for a screen to turn these rules on and off.

Example: a school whose grade 11 has no Social Studies requirement sees the core-subject warning on every grade 11 student without a Social Studies priority, and each counselor has to keep it with a reason. With the check off, it disappears from every screen, the student list counts and the checks filter.

## Options

| Option | Same example | Tradeoffs |
|---|---|---|
| A. Fixed in code (today) | Every grade 11 student keeps the warning | Nothing to build; the assumption can only be changed by a developer |
| B. Checks screen: the three warnings can be switched off; the two data errors stay on | The school switches the core-subject check off | One small table, two endpoints, one screen. Unknown and duplicate courses keep protecting the scheduler and the Done gate (Q5) |
| C. All five can be switched off | Same, and a school could also hide SS303 | Lets bad SIS data reach scheduling and makes Done meaningless (Q5) |
| D. Full rule settings (subjects per grade, AP limit) | The school removes Social Studies from grade 11 only | The graduation rules setup add-on (Q15, #18); more than on/off |

## Resolution

Stephen chose to **add a checks screen to Phase 1 now** (2026-10-28), designed for his approval before the build, then built before the README (1.9).

Proposed default, shown on the board for approval: **B**. Errors stay on because they protect scheduling (Q5); every warning can be switched off. D stays with Q15.

How it behaves:

- One setting per check for the whole tool (no roles or schools in the prototype, M10). Every check starts on.
- A check that is off produces no issues anywhere: student detail, list counts and filters, the course dialog. The Done gate is unchanged, since only errors block it and errors cannot be switched off.
- Reasons a counselor entered stay on the requests. Switching the check back on shows those warnings as kept again.
- Reset (re-seed) turns every check back on.
- Stored in an app-owned `check_setting` table (rule, enabled, updated_at); the service filters the rule list it hands to `check_student`, so the rules stay pure functions.

## Impacts (all updated in the same change)

- [x] Architecture: `architecture/overview.md` §3, `architecture/schema.md` §3
- [x] API: `process/developer-guide.md` endpoint table (with the build, issue 1.12)
- [x] Roadmap/plan: `plan/phases.md` (1.12)
- [x] Requirements: `requirements/requirements.md` (A3, M2)
- [ ] Design notes: `design/README.md`, `design/site-map.md` (after Stephen approves the board)
- [x] Decisions index row
