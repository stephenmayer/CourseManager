---
id: q002-request-ownership
title: Who wins when the SIS and the app disagree on a request
status: current
decided: 2026-10-24, by Stephen
---

<a id="q002"></a>
# Q2: Once a counselor edits a request, who wins when the SIS sends a different version?

## Context

The exercise says course requests "may also come from the SIS, and are created and edited in the app by counselors", but never says who wins a disagreement ([gaps.md](../requirements/gaps.md) G23). Example: Monday's sync brings Jordan's elective AT201. Tuesday, Ms. Lee changes it to AT202. Wednesday's sync still says AT201.

## Options

| Option | What Ms. Lee sees Thursday | Tradeoffs |
|---|---|---|
| A. SIS always wins | AT201; her change is silently lost | Simple; counselors stop trusting the tool |
| B. App owns after first import | AT202; later SIS changes never arrive | Simple; real SIS fixes are lost |
| C. Edited requests are kept | AT202, with "SIS has a different value" to accept or dismiss; untouched requests keep updating | Needs a source and an edited marker per request |
| D. Two-way sync, latest wins | Whichever write is newer, plus write-back | Most capable; hardest; clock races lose edits |

## Resolution

**C.** Counselor work is never lost, and SIS corrections still flow in for anything the counselor hasn't touched. Each request carries its source (SIS or app) and whether it has been edited in the app. A sync that disagrees with an edited request raises a flag for the counselor; it never overwrites. Write-back to the SIS is a separate question (gaps.md G24).

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/requirements.md` (M4)
- [x] Gaps: `requirements/gaps.md` (G23 answered)
- [x] Decisions index row
- [ ] SIS sync design doc: not written yet; it must state this rule
