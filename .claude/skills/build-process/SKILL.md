---
name: build-process
description: >
  The owner's end-to-end process for building software with Claude: repo docs as
  system of record, plan then seams review, design approval before UI work,
  logged decisions, test-first implementation, self-review, merge on green, and
  owner approval only for irreversible or costly steps. Use at the start of a
  project, when asked how work should flow, or to decide which sibling skill
  (plan-and-seams, design-before-build, decide, implement-change, pr-flow,
  pr-sweep, bug-bash) applies next.
---

# Build process (map)

Read this first, then jump to the skill for the stage you are in. Where a sibling skill and this file disagree, the sibling wins.

## The lifecycle

```
idea -> decide (options, tradeoffs) -> plan -> seams review -> design approval (if visible)
     -> implement (test first) -> self-review -> verify -> PR ready -> merge on green
     -> release (owner only)
```

| Stage | Skill | Gate to leave the stage |
| --- | --- | --- |
| Open question | `decide` | Owner answered; every affected doc updated in the same change |
| Plan written | `plan-and-seams` | Seams file exists, questions resolved, resolutions folded into the plan |
| Anything visible | `design-before-build` | Owner said OK to the light and dark designs |
| Build | `implement-change` | Verify command passes on the final commit |
| Ship to main | `pr-flow` | Local `make verify` passed on the head being merged (up to date with main); self-review done |
| Many open PRs | `pr-sweep` | Every PR merged, handed to its owner thread, or flagged with who it waits on |
| Many defects | `bug-bash` | Coverage ledger accounts for every defect once |

## Standing rules (apply at every stage)

1. **Docs are the system of record.** Read the repo's `docs/` before any product-behaviour decision. If a digest disagrees with its owner file, the newer wins, raise it, never resolve silently. See `templates/docs-CONVENTIONS.md.template`.
2. **Check the docs before asking the owner.** Ask only what the docs do not settle. The owner has been annoyed by questions the repo already answered.
3. **Ask the owner once, plainly, with an example.** When a question is genuinely theirs, explain it as if they have not read the code: background, a concrete worked example with real numbers, options with tradeoffs, your recommendation. See `reference/working-with-the-owner.md`.
4. **Reversible and seen-later: just do it and say so.** Irreversible, outward-facing, costly or production-changing: wait for the owner. The owner asking for the step is the approval; ask at most once.
5. **No parked drafts.** Run your own reviews, mark the PR ready, merge when the local `make verify` passes on the up-to-date head, in dependency order. CI is not the gate here; a failing local run stops the PR. Do not leave PRs waiting for a routine nod.
6. **Follow-ups are filed by class, not instance.** Search open and closed issues for the same shape first; comment on a match; only an unfiled class gets a new issue naming every site and the guard that stops recurrence.
7. **Never silently skip a step.** If a tool, environment or approval is missing, say so, label the issue, and stop rather than push unverified work.
8. **Costly infrastructure needs a yes first** (e.g. macOS CI runners, paid build minutes, store uploads). Be conservative; ask before kicking off.
9. **Match the owner's shell and conventions** when handing them commands (e.g. PowerShell quoting on Windows).
10. **Label routing.** Issues may carry model and effort labels. Start the thread on that model and effort. A thread on the wrong tier says so on the issue and stops.

## Starting a new project with this kit

1. Install the kit (see `../../README.md`).
2. Fill in the project `CLAUDE.md` from the template: purpose, a short **Never** list, **Non-negotiables**, commands, where docs start.
3. Create the docs tree with single ownership and a decisions log.
4. Write phase 1's plan, then run `plan-and-seams` before any code.
