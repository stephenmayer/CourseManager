---
id: q016-alternate-requests
title: Alternate requests are designed, ready for the follow-up, not built
status: current
decided: 2026-10-27, by Stephen
---

<a id="q016"></a>
# Q16: How far do we take alternate requests in the take-home?

## Context

The prompt has no alternates, open slots or group requests: every request is one course code ([gaps.md](../requirements/gaps.md) G32). Stephen (2026-10-27): "It seems like it should have opportunity to do alternatives ... I'm surprised this is missing from the inputs." Electives are the requests a scheduler most often can't grant, so real tools let a counselor rank backups. The omission may be deliberate: a likely "new input" for the 60-minute follow-up. Example: Jordan asks for Music Theory (AT202) as an elective, with Web Design (AT201) as his backup.

## Options

| Option | Tradeoffs |
|---|---|
| A. Design it, ready for the follow-up | Shows the gap was seen; 2h build intact; adding it live is a small, rehearsed change |
| B. Build alternates for electives | Visible in the prototype; about 20-30 minutes of the build budget |
| C. Follow-up question only | Cheapest; no prepared plan if it comes up live |

## Resolution

**A.** Not built. The planned change, kept small so it can be added live:

- Data: a Request gains optional `alternate_for` (the request it backs up) and `rank` (1 = first backup). An alternate is always an elective and never counts toward the core check (Q4) or the AP load warning.
- Rules: an alternate pointing at a missing request, or at the same course as its first choice, is a data error (Q5 pattern). A first choice with no alternates is fine.
- Student page: ranked backup rows indented under their elective, with "Add alternate" on each elective.
- Courses: alternates counted in their own column, apart from first choices, so demand isn't overstated.
- SIS design: whether the SIS carries alternates (many do), and how they map to `alternate_for` and `rank`.

Group requests ("any one Arts & Tech elective") stay an open question for the follow-up (G32).

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/gaps.md` (G32)
- [x] Architecture: `architecture/overview.md` (data model note)
- [ ] SIS sync design doc: not written yet; it must cover alternates from the SIS
- [ ] README: not written yet; name alternates as a seen gap with this plan
- [x] Decisions index row
