---
id: video-outline
title: SIS design video outline
status: draft
owns: "the timed outline and talking points for the 5-minute video on the SIS sync design"
updated: 2026-10-29
---

# SIS design video: outline (5 minutes)

Stephen records this. The exercise asks for "a quick 5 min video to give folks an overview of your approach and key decisions", so the parts follow its three headings: requirements, key decisions, and flow and architecture. The script is about 685 words: just under five minutes at 140 words a minute. Every claim comes from the [SIS sync design](sis-sync-design.md); the **Source** line under each part says where. Read it as a guide, not word for word.

## 0:00 The problem

*25s. On screen: the design doc's opening paragraphs.*

Every spring, counselors build next year's course requests for each student, and those requests feed the master schedule. Students and the catalog come from the district's SIS and are read-only; requests can come from the SIS too, and counselors edit them in the app. The sync has to keep that data current without ever losing counselor work.

**Source:** the [design doc's](sis-sync-design.md) opening paragraphs; [requirements](requirements/requirements.md#1-the-problem-as-i-understand-it).

## 0:25 Requirements: what we'd need to know first

*45s. On screen: [requirements to confirm](sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing).*

Before committing, I'd ask the pilot districts twelve questions. Six change the design most. Does the SIS accept writes to requests? That sets how many conflicts counselors see. Does it send a stable ID per request? Without one, a changed course looks like a removal plus an addition. What are its rate limits, and how fast do changes reach it? Those set how often we sync. How dirty is the data, and who fixes it today? That sets how loud errors must be. And can we read transcripts? That unlocks graduation checks. Until we know, we assume no request IDs and nightly plus "sync now".

**Source:** [requirements to confirm](sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing) RQ1-RQ6, the six that change the design most.

## 1:10 Key decisions

*50s. On screen: [key decisions](sis-sync-design.md#2-key-decisions).*

Six decisions carry the design. One: when the SIS and a counselor disagree, keep the counselor's edit and flag the difference. Two: assume one-way sync; write-back is an optional job per district, because it never removes the need to merge. Three: every import is an immutable, versioned snapshot, and requests merge three ways against it. Four: a sync is a run that applies in one transaction and can be rolled back in one action, with no approval step. Five: runs are jobs on Timely's existing RabbitMQ queue, with the optimizer's job states. Six: bad SIS data loads as it is, shows as an error, and blocks only Done. The first three are one mechanism seen from three sides.

**Source:** [key decisions](sis-sync-design.md#2-key-decisions) D1 ([Q2](decisions/q002-request-ownership.md)), D2 ([Q19](decisions/q019-one-way-sync-baseline.md)), D3 ([Q18](decisions/q018-sis-import-versioning.md)), D5 ([Q13](decisions/q013-sis-sync-runs.md)), D6 ([Q14](decisions/q014-sis-sync-on-queue.md)), D7 ([Q5](decisions/q005-bad-sis-request-data.md)); the note under the table.

## 2:00 Flow and architecture: two approaches, components, one run

*100s. On screen: [two approaches](sis-sync-design.md#31-two-approaches-to-getting-the-data), the [infrastructure diagram](img/sis-infrastructure.png), [one sync run](sis-sync-design.md#35-one-sync-run-end-to-end), the [data model](architecture/schema.md), then the [three ports](sis-sync-design.md#32-components).*

There are two ways to get the data: a nightly file the SIS drops on SFTP, or pulling from the SIS's API. Both run as the same job and feed the same merge; only the connector differs. We start with PowerSchool's API: OneRoster for students and courses, and a PowerQuery in our plugin for requests. A CSV connector sits behind the same interface.

Apart from a scheduler entry, a secrets entry and our plugin, this is infrastructure Timely already runs. One sync per district at a time, throttled to its rate limit.

One run: the job waits until its district has no other sync running. The worker fetches the export, archives it to S3, then normalizes and validates it. In one transaction it writes the snapshot, merges requests and records every change with its old value. Any failure rolls back. If a run succeeds but is wrong, support is alerted, and those old values make restoring one action.

Each import is a full copy keyed by its import ID, kept for the school year. Every request remembers its SIS key and the import it last agreed with, which is what makes the three-way merge possible.

Three narrow interfaces. ExportSource fetches and normalizes one district's export; SisSource gives the app only the current import; SisWriter is write-back, not in the MVP. A new district on a SIS we support is configuration only.

**Source:** [two approaches](sis-sync-design.md#31-two-approaches-to-getting-the-data) ([Q22](decisions/q022-powerschool-first.md)); [components](sis-sync-design.md#32-components) and its ports table; [SIS configuration](sis-sync-design.md#33-sis-configuration-and-adapters); [one sync run](sis-sync-design.md#35-one-sync-run-end-to-end); [rollback](sis-sync-design.md#37-rollback) ([Q24](decisions/q024-restore-to-kept-import.md)); [monitoring](sis-sync-design.md#39-limits-monitoring-and-errors) ([Q25](decisions/q025-abnormal-runs-apply-and-alert.md)); key decision D4 ([Q23](decisions/q023-full-snapshots-school-year.md)); [schema](architecture/schema.md).

## 3:40 The three-way merge: what the counselor sees

*40s. On screen: the [merge table](sis-sync-design.md#36-the-three-way-merge), then the [conflict board](design/boards/AddonSisConflict.dc.html).*

Each import compares three values: what the SIS said last time, what the app has now, and what the SIS says now. PowerSchool sends an ID per request, so a changed course stays the same request. Monday, the SIS has Jordan's elective as Web Design. Tuesday, Ms. Lee changes it to Music Theory. Wednesday, the SIS still says Web Design. Only the counselor changed it, so Music Theory stays, no flag. If Wednesday had named a third course, both sides changed: Music Theory still stays, and Ms. Lee sees "the SIS has a different value."

**Source:** the [three-way merge](sis-sync-design.md#36-the-three-way-merge) and its worked example (AT201, AT202, AT203); the PowerSchool mapping in [SIS configuration](sis-sync-design.md#33-sis-configuration-and-adapters).

## 4:20 The path to an MVP, and the biggest gap

*35s. On screen: the [milestones table](sis-sync-design.md#4-path-to-an-mvp).*

The MVP takes about eight weeks, and the calendar sets the pace, not the code. With AI agents, each milestone's build takes days. What takes weeks is answers and access from the pilot districts, Timely's security review, and enough nightly runs on real data to trust them.

The biggest gap is student history: without transcripts, we can't check graduation progress or prerequisites. So the pilots' answer to whether their SIS holds transcripts we can read decides what comes next.

**Source:** [path to an MVP](sis-sync-design.md#4-path-to-an-mvp); [transcripts and alternates](sis-sync-design.md#310-designed-not-in-the-mvp-transcripts-and-alternates) ([Q15](decisions/q015-history-and-grad-rules.md)); RQ6 in [requirements to confirm](sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing).

## Before recording

Anything still undecided is said as an assumption: check the design doc's [open questions](sis-sync-design.md#5-open-questions-for-this-review) and RQ11-RQ12 in [requirements to confirm](sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing) on the day. A slide deck that follows these parts, with this script as speaker notes, is linked from PR #37.
