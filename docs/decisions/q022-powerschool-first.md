---
id: q022-powerschool-first
title: First SIS target is PowerSchool via OneRoster plus a PowerQuery, with a CSV file connection as the second, both tested against a mock
status: current
decided: 2026-10-28, by Stephen
---

<a id="q022"></a>
# Q22: Which SIS do we build for first, through which interface, and how do we test it?

## Context

The SIS design ([sis-sync-design.md](../sis-sync-design.md)) had two connector approaches (nightly file, API pull) and no named platform. Research on 2026-10-28: PowerSchool is assumed to be the most common US K-12 SIS, with Infinite Campus and Skyward next (public share figures are dated). PowerSchool and Infinite Campus both offer OneRoster, the vendor-neutral rostering standard, but OneRoster has no course requests: its classes and enrollments are scheduled sections, which exist only after the master schedule that requests feed. PowerSchool exposes requests through an installed plugin (OAuth client credentials) running a PowerQuery, or through a scheduled Data Export Manager file. Example: the registrar fixes Ethan Park's SCI301 request at 11am; with the API, "sync now" at 11:05 shows it; with the file, Ms. Lee sees it tomorrow.

Stephen (2026-10-28): "Let's build this to work with powerschool ... perhaps we could create a powerschool mock we could test against?", "Why not just build it to work with OneRoster?" and "In order to show that we can adapt to several different connections ... I'd add a second method to connect via a CSV file as well."

## Options

| Option | What happens (same example) | Tradeoffs |
|---|---|---|
| A. API: OneRoster for students and courses, PowerQuery for requests | Fix visible at 11:05 via "sync now" | Same-day sync; exercises auth, paging and rate limits (F8); write-back stays possible; requests piece is PowerSchool-specific |
| B. Data Export Manager file to SFTP | Fix visible next morning | Simplest; nightly only; auth and limits never exercised |
| C. Both | Either | Shows the seam best; about twice the build |

## Resolution

**A as the primary connection, plus a CSV file connection (so in effect C).** PowerSchool is the first target. Students and the catalog are read through OneRoster, so they work unchanged for any certified SIS; course requests come from one small PowerSchool-specific piece (a PowerQuery via our plugin), so a second SIS means writing only that piece. The adapter implements the built `ExportSource`. A PowerSchool mock (OAuth token, paged OneRoster students and courses, the request query, and switches for night 2, 401, 429 and a broken page) is what the adapter is tested against and what the sync demo can load import #2 from. A second adapter reads a CSV file drop (the shape of a Data Export Manager export) behind the same `ExportSource`, to show the app adapts to different connections without changing anything downstream (#35). Supersedes the design doc's earlier "file connector first" recommendation, which assumed many vendors.

## Impacts (all updated in the same change)

- [x] SIS design: `sis-sync-design.md` (3.1 recommendation, 3.3 PowerSchool mapping, MVP milestones)
- [x] Plan: issues #34 (2.8, PowerSchool mock and API adapter) and #35 (2.9, CSV file adapter), feeding #12
- [x] Decisions index row
