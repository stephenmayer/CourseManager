---
id: interview-feedback
title: What the Timely interviews tell us to do here
status: draft
owns: "feedback from the Timely interviews and how this project applies it"
updated: 2026-10-27
---

# What the Timely interviews tell us to do here

Sources (Stephen's career repo, `opportunities/timely/`): the CTO 1:1 with Faisal on 2026-10-26 (`2026-10-26-faisal-debrief.md`, `-granola-notes.md`, `-transcript.md`) and the earlier rejected-candidate feedback (`take-home-handoff.md`, "Update 2026-10-23"). Quotes are Faisal's, from the transcript.

## Feedback and what changes

| # | What we heard | What it means for this project | Where it lands |
| --- | --- | --- | --- |
| F1 | The take-home should be done "with the help of AI, but also demonstrating your own sort of thinking." A rejected candidate was marked down for "leveraging AI as a main reasoning." | Lead every deliverable with Stephen's decisions and trade-offs (the Q log), then a short "How AI was used and how the work was verified" section. Never "the AI suggested". | README outline (plan) |
| F2 | Timely's AI pain is code review volume: "who's gonna review all of this stuff?" | Show how the AI-built code was verified: tests per rule, the kit's self-review passes, one verify command. This speaks to their bottleneck directly. | README; build method already does it |
| F3 | Stephen ran out of time for the **milestones to an MVP** the prompt asked for. | The SIS design ends with milestones for a 2-3 engineer squad over one quarter, and names what is cut. The prototype README lists "what's next" the same way. | SIS design doc, README |
| F4 | Recovery over review: "we don't want necessarily them to have to review it, but it would be good for them to be able to recover if something bad happens." Errors must write nothing; a "successful" run that writes bad data must be recoverable. | Each SIS sync is a **run** with an ID; every change it makes is recorded against that run, so a bad sync can be rolled back. A failed sync writes nothing. No mandatory approval step before a sync applies. Fits Q2 (counselor edits are never overwritten) and Q5 (bad data is flagged, not dropped). | Proposed Q13; SIS design |
| F5 | Input data is "picky": bad inputs cause bad results or failures. | Validate at the boundary: Q5's checks run on every sync, and each sync run reports how many errors it brought in. Already the core of the prototype's checks. | SIS design; prototype checks |
| F6 | Solver output is technical logs nobody can read; plain-language errors are wanted. | Every check message is written for a counselor, in plain words naming the course and what to do ("SS303 isn't in this year's catalog. Remove it or pick another course."), never a code. | Screen designs (copy) |
| F7 | Timely's job pattern: jobs with states (submitted, started, completed, errored), an API to start, cancel and query; RabbitMQ; one worker; logs in Datadog; error reports in S3; MongoDB. | The SIS sync design reuses their own job pattern (a sync run is a job with those states), on their stack, instead of inventing one. That is the "generalize" point: one pattern for optimizer runs and SIS syncs. | SIS design |
| F8 | Fair sharing of scarce capacity (solver licenses; one school must not take all 10). Stephen named Kubernetes before asking about the limit. | Ask about limits before naming infrastructure. For the SIS design: SIS APIs are rate-limited per district, so syncs need per-district limits the same way. No new infrastructure unless a limit demands it. | SIS design requirements |
| F9 | Long answers; talk 60-90 seconds then check in. | README and design doc stay short; long material goes in linked files. The video is 5 minutes. | All write-ups |

## What does not change

The decisions so far already follow most of this: requirements first (gaps.md), simplest thing that works (Q8 SQLite, Q9 demo only if time), technology only for a stated need (Q7 scopes DuckDB), and concrete user value per decision.
