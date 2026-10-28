---
name: pr-sweep
description: >
  A scheduled (or on-demand) pass over every open pull request: fix or hand off
  conflicts, mark finished green drafts ready, merge ready PRs in dependency
  order, check merged work wasn't reverted, and flag stale red PRs. Use when
  PRs pile up, on a recurring schedule, or when asked to sweep or clear the PR
  queue. Companion to pr-flow, which covers one PR; this covers the whole queue.
---

# PR sweep

One self-contained pass: read live state, act, report, end. It does not schedule itself or wait for CI. Obey the project's `CLAUDE.md` **Never** list and `pr-flow`'s "Never without the owner" section: no tags, releases, deploys, store uploads, OTA updates, infra applies, production data, or paid CI (<<paid or scarce CI jobs, e.g. macOS runners>>). Merging to <<default branch>> must only run <<the normal CI workflow>>.

## 1. Map

List open PRs. For each, read mergeable state, draft flag, latest `verify: PASSED` receipt and last activity. Find PRs that conflict with <<default branch>> or each other, including **migration-number clashes** (two PRs on the same number, or a PR on a number the default branch already took; the journal cannot skip numbers).

## 2. Conflicts you can fix

Merge <<default branch>> into the branch. **Never rewrite history on someone else's branch.** Resolve per the repo playbook: <<migration renumbering, lockfiles, generated registries, decision indexes>>. Run <<the fast checks, e.g. migration-journal test, formatter, targeted tests>> before pushing.

## 3. Conflicts you cannot fix, or a blocked merge

If the same logic changed on both sides, or the merge is blocked, do not guess. **Hand it to the owning thread**:

- Find the owner from the PR body (the project-thread link) and send it a short message: which PR and branch, what clashes, what to do (merge <<default branch>>, resolve, rerun checks, merge when green). Attach the owner's message if they asked for the handoff.
- Also tell an owning thread about anything you pushed to its branch (new head, renumbered migration), so it pulls before pushing.
- A PR with no thread link gets a PR comment naming what clashes instead.
- Two PRs claiming the same migration number: tell both threads; whichever merges second renumbers.

## 4. Drafts

Mark a draft ready only when the local `make verify` passes on its head and the work looks complete. Leave it a draft, and say who it waits on, when its body says it needs the owner (a design approval, a decision).

## 5. Merge

Squash-merge only PRs that are ready, conflict-free, and pass `make verify` locally on the head being merged (up to date with main), with that receipt posted (or the repo's docs-only/test-only fast path), in dependency order (see `pr-flow`). A PR with no receipt, or one meant for a manual merge, is left for the owner.

## 6. Reverts

Scan the last 24 hours of <<default branch>> for reverts of PRs recently reported merged. If one was reverted, say so.

## 7. Stale

Flag any open PR with no activity for more than 6 hours that is red or conflicted.

## Reporting

Stay silent if nothing needed you. Otherwise a few lines: what merged, what you pushed, which threads you messaged, what waits on whom, with PR numbers.
