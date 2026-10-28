---
id: q021-local-merge-gate
title: The local make verify run is the merge gate; CI is not relied on
status: current
decided: 2026-10-28, by Stephen
---

<a id="q021"></a>
# Q21: What gates a PR and a merge to main?

## Context

Stephen (2026-10-28): "Update instructions on this repo to always run automated tests before creating the PR ... everything needs to be passing. We won't be using CI/CD tests so we need to make sure its passing before we merge to main." Issue #1 had made the GitHub `verify` and `tests-required` workflows the gate, to be marked required on `main`.

## Options

| Option | Tradeoffs |
|---|---|
| A. Local gate: `make verify` and `make tests-required` before the PR and again right before the merge | No CI dependency; agents can always run it; relies on agents following the rule, and the receipt is self-reported |
| B. CI as the gate (required checks on `main`) | Enforced by GitHub; Stephen is not using CI/CD |

## Resolution

**A.** Both commands must pass on the PR's head before it opens, and again on the head brought up to date with `main` right before merging; any failure stops the PR or the merge. Any GitHub workflow that still runs is informational. Procedure: [developer guide](../process/developer-guide.md#the-gate-is-local).

## Impacts (all updated in the same change)

- `CLAUDE.md`, `docs/process/developer-guide.md`, `Makefile` (`tests-required` target).
- Skills: `implement-change`, `pr-flow`, `pr-sweep`, `build-process`.
- Open: whether to remove `.github/workflows/` or keep them non-gating (asked 2026-10-28).
