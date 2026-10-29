---
name: implement-change
description: >
  Test-driven workflow for implementing an issue or landing any change on the
  main branch: gate checks, red/green/refactor, proof commands, self-review
  passes, PR contents, follow-ups filed by class. Use when starting, continuing,
  fixing a failing check on, or opening a PR for an issue.
---

# Implement a change (TDD is mandatory)

Issues map 1:1 to rows in the plan, each with a TDD plan, acceptance criteria and a Verification section. Work in dependency order. Implement from the issue plus the docs it cites.

## 0. Gates (stop if any fails)

- **Seams gate:** the phase's seams review exists and the plan says its resolutions are applied (see `plan-and-seams`). Exempt: design parts, pure functions nothing calls yet.
- **Design gate (visible UI):** read the design docs and approved artboards before any test or code; they are spec for copy, states, touch targets and numbers. Owner approval is required (see `design-before-build`).
- **Tool gate:** if Verification needs a tool you lack (container daemon, cloud credentials, infra CLI), add the label to the issue, say so, stop. Never skip silently.
- **Model gate:** read the issue's `model:` / `effort:` labels. Wrong tier: comment and stop.

## 1-5. Red, green, refactor

1. Branch from main: `feat/<phase>-<part>-<slug>`.
2. **Red:** write the issue's test cases first; they must fail for the right reason. Commit `test(<part>): ...`.
3. **Green:** minimum code to pass. Commit.
4. **Refactor** with the suite green. Commit.
5. Small commits. Inner loop runs only tests near the change; the full suite is for the proof step.

Production behaviour without a new or changed test is rejected, unless the issue says "no new tests".

## 6. Prove it

Run the issue's Verification commands verbatim. UI changes: run component tests and UI scenarios, **look at every screenshot** against the artboard. Then the project's single merge-gate command (`make verify`), which must refuse uncommitted changes and print a receipt naming the exact commit. Run checks in the foreground; never background them and idle.

It is the gate, not CI: any failure blocks the PR, even one you think is unrelated (if it also fails on a clean `main`, say so and fix `main` first).

**The proof is what actually executes the changed lines.** Re-run what you ran to prove the work in the first place (stack scripts, integration path, UI scenarios), not just the directory's unit tests.

## 7. Before any PR exists, in this order

The two passes are the **`simplify` and `code-review` skills, invoked with the Skill tool** (`/simplify`, then `/code-review <base>..HEAD`). Re-reading your own diff does not count as either pass, and a PR body must not say a pass ran unless the skill ran.

1. Verification passes.
2. **Invoke `/simplify`** on the issue's diff; it applies edits.
3. **Re-run the proof.** The simplify step does not check behaviour survived; this re-run is load-bearing.
4. **Invoke `/code-review`** on the issue's diff; fix each finding (test first when it changes behaviour) or record why not.
5. Re-run the proof if fixes changed anything. If the fixes were more than trivial, run `/code-review` once more on the fix commits.
6. **Review lenses** for risky diffs: spawn a fresh reviewer per lens the diff touches (e.g. tenancy/security; money/ledger correctness). Give each only the issue and the base branch, never your PR text or opinion, so it judges the diff cold. Verdict is `PASS` or `CHANGES`; `CHANGES` blocks. Fix, re-run the proof, re-run that lens only; at most two rounds, then open as draft with unresolved findings verbatim.
7. Final commit; `make verify` and `make tests-required` pass on it ([developer guide](../../../docs/process/developer-guide.md#the-gate-is-local)); push; open the PR.

Scope both passes to the issue's own diff. Things noticed outside it go through follow-ups, never silently into the diff.

## 8. The PR

Opened **ready for review**, automatically. Draft only if a lens is still `CHANGES` after two rounds. Body: `Closes #<issue>`; what `/simplify` changed; each `/code-review` finding and how it was addressed (fixed in which commit, or why not); the verify receipt verbatim; whether it touches a migration, auth or money; what was filed as follow-ups. Add a **Manual Testing** comment: numbered steps to exercise it by hand, or "Not applicable - reason". Then hand off to `pr-flow`.

## Engineering standards

- **Consolidate; don't add a parallel implementation.** Extend the existing mechanism.
- **Bug or flake fix = measured reproduction:** fail N in 20 before, pass N in 20 after. Never skip, disable or quarantine a test; never bump a timeout unless reproduction proves the timeout, not a race, was the cause.
- **No shotgunning:** several candidate causes: pick one with a stated reason and say why you declined the others.
- **For every test of your fix ask:** could this pass if the fix were reverted? Prove it cannot. A test that cannot fail is not a test.
- Where the local harness cannot exercise the change, say so in the PR body and name what was not run; do not treat a green CI badge as proof.
- **Migrations:** expand/contract only; must work with the currently deployed revision; no down migrations.
- Don't re-open decided design questions in a PR; file a question and let `decide` handle it.

## Follow-ups: by class, not instance

For anything real you notice that this issue does not cover:

1. Search issues for the **class** first, open and closed. Open match: comment the new site. Closed as completed: its fix missed this site, comment and reopen. Closed as not planned or decision: comment, leave closed. Never file "same bug class as #N".
2. No issue covers the class: file **one**, labelled for triage, naming the class, every site found, why it matters, a link to this PR, and the **guard** that makes the next instance impossible (lint rule, shared primitive, test).
3. Not a defect (stale comment, duplicated helper): comment on the rolling tech-debt ledger issue.
4. A design proposal: deferred-decisions doc with its trigger, not an issue.

List what you filed in the PR body. Never widen the diff to fix it.
