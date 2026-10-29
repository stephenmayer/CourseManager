---
id: q015-history-and-grad-rules
title: Student history and graduation rules are designed as seams, not built
status: current
decided: 2026-10-27, by Stephen
---

<a id="q015"></a>
# Q15: How does the take-home handle student history and graduation rules?

## Context

Stephen (2026-10-27): the tool really needs (1) each student's full history, including middle school, and (2) what graduation requires, so the catalog could be filtered by what a student still needs. Graduation rules alone don't help: without history we can't tell whether a student has already earned a requirement. The exercise gives neither ([gaps.md](../requirements/gaps.md) C2, C3, G2, G3). Today's stand-in is the Q4 core-subject check.

The two together are one feature, a graduation progress check: required credits minus earned credits minus requested credits. History is SIS data (transcripts with courses, grades and credits; most SIS platforms store it). Graduation rules are usually credits per subject area plus a few named courses, set by state and district, and rarely modeled cleanly in an SIS, so the app would likely own a setup screen for them.

## Options

| Option | Tradeoffs |
|---|---|
| A. Design it, add the seam, don't build | Shows the real limit (data, not UI) without spending the 2h budget or inventing rules; prototype unchanged |
| B. Build with labeled sample data | Demonstrable credits-needed panel; costs build time; invented transcripts and rules |
| C. Leave it to the interview | Cheapest; reads as an afterthought |

## Resolution

**A.** The architecture names two more read-only inputs: a transcript feed from the SIS (completed courses, grades, credits, from middle school on) and graduation rules (credits per subject plus named required courses, configured per district; the one piece of setup data the app would own). A graduation progress rule plugs in as one more pure rule over both, and makes prerequisite checks (M8) and a "fills a gap" catalog filter possible. Nothing is built: the seed has no history or rules, and Q4's core check holds the place. The README names this as the biggest gap, and the SIS sync design includes the transcript feed.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/gaps.md` (C2, C3, G2, G3)
- [x] Architecture: `architecture/overview.md` (shape, data model, rules)
- [x] SIS sync design doc: [sis-sync-design.md](../sis-sync-design.md)
- [ ] README: not written yet; name this as the biggest gap
- [x] Decisions index row
