# 5-minute video outline: SIS sync design

A draft for Stephen to rework in his own words. The timings add up to about 5 minutes.

**0:00–0:30 · Framing**
- "Students and the catalog flow one way from the SIS. Course requests have two writers, the SIS
  and counselors. That's the hard part, and most of this design is about it."

**0:30–1:30 · What I'd need to know first** (doc section 1)
- Which vendors and interfaces (API vs CSV), and whether the SIS holds requests during request season.
- Is write-back required, and when?
- How fresh the data needs to be, plus volume in Jan to Mar.
- Stable IDs, lifecycle events, data quality. Show S008's bad code from the prototype as proof
  that bad data is real.

**1:30–3:00 · Key decisions** (section 2, pick 4)
- D2, the provenance-based merge: untouched requests follow the SIS, edited requests are protected,
  and conflicts go to a review queue. Show the "From SIS / Added in app" chips in the prototype.
- D4, stage, validate, diff: block mass-change surprises.
- D1, write back on finalize: "Complete" is the trigger.
- D7, vendor adapters into one canonical model, with CSV first.

**3:00–4:15 · Architecture** (section 3)
- Walk through the Approach A diagram from left to right.
- Approach B swaps the trigger, not the core. Same adapters, merge rules, and outbox.
- "Which one we pick depends on..." (the assumptions table).

**4:15–5:00 · Risks and what I want from the discussion**
- Mass-change threshold, review-queue volume in peak season, write-back failures.
- The LLM's role: suggest fixes for bad data, never decide merges.
- Ask the team: "What does the SIS data actually look like at our pilot schools?"
