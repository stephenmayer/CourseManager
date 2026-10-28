# Process kit: how I build software with Claude

A project-agnostic extraction of the process used to build Forward Budget (a solo-owner, Claude-built product). It is a kit, not one skill, because the process has several moving parts that fire at different moments.

## What is in it

| Piece | Fires when | File |
| --- | --- | --- |
| Entry point / map | Starting any new project or asking "how do we work here" | `skills/build-process/SKILL.md` |
| Phase planning and seams review | A plan exists and nothing is built yet | `skills/plan-and-seams/SKILL.md` |
| Design before build | Any visible UI change | `skills/design-before-build/SKILL.md` |
| Decisions | A product or process question only the owner can answer | `skills/decide/SKILL.md` |
| Implement a change (TDD) | Writing code for an issue | `skills/implement-change/SKILL.md` |
| PR flow and merge train | A branch is ready, or PRs are piling up | `skills/pr-flow/SKILL.md` |
| PR sweep (whole queue) | A schedule fires, PRs are conflicting or parked as drafts | `skills/pr-sweep/SKILL.md` |
| Bug bash | Many open defects | `skills/bug-bash/SKILL.md` |
| Project `CLAUDE.md` starter | Day one of a project | `templates/CLAUDE.md.template` |
| Docs-tree conventions | Day one, and every docs change | `templates/docs-CONVENTIONS.md.template` |
| Seams review template | Writing a plan-and-seams file | `templates/plan-and-seams.md.template` |
| Decision file template | Logging a decision | `templates/decision.md.template` |
| Working with the owner | Always | `reference/working-with-the-owner.md` |
| Lessons learned | When tempted to skip a rule | `reference/lessons.md` |

## Install into a new project

1. Copy `skills/*` to the project's `.claude/skills/` (or to `~/.claude/skills/` to have them everywhere).
2. Copy `templates/CLAUDE.md.template` to the project root as `CLAUDE.md` and fill in the `<<...>>` slots (commands, "Never" list, non-negotiables).
3. Create `docs/` from `templates/docs-CONVENTIONS.md.template` (rename to `docs/CONVENTIONS.md`) and make `docs/README.md` the map.
4. Replace the project-specific slots. Every slot is written `<<like this>>`; grep for `<<` to find them all.

## The process in one paragraph

Docs in the repo are the system of record, each fact owned by exactly one file. Work arrives as issues tied to a written plan. Before a plan is built, a seams review finds where it touches what already exists and the owner resolves the open questions. Anything visible gets a design the owner approves first. Decisions are logged with options and tradeoffs, then cascaded through every affected doc in the same change. Code is built test-first on a branch, self-reviewed (simplify, code-review, targeted review lenses), proven with one verify command, then the PR is opened ready, merged on green in dependency order. Anything irreversible or costly (release, production change, paid CI runners, store uploads) waits for the owner's explicit word.

## Provenance

Distilled 2026-10-24 from the Forward Budget repo (`CLAUDE.md`, `.claude/skills/*`, `docs/CONVENTIONS.md`, `docs/process/*`), its `plan-and-seams` files, and the owner's standing rulings. Forward-specific names, money rules and tooling were stripped; where a specific number or tool mattered it is kept as an example and marked "e.g.".
