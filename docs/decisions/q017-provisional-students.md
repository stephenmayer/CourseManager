---
id: q017-provisional-students
title: Students missing from the SIS (late transfers) get a provisional record, designed as an add-on
status: current
decided: 2026-10-27, by Stephen
---

<a id="q017"></a>
# Q17: How do we handle students missing from the SIS, like late transfers?

## Context

Stephen (2026-10-27): there's no way to plan for a student "missing" from the SIS import, such as a last-minute transfer who wasn't here last season. Students are SIS-owned and read-only (a project non-negotiable), so today such a student has no record until the registrar enrolls them and a sync runs.

## Options

| Option | Tradeoffs |
|---|---|
| A. Design as an add-on, don't build | Shows the gap and a safe fix; read-only rule intact in the prototype; no build cost |
| B. Build provisional students | Usable now; relaxes the read-only rule; build time |
| C. SIS only: enroll, then sync | No app change; counselor waits on the registrar; needs an on-demand sync |

## Resolution

**A.** Designed, not built. The planned add-on:

- A counselor adds a **provisional student** (name, incoming grade, previous school, note), clearly marked "Not in SIS yet", and builds requests as usual. It is the one student record the app owns, and only until the SIS sends the real one.
- When a sync brings in a new SIS student, possible matches (same name and grade) are shown to the counselor to **confirm**; nothing auto-merges, so two different students are never joined. On confirm, the requests move to the SIS student, keep `source = app` (Q2), and the provisional record is closed.
- Provisional students the SIS still hasn't sent after a set time are flagged on the sync jobs view (Q14).
- Option C's on-demand sync stays useful alongside this and goes in the SIS design.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/gaps.md` (G33)
- [x] Design: `design/README.md` add-on row, `AddonProvisional.dc.html` board
- [x] SIS sync design doc: [sis-sync-design.md](../sis-sync-design.md)
- [x] Decisions index row
