---
id: video-outline
title: SIS design video outline
status: draft
owns: "the timed outline and talking points for the 5-minute video on the SIS sync design"
updated: 2026-10-29
---

# SIS design video: outline (5 minutes)

Stephen records this; nothing here is sent anywhere. The script is about 650 words: four and a half minutes at 140 words a minute, leaving room to point at the screen. Every claim comes from the [SIS sync design](sis-sync-design.md); the **Source** line under each part says where. Read the script as a guide, not word for word.

| Time | Part | On screen |
| --- | --- | --- |
| 0:00 | The problem and who it's for (30s) | The design doc's opening paragraphs |
| 0:30 | Who owns what (45s) | Section 2, decision D1 |
| 1:15 | Sync as versioned runs on Timely's queue (75s) | [Infrastructure diagram](img/sis-infrastructure.png), then the [jobs board](design/boards/AddonJobs.dc.html) |
| 2:30 | Conflicts and what the counselor sees (60s) | The merge table in 3.6, then the [conflict board](design/boards/AddonSisConflict.dc.html) |
| 3:30 | What we need to learn first, and the MVP path (60s) | RQ1-RQ4 in section 1, then the milestones table in section 4 |
| 4:30 | Next, and the biggest gap (30s) | Section 3.10 |

## 0:00 The problem and who it's for

Every spring, a counselor builds next year's course requests for every student on their caseload, and those requests feed the master schedule. Students, the catalog and often draft requests come from the district's SIS. This design keeps that data current every night without losing counselor work, lets bad data in without breaking anything, and recovers from a bad sync. It's written for the engineers who'd build it and the product partner who'd pilot it.

**Source:** opening paragraphs; [requirements §1](requirements/requirements.md#1-the-problem-as-i-understand-it).

## 0:30 Who owns what, and why that one split drives the design

The SIS owns students and the catalog; they are read-only in the app. Requests can start in the SIS, but counselors edit them in the app. So when the SIS and a counselor disagree, we keep the counselor's edit and flag the SIS difference for them to accept or dismiss. Requests nobody touched keep updating from the SIS. That one rule decides how we store imports, how we merge them and how we roll back: it's one mechanism seen from three sides.

**Source:** D1 ([Q2](decisions/q002-request-ownership.md)); "D1, D3 and D5 are one mechanism" (section 2).

## 1:15 The sync as versioned runs on Timely's queue

Each sync is a job on Timely's existing RabbitMQ queue, with the states the optimizer already uses: submitted, started, completed, errored. No new workflow engine. A per-district connector fetches the export. PowerSchool comes first: OneRoster for students and courses, and a PowerQuery in our plugin for requests, because OneRoster has no course requests. A CSV file connector sits behind the same interface.

Each export becomes an immutable, versioned import, a full copy kept for the school year. A run applies in one transaction. If anything fails, it writes nothing and yesterday's data stays current. If a run succeeds but the data is wrong, say every grade 11 student became grade 12, there's still no approval step. It applies, support is alerted because the change count is far above normal, and support restores to any kept import in one action, skipping requests counselors have edited since. Every run shows on a jobs view and in Datadog, and an errored run leaves a plain-language report in S3.

**Source:** 3.1 ([Q22](decisions/q022-powerschool-first.md)), 3.5, 3.7 ([Q24](decisions/q024-restore-to-kept-import.md)), 3.9; D4 ([Q23](decisions/q023-full-snapshots-school-year.md)), D5 ([Q13](decisions/q013-sis-sync-runs.md)), D6 ([Q14](decisions/q014-sis-sync-on-queue.md)); open question 1 ([Q25](decisions/q025-abnormal-runs-apply-and-alert.md)); versioned imports ([Q18](decisions/q018-sis-import-versioning.md)).

## 2:30 Conflicts: one-way baseline, three-way merge

We assume one-way sync. The only documented SIS write we found is the gradebook push. And even where a SIS accepts writes, write-back doesn't remove the merge: the SIS can change between a write-back and the next import, and write-backs fail. So every import is merged three ways: what the SIS said last time, what the app has now, and what the SIS says now.

Example. Monday, the SIS has Jordan's elective as AT201. Tuesday, Ms. Lee changes it to AT202. Wednesday, the SIS still says AT201. Only the counselor changed it, so AT202 stays and there's no flag. If Wednesday's import had said AT203, both sides changed: AT202 still stays, and Ms. Lee sees "the SIS has a different value" on that request, to accept or dismiss.

**Source:** D2 ([Q19](decisions/q019-one-way-sync-baseline.md)), 3.1 platform notes, 3.6 and its worked example, 3.8.

## 3:30 What we need to learn first, and the MVP path

Before committing, we ask the pilot districts four things. Does the SIS accept writes to requests? Does it send a stable ID for each request? Without one, a course change looks like a removal plus an addition. What are its rate limits? And how fast do enrollment and grade changes reach it?

The MVP is a squad of two or three engineers over one quarter. Weeks one and two: answer those questions and pick the first connector. Weeks three to six: one-way PowerSchool sync, nightly and on demand, where a broken export leaves yesterday's data in place. Weeks seven to nine: conflict review for counselors, restore, the jobs view and alerts. Weeks ten to twelve: a second district side by side, per-district throttling, and the CSV connector. Week thirteen is buffer and pilot review.

**Source:** section 1, RQ1-RQ4; section 4 milestones and risks.

## 4:30 What I'd do next, and the biggest gap

The biggest gap is student history. Without transcripts, the app can't check graduation progress or prerequisites, so today's core-subject check is a stated stand-in. The design adds transcripts as one more read-only feed from the SIS, and graduation progress as one more check over it. After the MVP, write-back is the first thing I'd add back, then provisional students, then transcripts.

**Source:** 3.10 ([Q15](decisions/q015-history-and-grad-rules.md)); section 4, "Cut from the MVP"; [README §6](../README.md#6-known-gaps-left-on-purpose).

## Still open, so say it as an assumption

- Who may roll back a run (RQ11): assumed district admins and Timely support.
- Timely's team sets up each connection ([Q26](decisions/q026-connection-setup-by-timely.md)): still to confirm with Timely.
- Whether an unresolved SIS conflict blocks Done: default yes, not decided (section 5).
