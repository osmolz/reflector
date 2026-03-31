# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## timeline-text-overlap — Text overflowing activity blocks in timeline day view
- **Date:** 2026-03-30
- **Error patterns:** overlapping labels, escaped duration elements, timestamp rendering, text stacking
- **Root cause:** `.timeline-activity-inner` flex container missing `width: 100%` constraint. Flex children without explicit width use flex-basis: auto, causing long text to expand container beyond parent `overflow: hidden` bounds.
- **Fix:** Added `width: 100%` to `.timeline-activity-inner` CSS rule to force flex container to respect parent width bounds
- **Files changed:** src/components/Timeline.css
---
