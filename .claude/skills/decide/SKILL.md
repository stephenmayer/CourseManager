---
name: decide
description: >
  Works the owner through decisions only they can make: finds the open
  questions (docs, issues, contradictions), verifies each against the code
  before asking, decides the obvious internal ones itself, presents the rest one
  card at a time with a worked example, options, tradeoffs and a recommendation,
  then logs the answer as a numbered decision and cascades it through every
  affected doc in the same change. Use when asked what needs deciding, to walk
  open questions, or to record a decision already given.
---

# Decide

The owner is one person and every unanswered question lands on them. Questions arrive badly (a spec line saying "needs a decision", a three-item list in an issue). The job: find them, settle the ones that do not need the owner, and put the rest in a form a person can answer in one reading.

> The owner's standing intent: help me stay on top of questions and blockers. Come to me with specific questions and the context I need. **Don't assume I've read the code or the issue.** Some you can decide yourself when the answer is fairly obvious.

## 1. Find the questions

Sweep: the open-decisions folder, deferred items whose trigger has fired, contradictions between owner docs, issues labelled `decision` or titled `[SPEC]`, "decisions needed" sections in issue bodies, and judgement calls nobody wrote down.

## 2. Verify before asking

Decision files go stale. For each question check the code and current docs: is it already answered, already built, or moot? Half of any list is. Drop or update those. Never ask what the docs settle.

## 3. Sort

- **Obvious internal engineering** (one clearly right answer, reversible, no product impact): decide it, record it, tell the owner in one line.
- **Weighty architecture:** get a second opinion from a stronger model or reviewer before putting it to the owner, and present their view as input.
- **Genuinely the owner's** (product behaviour, money, scope, pricing, policy, brand): a card.

## 4. The card (one at a time, wait for each answer)

1. **Question** in one plain sentence, verb first.
2. **Background:** what exists today, in two or three sentences, no code references the owner has to look up.
3. **A worked example with real numbers.** A named user, specific amounts, a specific moment on a specific screen, and what each option makes that screen say. This is what makes options visible; the answer usually follows. Example: a two-earner household with a $2,400 paycheck and a $600 bill due before the next one.
4. **Options (2-4)** with tradeoffs, including the cost of each.
5. **Recommendation** and one-line reason.
6. **Default** you will use if they say "your call".

Keep options distinct; do not offer a favourite plus strawmen. Flag open sub-decisions explicitly instead of resolving them silently. If the owner asks to re-explain, do it with a simpler example, not more detail.

## 5. Record

- Decisions are numbered in one sequence, in dependency order, never reused (`Q<NN>`); sub-questions use letters (`Q24f`). Bare `Qn` always means the decisions log; anything else numbers with a prefix (`P-Q1` for a proposal) and maps to log numbers once answered.
- **One file per decision** (`templates/decision.md.template`): context, options with tradeoffs, resolution, who decided and when, impacts list. Plus one row in the decisions index.
- Superseded decisions are marked, never edited or deleted; the new one names what it amends.
- Findings from scenario testing (`F-<n>`) that reveal gaps get promoted to questions.

## 6. Cascade (the part people skip)

In the *same change* as the decision file, update **every** doc the decision impacts: architecture/rule, API, roadmap/plan, scenarios, design notes, help/user docs, digests. The tree must never hold a decided rule in one file and the replaced rule in another. A decision left "staged" is a defect. Run the docs verifier (links, ownership, decision references) before opening the PR. Read each source doc fully before editing to avoid content loss.

## 7. Then

Update or close affected issues, clear the triage queue, and run a docs-versus-code gap check if the decision changes behaviour already built. Report: what was decided, what changed, what is still open.
