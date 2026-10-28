---
id: q014-sis-sync-on-queue
title: SIS sync runs as jobs on a message queue, with a jobs view to monitor them
status: current
decided: 2026-10-27, by Stephen
---

<a id="q014"></a>
# Q14: How do SIS sync runs execute, and how does staff see what is running?

## Context

Stephen (2026-10-27): "the SIS sync should run on RabbitMQ (or a similar message queue system) ... so that you can monitor all of the tasks and processes that are running in the background." Timely already runs its optimizer jobs on RabbitMQ with one worker, job states (submitted, started, completed, errored), an API to start, cancel and query, logs in Datadog and error reports in S3 ([interview-feedback.md](../requirements/interview-feedback.md) F7). [Q13](q013-sis-sync-runs.md) made each sync a run with those states.

## Options

| Option | Tradeoffs |
|---|---|
| A. Jobs on RabbitMQ (Timely's queue) with a jobs view | Reuses what Timely runs and monitors today; retries, cancel and backpressure come with it; one more moving part than a cron script |
| B. Scheduled script (cron) per district | Simplest; no visibility into what is running, no cancel, retries by hand |
| C. A new workflow engine (Airflow, Temporal) | Rich monitoring; new infrastructure Timely does not run (F8: no new infrastructure unless a limit demands it) |

## Resolution

**A.** In the SIS design, each sync run is a job published to RabbitMQ (or the queue Timely already runs) and picked up by a worker, using Timely's job states and start / cancel / query API. A jobs view lists every background job with its district, state, start time, elapsed time, changes applied and error count, with cancel and (for completed sync runs) roll back from Q13. Per-district limits (F8) are enforced when jobs are taken off the queue, not by adding infrastructure.

Prototype (assumption, tell Stephen): the localhost prototype does not run RabbitMQ. If the sync demo happens ([Q9](q009-sis-sync-demo.md)), it runs the same job states in-process behind a small queue interface, so swapping in RabbitMQ touches one adapter. The jobs view is drawn in the SIS design doc, not built in the prototype.

## Impacts (all updated in the same change)

- [x] Requirements: `requirements/interview-feedback.md` (F7, F8)
- [x] Architecture: `architecture/overview.md` (sync seam)
- [x] SIS sync design doc: [sis-sync-design.md](../sis-sync-design.md)
- [x] Decisions index row
