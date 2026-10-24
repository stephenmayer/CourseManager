---
name: bug-bash
description: >
  Whole-backlog defect sweep: find every open defect (by what the issue says,
  not just a label), verify each against main, bundle them into a handful of PRs
  by shared files and rule, work the bundles in waves, and finish with a coverage
  ledger accounting for every defect once. Use when asked to fix all the bugs,
  run a bug bash, or plan the bug backlog without one PR per bug.
---

# Bug bash

Forty bugs do not fit one session, and forty sessions make forty PRs, forty CI runs and a week of conflicts. Read the backlog once, group by shared code or rule, ship roughly a dozen bundle PRs, and leave a ledger.

1. **Sweep by content, not label.** A past bash used the `bug` label and missed ~20 defects that never carried it. Read titles and bodies of all open issues.
2. **Check each against main first.** Many are already fixed or moot. Close or annotate those with evidence.
3. **Bundle** by the files and the rule they share. A bundle closes several issues. Keep bundles small enough to review.
4. **Blocked by a question?** Hold that bundle only, send the question through `decide`, release the bundle when answered.
5. **Plan, seams, design.** Each bundle gets a short plan-and-seams file. Any visible change gets a design the owner approves first (`design-before-build`); this tightens any default of dispatching without approval. Pure-logic bundles can go ahead.
6. **Dispatch in waves,** one worker per bundle following `implement-change`. Respect a concurrency cap; send later waves as slots and blockers clear. Tag sessions so stocktaking can find them.
7. **Needs a tool you lack** (container daemon, cloud creds): route to a session on the owner's machine, or label and hand over a paste-ready prompt as fallback.
8. **Ledger.** End with a table: every open defect exactly once, with its bundle, PR, status (fixed / already fixed / held for question / not a bug / deferred) so nothing drops silently.
9. **Hand-testing:** merged bundles get a manual-test checklist (see PR Manual Testing comments) for the owner.
10. **Re-landing:** if CI auto-reverts a bundle, the re-land is a new PR that reverts the revert, with the fix and a fresh receipt.
