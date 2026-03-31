---
status: verifying
trigger: Timeline event blocks rendering text overlap - duplicate labels stacking and escaped duration/timestamp elements
created: 2026-03-30T15:00:00Z
updated: 2026-03-30T15:15:00Z
---

## Current Focus
hypothesis: `.timeline-activity-inner` needs `width: 100%` constraint to prevent child elements from overflowing horizontally. Without explicit width on the flex column container, duration and time elements may wrap or overflow despite `overflow: hidden` on parent
test: Adding `width: 100%` to `.timeline-activity-inner` to force full width and ensure children constrain properly
expecting: Duration labels will stay inside container; text will truncate/wrap properly; timestamps won't escape
next_action: Add CSS rule to constrain `.timeline-activity-inner` width

## Symptoms
expected: Single activity label per block, duration and timestamp anchored inside container
actual: Two labels stacking in same block (e.g., "Worked on project" + "Work (morning block)"), duration/timestamp appearing as separate escaped elements
errors: Visual rendering bug - no JavaScript errors
reproduction: View Timeline in day view - observe overlapping text in event blocks and free-floating duration labels
started: Recent (from redesign commit cbd61b5)

## Eliminated
(none yet)

## Evidence
- timestamp: 2026-03-30T15:00:00Z
  checked: Timeline.jsx day view rendering
  found: Lines 221-254 render activities with `.timeline-activity-inner` container holding three child spans (time, name, duration), checked for category/title duplication
  implication: No duplicate rendering in JSX - both time and name come from single event.activity_name and event.start_time

- timestamp: 2026-03-30T15:00:00Z
  checked: CSS for `.timeline-activity` and `.timeline-activity-inner`
  found: `.timeline-activity-inner` uses `display: flex; flex-direction: column; gap: 1px; min-height: 0;` with NO explicit width. Parent `.timeline-activity` has `position: absolute; left: 0; right: 0;` to stretch horizontally
  implication: Without `width: 100%` on flex column child, it uses `flex-basis: auto` which sizes based on content. Long text in children causes container to expand beyond parent bounds, escaping overflow: hidden

- timestamp: 2026-03-30T15:00:00Z
  checked: Timeline.jsx data transformation flow
  found: Lines 132-152 map merged events to displayActivities - each event has single `activity_name` field from either time entry or calendar event title
  implication: Data layer is correct, no duplicate fields being set

- timestamp: 2026-03-30T15:00:00Z
  checked: CSS for `.timeline-activity-name` and other child elements
  found: `.timeline-activity-name` (line 230-240) has `-webkit-line-clamp: 2` which constrains text to 2 lines. `.timeline-activity-time` and `.timeline-activity-duration` have `line-height: 1;` and small font sizes. Child spans have NO explicit width, relying on parent flex container sizing
  implication: If parent flex container (`timeline-activity-inner`) is not constrained by width, children can cause it to expand

- timestamp: 2026-03-30T15:00:00Z
  checked: Flexbox layout model for nested flex containers
  found: Parent `.timeline-activity` stretches via `left: 0; right: 0;` but child `.timeline-activity-inner` flex-column has no width constraint. Flex children without width use flex-basis: auto (content-based sizing). Long child content causes parent flex container to exceed bounds
  implication: ROOT CAUSE: Missing `width: 100%` on `.timeline-activity-inner` causes text to escape container

## Resolution
root_cause: `.timeline-activity-inner` flex container missing `width: 100%` constraint. Without explicit width, flex-column child uses flex-basis: auto, sizing based on content. When child text (especially timestamps and durations) is long, the container expands beyond parent bounds, escaping the `overflow: hidden` clipping on `.timeline-activity`. This causes text elements to appear as if stacked/overlapping with content from other blocks.
fix: Added `width: 100%` to `.timeline-activity-inner` CSS rule (line 215-221 in Timeline.css) to force flex container to respect parent width bounds, causing child text to wrap/truncate properly
verification: Applied fix to src/components/Timeline.css. Layout should now constrain all child elements within activity block bounds. Text will wrap or truncate as intended by `-webkit-line-clamp` on activity names.
files_changed: [src/components/Timeline.css]
