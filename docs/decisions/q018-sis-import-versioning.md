---
id: q018-sis-import-versioning
title: SIS imports are versioned snapshots; requests reconcile three ways; schema now, compare logic if time
status: current
decided: 2026-10-28, by Stephen
---

<a id="q018"></a>
# Q18: How do multiple SIS imports of the same data relate to the app's requests?

## Context

Stephen (2026-10-28): "we should have a versioning concept where the data is linked to the latest version of the sis import ... is there a good way to manage multiple SIS imports of the same data against the locally maintained request schema?" Q2 says edited requests are kept and SIS differences flagged; Q13 says each sync is a run that can be rolled back. Neither says how the app knows *who* changed a request since the last import. Without the SIS's previous values, "the SIS says X, the app says Y" can't tell a new SIS correction from a counselor edit.

## Options (how much goes in the prototype)

| Option | Tradeoffs |
|---|---|
| A. Schema now, compare logic if time | Data model is honest from day one; little cost; the demo can be added later without a migration |
| B. Build it fully | Demo of compare, flags and rollback; a big share of the 2h budget |
| C. SIS design doc only | No prototype cost; the schema would need reworking to add it |

## Resolution

**A.** The pattern:

1. **Each SIS import is an immutable snapshot** with an ID (`sis_import`, the same thing as a Q13 sync run). Students, courses and SIS requests are stored per import; one import is marked current. Old imports never change, so "what did the SIS say on Oct 26?" is answerable, and rolling back SIS-owned data moves the current pointer.
2. **Each request remembers its base:** a stable `sis_key` to its SIS counterpart (the SIS's own request ID if it sends one; otherwise student + course + an occurrence counter for duplicates), and the import it last agreed with (`base_import_id`); the SIS values at that point are read from that import's snapshot, so they aren't copied onto the request.
3. **A new import reconciles three ways** (base SIS, app, new SIS): SIS changed and app didn't, apply; app changed and SIS didn't, keep; both changed, flag and never overwrite (Q2); new in SIS, add; gone from SIS, remove if untouched, flag if edited.

Prototype: the seed loads as import #1 and the schema carries every field. The three-way compare, a second "import #2" seed and rollback are built only if the sync demo happens (Q9). DuckDB (Q7) does the snapshot-to-snapshot diff. Keep the last N imports (N to set; trivial at 10 students), never pruning an import a request still uses as its base.

Key choice (revised 2026-10-28 with Stephen): type is not part of the key, so a priority-to-elective change in the SIS is a type change on the same request. Trade-off accepted: duplicate rows (already errors, Q5) are told apart by order, so they may swap keys if the SIS reorders them. Each import's internal version ID is `sis_import.id`.

## Impacts (all updated in the same change)

- [x] Architecture: `architecture/schema.md` (tables, diagram), `architecture/overview.md`
- [x] Decisions: Q13 (a sync run is an `sis_import`)
- [ ] SIS sync design doc: not written yet; it must describe the snapshot and three-way reconcile
- [x] Decisions index row
