---
id: conventions
title: Documentation conventions
status: current
owns: "the rules for maintaining the docs/ tree: single ownership, append-only decisions, front matter, cross-references and index files"
updated: 2026-10-24
---

# Documentation conventions

`docs/` is the system of record. These rules exist so one resolved decision never needs hand-propagation across five documents again (the failure that motivated moving from a document drive to the repo).

## 1. Single ownership

**Every fact lives in exactly one file.** Others link to it, never restate it. If you find a rule in two places, pick the owner and replace the other with a link.

| Area | Owns |
| --- | --- |
| `requirements/` | The **problem**: users, requirements, assumptions, MVP scope |
| `decisions/` | The **why**: options, tradeoffs, resolution |
| `architecture/` | The **what**: the rule as it now stands, stated once |
| `roadmap/` or `plan/` | Sequencing only: phases, dependencies, done-when |
| `api/` | Request/response shapes and dialog behaviour |
| `scenarios/` | Expected behaviour as worked examples |
| `design/` | Artboards, UI notes, approved wireframes |
| `help/` | User-facing explanation; a digest of architecture files it lists |
| `process/` | How we work |
| `superseded/` | Old versions only; never read for current truth |

The `owns:` line in front matter is the enforcement: one sentence on what the file owns. If two files claim the same thing, that is a bug; raise it, do not resolve it by silently editing one.

## 2. Append-only decisions

- One file per decision, `q0NN-<slug>.md`; one row in `decisions/README.md`; numbers never reused.
- In the **same change**, update every file the decision impacts to state the new rule and link to the decision. A decision left "staged" is a defect.
- A superseded decision is marked `status: superseded` and "Superseded by QNN"; never deleted or reworded.
- Open questions live in `decisions/open/` until the owner answers. Proposals/audits that number their own questions prefix them (`P-Q1`) and state the mapping to log numbers once answered. Bare `Qn` means the log.

## 3. Front matter

```yaml
---
id: arch-date-model        # stable, unique, kebab-case; never changes
title: Dates and gates     # topic only, never provenance or decision refs
status: current            # current | draft | staged | superseded
owns: "one sentence"
updated: YYYY-MM-DD
---
```

## 4. Cross-references

Relative path plus heading anchor; never page or section numbers. Give decisions short stable anchors (`<a id="q17"></a>` above the heading). Prefer adding a heading to renaming one. Issue is `#N`, pull request is `PR #N`.

## 5. Indexes

Every directory has a `README.md` listing files with their `owns:` line. A newcomer finds any file in two hops: `docs/README.md`, area README, file.

## 6. Verification

A docs verifier script runs locally and in CI: relative links and anchors resolve; every file has front matter and a unique `id`; every cited decision exists and appears in the index; user-facing help articles are not stale against the sources they draw on. A failing link, decision or help check blocks the PR. A stale help article blocks a PR, including one that merely adds a feature without updating help.

## 7. What is not a docs edit

- Do not resolve an open question in a docs PR. If two files contradict, record the contradiction and leave both.
- Do not reword decisions or scenarios; reorganising is fine.
- Superseded documents move to `superseded/` (or are renamed `[SUPERSEDED by vN]` and filed in the archive in one step). Never read them for current truth.
