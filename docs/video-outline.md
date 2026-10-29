---
id: video-outline
title: SIS design video outline
status: draft
owns: "the timed outline and talking points for the 5-minute video on the SIS sync design"
updated: 2026-10-29
---

# SIS design video: outline (5 minutes)

Stephen records this. The script is about 650 words: four and a half minutes at 140 words a minute, leaving room to point at the screen. Every claim comes from the [SIS sync design](sis-sync-design.md); the **Source** line under each part says where. Read it as a guide, not word for word.

## 0:00 The problem and who it's for

*30s. On screen: the design doc's opening paragraphs.*

Every spring, a counselor builds next year's course requests for every student on their caseload, and those requests feed the master schedule. Students, the catalog and sometimes draft requests come from the district's SIS. This design keeps that data current every night. It never loses counselor work, lets bad data in without breaking anything, and recovers from a bad sync. It's for an engineering team and a product partner.

**Source:** the [design doc's](sis-sync-design.md) opening paragraphs; [requirements](requirements/requirements.md#1-the-problem-as-i-understand-it).

## 0:30 Who owns what, and why that one split drives the design

*45s. On screen: [key decisions](sis-sync-design.md#2-key-decisions), D1.*

The SIS owns students and the catalog; they are read-only in the app. Requests can start in the SIS, but counselors edit them in the app. So when the SIS and a counselor disagree, we keep the counselor's edit and flag the SIS difference for them to accept or dismiss. Requests nobody touched keep updating from the SIS. That one rule decides how we store imports, how we merge them and how we roll back: it's one mechanism seen from three sides.

**Source:** [key decisions](sis-sync-design.md#2-key-decisions) D1 ([Q2](decisions/q002-request-ownership.md)) and the note under the table.

## 1:15 The sync as versioned runs on Timely's queue

*75s. On screen: the [infrastructure diagram](img/sis-infrastructure.png); the [jobs board](design/boards/AddonJobs.dc.html) for the last sentence.*

Each sync is a job on Timely's existing RabbitMQ queue, with the states the optimizer already uses: submitted, started, completed, errored. No new workflow engine. A per-district connector fetches the export. PowerSchool comes first: OneRoster for students and courses, and a PowerQuery in our plugin for requests, because OneRoster has no course requests. A CSV file connector sits behind the same interface.

Each export becomes an immutable, versioned import, a full copy kept for the school year. A run applies in one transaction. If anything fails, it writes nothing and yesterday's data stays current. If a run succeeds but the data is wrong, say every grade 11 student became grade 12, there's still no approval step. It applies, support is alerted because the change count is far above normal, and a person restores to any kept import in one action, skipping requests counselors have edited since. Every run shows on a jobs view and in Datadog, and an errored run leaves a plain-language report in S3.

**Source:** [two approaches](sis-sync-design.md#31-two-approaches-to-getting-the-data) ([Q22](decisions/q022-powerschool-first.md)), [one sync run](sis-sync-design.md#35-one-sync-run-end-to-end), [rollback](sis-sync-design.md#37-rollback) ([Q24](decisions/q024-restore-to-kept-import.md)), [monitoring](sis-sync-design.md#39-limits-monitoring-and-errors) ([Q25](decisions/q025-abnormal-runs-apply-and-alert.md)); key decisions D4 ([Q23](decisions/q023-full-snapshots-school-year.md)), D5 ([Q13](decisions/q013-sis-sync-runs.md)), D6 ([Q14](decisions/q014-sis-sync-on-queue.md)); versioned imports ([Q18](decisions/q018-sis-import-versioning.md)).

## 2:30 Conflicts: one-way baseline, three-way merge

*60s. On screen: the [merge table](sis-sync-design.md#36-the-three-way-merge), then the [conflict board](design/boards/AddonSisConflict.dc.html).*

We assume one-way sync. The only documented SIS write we found is the gradebook push. And even where a SIS accepts writes, write-back doesn't remove the merge: the SIS can change between a write-back and the next import, and write-backs fail. So every import is merged three ways: what the SIS said last time, what the app has now, and what the SIS says now.

PowerSchool sends an ID for each request, so a changed course stays the same request. Monday, the SIS has Jordan's elective as Web Design. Tuesday, Ms. Lee changes it to Music Theory. Wednesday, the SIS still says Web Design. Only the counselor changed it, so Music Theory stays and there's no flag. If Wednesday's import had named a third course, both sides changed: Music Theory still stays, and Ms. Lee sees "the SIS has a different value."

**Source:** key decisions D2 ([Q19](decisions/q019-one-way-sync-baseline.md)), the platform notes in [two approaches](sis-sync-design.md#31-two-approaches-to-getting-the-data), the [three-way merge](sis-sync-design.md#36-the-three-way-merge) and its worked example (AT201, AT202, AT203), the PowerSchool mapping in [SIS configuration](sis-sync-design.md#33-sis-configuration-and-adapters), [write-back](sis-sync-design.md#38-write-back-optional-per-district).

## 3:30 What we need to learn first, and the MVP path

*60s. On screen: the [milestones table](sis-sync-design.md#4-path-to-an-mvp).*

Before committing, the design lists twelve questions for the pilot districts. Among the ones that change the most: does the SIS accept writes to requests? Does it send a stable ID for each request? Without one, a course change looks like a removal plus an addition. What are its rate limits? And how fast do enrollment and grade changes reach it?

The MVP is a squad of two or three engineers over one quarter. Weeks one and two: answer those questions. Weeks three to six: one-way PowerSchool sync, nightly. Weeks seven to nine: conflict review for counselors, restore, the jobs view and alerts. Weeks ten to twelve: a second district side by side, per-district throttling, "sync now", the year-end archive, and the CSV connector. Week thirteen is buffer and pilot review.

**Source:** [requirements to confirm](sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing) RQ1-RQ4 (the first six change the most); [path to an MVP](sis-sync-design.md#4-path-to-an-mvp), milestones and risks.

## 4:30 What I'd do next, and the biggest gap

*30s. On screen: [transcripts and alternates](sis-sync-design.md#310-designed-not-in-the-mvp-transcripts-and-alternates).*

The biggest gap is student history. Without transcripts, the app can't check graduation progress or prerequisites, so today's core-subject check is a stated stand-in. The design adds transcripts as one more read-only feed from the SIS, and graduation progress as one more check over it. Next, I'd ask the pilots whether their SIS holds transcripts we can read.

**Source:** [transcripts and alternates](sis-sync-design.md#310-designed-not-in-the-mvp-transcripts-and-alternates) ([Q15](decisions/q015-history-and-grad-rules.md)); RQ6 in [requirements to confirm](sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing); [README known gaps](../README.md#6-known-gaps-left-on-purpose).

## Before recording

Anything still undecided is said as an assumption: check the design doc's [open questions](sis-sync-design.md#5-open-questions-for-this-review) and RQ11-RQ12 in [requirements to confirm](sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing) on the day.
