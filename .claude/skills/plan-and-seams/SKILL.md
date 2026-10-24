---
name: plan-and-seams
description: >
  Mandatory step between a written implementation plan and any building: an
  integration/architecture "seams" review of everywhere the new design touches
  existing systems, producing edge cases, owner questions and resolutions that
  are folded into the plan. Use after writing or receiving a plan for a phase,
  feature or non-trivial change, and before any code, migration or UI work.
---

# Plan, then seams review, then build

**Rule:** after an implementation plan is written and *before* implementation starts, review the seams where the new design touches existing systems and behaviour. Find integration problems and edge cases, raise the open questions with the owner, work out how to solve each, and add them to the plan. Build begins only after this is done. Open questions are expected and fine; unresolved blockers are not.

Not needed for: pure design/artboard work, or a self-contained function nothing existing calls yet. Say which exemption you are using.

## Why

Problems found after building cost a rework and sometimes a migration. The reviews found things like: a monthly saving funded once and then never again because the "need" calc considered it met; a feature that assumed a link between two records that the schema never had; new foreign keys that turned existing delete endpoints into raw 500s; copies of a value (target, date) that other screens could edit without updating the copy.

## Procedure

1. **Write the plan first.** What changes (numbered), why it is needed (verified in code, cite files), and a part list in dependency order.
2. **Map the touch points.** List every existing system the change reads from, writes to, or shares a table, enum, route, job, notification, doc or permission with. Search the code; do not rely on memory. Typical lenses:
   - Data: schema, migrations (must work with the *currently deployed* revision; expand/contract, no down migration), constraints and foreign keys on delete/move paths, indexes, enums.
   - Behaviour: other features that compute from the same data, derived/read models, background jobs (idempotent?), notifications, search, exports, imports.
   - Money/state invariants: immutability rules, append-only streams, closed periods.
   - Access: roles (viewer vs editor), tenancy scoping on every query, auth on new routes.
   - Copies: any value duplicated from another record that can drift.
   - Old clients: wire changes the deployed revision or older app builds still send or read.
   - Concurrency: two actions at once, retries, double submit.
   - Docs: which docs own each affected rule; which must change in the same PR.
3. **Write each finding** with: the seam, what happens (use a concrete worked example with numbers), severity (*blocker* = design cannot deliver what was approved; *must-resolve before part N*; *minor* = rides along), and the proposed resolution. Mark anything not proven from code as *(inferred)*.
4. **Edge cases:** list each with proposed behaviour and the part that owns it.
5. **Questions for the owner:** only genuinely theirs. Each with a default you will use, an example, and consequences. Check the docs first. Use a decision card (one question at a time) if the choice changes their goal.
6. **Fold into the plan.** Update the part rows so each part names the edge cases it must handle and the tests that prove them. Record "seams review applied" in the plan so the implement gate can check it.
7. **Report:** lead with counts (issues by severity, owner questions) and the top three risks. Link the seams file; do not paste it.

Use `templates/plan-and-seams.md.template` for the file layout. Keep it in the repo (e.g. `docs/plan/reviews/phase-<n>-seams.md`) so the implement step can verify it exists.

## Gate (enforced by implement-change)

Before building a part, confirm the phase's seams file exists and the plan says the resolutions were applied. If not: stop, comment on the issue, do no work. Not retroactive for work that started before the rule.

## Scale

A one-screen feature gets a table of ~10 rows (see the example shape in the template). A multi-part phase gets sections, a risk summary and an owner-question list. Match effort to blast radius.
