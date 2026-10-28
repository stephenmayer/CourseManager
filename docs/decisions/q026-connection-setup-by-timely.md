---
id: q026-connection-setup-by-timely
title: Timely's implementation team sets up each district's SIS connection; the district provides access
status: current
decided: 2026-10-28, by Stephen (to confirm with Timely)
---

<a id="q026"></a>
# Q26: Who sets up a district's PowerSchool connection? (RQ12)

## Context

Connecting a district means installing our PowerSchool plugin (only the district's PowerSchool admin can), entering the client ID and secret, mapping the district's codes (their `R` means priority), and a dry run (our sample: 10 students, 2 errors, Aisha's SS303 and duplicate SS402) before going live ([Q22](q022-powerschool-first.md)).

## Options

| Option | What happens (same example) | Tradeoffs |
|---|---|---|
| A. Timely team, district provides access | District admin installs the plugin; Timely maps and dry-runs on an internal screen | Cheapest for a few pilots; mapping needs judgment |
| B. District self-service | District admin runs a setup wizard | Scales; more UI and support for the MVP |
| C. Leave open | No assumption | Plan names both paths |

## Resolution

**A.** No district-facing setup screen in the MVP; self-service once mappings repeat. An assumption to confirm with Timely.

## Impacts (all updated in the same change)

- [x] SIS design: `sis-sync-design.md` (RQ12, 3.3)
- [x] Decisions index row
