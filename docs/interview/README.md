---
id: interview-index
title: Next interview round
status: draft
owns: "the index of prep material for the next Timely round, and which original diagram each simplified one stands in for"
updated: 2026-10-30
---

# Next interview round

Timely's feedback on the take-home: the diagrams were noisy, and they'd have liked more depth on reconciliation. This folder answers both. The original diagrams stay where they are; nothing here changes a decision.

| File | Owns |
| --- | --- |
| [reconciliation-deep-dive.md](reconciliation-deep-dive.md) | The hard cases of reconciling SIS imports with counselor edits, how I'd test the merge, and what I'd ask Timely |

## One idea per diagram

Each diagram has a title that states its one idea, five boxes or fewer, and no numbered wires. The SVG is the source; the PNG is for slides.

| Diagram | Its one idea | Stands in for |
| --- | --- | --- |
| [sync-run](img/sync-run.png) | The SIS's data becomes a new version, then merges into counselor work | [Infrastructure](../img/sis-infrastructure.png) (18 boxes, 16 numbered wires) |
| [who-writes-what](img/who-writes-what.png) | Staff never edit SIS data; the sync never overwrites staff edits | [Software architecture](../img/sis-software.png) |
| [request-base](img/request-base.png) | Each request remembers the SIS version it last agreed with | [Schema ER diagram](../architecture/schema.md) |
| [three-way-merge](img/three-way-merge.png) | Compare three values, never overwrite a counselor | The [§3.6 table](../sis-sync-design.md#36-the-three-way-merge) |
| [app-flow](img/app-flow.png) | Every edit re-runs the checks, and errors block Done | [App flow](../architecture/app-flow.md) |
| [site-map](img/site-map.png) | Three screens and a dialog; every path ends on a student | [Site map](../design/site-map.md) |
| [planning-meeting](img/planning-meeting.png) | A planning meeting in four steps on one screen | [Planning meeting flow](../scenarios/planning-meeting.md) |

The detailed diagrams are still the reference when someone asks "where does the secret live?" or "which table holds that?". The simple ones are what I'd show first.
