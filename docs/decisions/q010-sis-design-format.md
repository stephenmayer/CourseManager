---
id: q010-sis-design-format
title: SIS sync design write-up format
status: current
decided: 2026-10-25, by Stephen
---

<a id="q010"></a>
# Q10: What format should the SIS sync design write-up take?

## Context

The exercise asks for a write-up for an engineering team and a product partner to review async, then discuss; a PDF or equivalent file in the repo is fine; plus a 5-minute video. The follow-up iterates on it live.

## Options

| Option | Tradeoffs |
|---|---|
| A. Markdown in repo (+ PDF export) | One source with the code and decisions; renders on GitHub; easy to edit live |
| B. Google Doc | Good for comments; drifts from the repo |
| C. Slide deck | Good for the video; too thin for async review |

## Resolution

**A, Markdown only to start.** The design lives as Markdown in the repo with GitHub-rendered diagrams, linking to the Q files. Whether to also export a PDF is left for later. A short outline in the same file serves as the video script.

## Impacts (all updated in the same change)

- [x] Architecture: `architecture/overview.md` (A4)
- [x] Requirements: `requirements/requirements.md` (question 6)
- [x] Decisions index row
