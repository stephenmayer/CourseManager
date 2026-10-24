---
name: design-before-build
description: >
  Show the owner the design of any visible UI change (artboards or screenshots,
  light and dark) and wait for approval before implementing, bug fixes
  included. Use before building or changing any screen, dialog, copy or layout,
  and for marketing/website work (design review, artwork, plan, acceptance, then
  build).
---

# Design before build

The owner's words: "I prefer to see the design before you begin to implement." Applies to every visible change, including small bug fixes.

## Procedure

1. **Do the seams review first** (`plan-and-seams`). Designs are drawn against the real constraints it finds (roles, empty/error states, long text, small screens).
2. **Produce the design.** Artboards (static HTML rendered to PNG work well), or screenshots of a prototype. Always **light and dark**. Cover: the happy path, empty, loading, error/rejected, long content, the smallest supported width, viewer/read-only state, and every piece of new copy.
3. **Post it with the plan.** Attach the images; state what changes, what does not, and any open look-and-feel choice as one decision card with a recommended option.
4. **Wait for OK.** No build, no push. An artboard approved long ago is shown again if the screen around it has changed since.
5. **Build to the approved design.** Artboards are spec for copy, states, touch targets and numbers. Design vs issue conflict: stop and raise it. A design choice with no recorded owner answer uses the documented default; build it and say so in the PR, never silently pick the alternative.
6. **Prove it in the PR.** Run the project's UI verification, look at every screenshot against the artboard, and add a "UI verification" section to the PR.
7. **Archive.** Copy approved boards into the repo's design folder and record the decision in the design notes.

## Marketing and content work

Order is fixed: design review, proposed artwork, proposal / implementation plan, owner acceptance, then build. Do not jump to plan or code before the artwork is accepted. Claims on public pages link back to the doc that owns the product rule; competitor comparisons need a dated read of the vendor's own site.

## No-design exemptions

Engine, server, tests, docs and refactors with no visible change go ahead without a design round.
