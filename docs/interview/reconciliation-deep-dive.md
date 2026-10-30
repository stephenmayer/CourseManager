---
id: reconciliation-deep-dive
title: Reconciliation deep dive
status: draft
owns: "the hard cases of reconciling SIS imports with counselor edits, how I'd test the merge, and what I'd ask Timely; the merge rules themselves stay in sis-sync-design §3.6"
updated: 2026-10-30
---

# Reconciliation deep dive

The merge rules are in [SIS sync design §3.6](../sis-sync-design.md#36-the-three-way-merge). This page is about where they get hard. Anything marked "proposal" is new and not yet a logged decision.

## The problem

The SIS and a counselor both change the same course requests. The sync should apply what the SIS changed, keep what the counselor changed, and flag a request only when both changed the same thing.

Comparing the SIS with the app isn't enough. If the SIS says AT201 and the app says AT202, you can't tell whether the counselor made the change or the SIS corrected itself. You also need what the SIS said the last time the two agreed:

![Each request remembers the SIS version it last agreed with](img/request-base.png)

![The merge: compare three values, never overwrite a counselor](img/three-way-merge.png)

## Five places it gets hard

### 1. Identity: which row is which

The merge pairs each new SIS row with an old one by `sis_key`. If the pairing is wrong, everything after it is wrong. With a SIS request ID the pairing is exact. Without one, a course change looks like one request removed and another added ([RQ2](../sis-sync-design.md#1-requirements-what-we-need-to-know-before-committing)). Nothing is lost, but the counselor sees a confusing pair.

**Proposal:** when a run removes one request and adds another for the same student, link the two in the flag ("the SIS may have replaced AT201 with AT203"), and never match them automatically. Track the rate of remove-plus-add per district. A high rate points to unstable keys, which is a setup problem to fix, not something counselors should absorb.

### 2. Granularity: field by field

**Proposal:** merge each field separately. If the SIS changes a request's type while the counselor adds a reason, both changes apply and there's no flag. Only the same field changed on both sides raises a flag. Reasons and review status exist only in the app, so the SIS can never conflict with them.

### 3. Deletes

A counselor's removal is a soft delete ([schema](../architecture/schema.md#3-app-owned-tables)), so the merge can still see it. Two cases that §3.6 doesn't cover:

| SIS | Counselor | Result |
| --- | --- | --- |
| Still sends it, unchanged | Removed it | It stays removed |
| Changed it | Removed it | It stays removed, with a flag: "the SIS updated a request you removed" |

The first row matters most. Without it, counselors would remove the same request every morning.

### 4. Timing

- Only one sync runs per district at a time ([§3.9](../sis-sync-design.md#39-limits-monitoring-and-errors)), so merges never race each other.
- **Proposal:** the merge checks each request's `updated_at` before it writes. If a counselor saved during the run, the merge leaves that request alone and the next run picks it up. The counselor always wins, at the cost of a one-day delay for that request.
- A restore skips any request edited after the run it undoes ([Q24](../decisions/q024-restore-to-kept-import.md)). Write-back makes conflicts rarer, but it doesn't replace the merge ([Q19](../decisions/q019-one-way-sync-baseline.md)).

### 5. Changes the merge doesn't see

**Open question:** if a sync adds errors to a Done student (because their grade changed or a course was dropped), should the student reopen? Today only a counselor's edit reopens a Done student ([Q3](../decisions/q003-student-review-status.md)). My leaning: keep them Done, but list them under "need attention" with the reason "the SIS changed".

## Keeping flags rare

Every flag costs a counselor time, so I'd measure the flags as well as the sync. These are proposals, and I don't have numbers for any of them yet:

- **Flags per run, per district.** A sudden jump means a bad export or a mapping change. It should feed the "far above normal" alert ([Q25](../decisions/q025-abnormal-runs-apply-and-alert.md)).
- **How flags get resolved.** If counselors nearly always take the SIS's value, the SIS is fixing real mistakes, and write-back or an earlier sync would prevent those flags.
- **What the flag shows.** All three values and two buttons. Either button moves the base to the current import, so the same difference never comes back.

## How I'd show it works

1. **Table tests.** Each row of §3.6, plus the delete rows above, is one test case.
2. **Property tests.** Generate random sequences of imports and counselor edits, then check after every step that:
   - no counselor value is ever overwritten;
   - requests added in the app are never touched;
   - the same import merged twice changes nothing ([Q27](../decisions/q027-zero-change-imports.md));
   - restoring to import N gives back N's SIS values.
3. **Replay before release.** Raw exports are kept in S3 ([§3.4](../sis-sync-design.md#34-versioned-sis-data-telling-one-import-from-the-next)). Run a pilot district's season through the old and new merge code in a dry run, and explain every difference.

The prototype has the schema for this. The merge itself is issue #12 and isn't built yet.

## What I'd ask Timely

- When a registrar changes a request's course in PowerSchool, is that the same record or a new one? (This decides problem 1.)
- How often do registrars change requests that counselors have already worked on? (This sets how many flags to expect.)
- Who should resolve a flag: the counselor, or the registrar who made the change?
- Do requests lock on a date for the optimizer? If so, SIS changes after that date could go to a registrar instead of being merged.

## What I'd leave out

Automatic conflict resolution beyond the table, including "latest edit wins". A flag that someone resolves in two clicks costs less than a wrong automatic decision in the middle of a planning meeting.
