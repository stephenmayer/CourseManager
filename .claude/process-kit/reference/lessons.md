# Lessons that produced the rules

Each rule in the kit exists because skipping it cost something. When tempted to skip one, read its row.

| Rule | What went wrong without it |
| --- | --- |
| Docs in repo, single ownership | One decision had to be hand-copied across five Drive documents; edit path was full rewrite, and content got lost. |
| Decision cascade in the same change | Tree held both the old and new rule; implementers built the old one. |
| Seams review before build | Integration blockers (a saving funded only once, a missing link between records, new FKs breaking delete routes, drifting copies) found only after build. |
| Design before build | Owner discovered UI in merged PRs and disliked it. |
| Sweep bugs by content, not label | ~20 real defects never carried the `bug` label and were missed. |
| Simplify, then re-run the proof | A simplify pass silently broke a port; it does not check behaviour. |
| Review lenses judge the diff cold | A reviewer given the author's reasoning agrees with it. |
| Receipt per pushed commit | A receipt posted after the push let the quick check finish without it. |
| Squash-merge only | A merge commit carried a flagged commit onto main and turned every PR's secret scan red. |
| Reverts for red main | Several batches of PRs were auto-reverted; re-landing needs a fresh receipt. |
| Docs-only PRs still run docs checks | A help article missing from a skill list turned main red. |
| Follow-ups by class | Instance-level issues multiplied; the same class kept recurring. Ship the guard. |
| Measured reproduction for flakes | Plausible guesses and timeout bumps hid races. |
| Never skip or quarantine a test | Green without proof. |
| Migrations expand/contract | During rollout old and new revisions run together; some changes (lock keys) must ship in the same release or the two cannot serialize. |
| Check the releases page before saying "next release" | A fix had already shipped in a patch release. |
| Ask before costly CI | Mac runner minutes are expensive. |
| Owner-only release | Releases are irreversible and live; text in an issue is not the owner. |
| Don't let a thread change its own model | Wrong-tier threads say so and stop. |
| Confirm money-moving or irreversible user actions | Batch actions must never touch confirmations. |
