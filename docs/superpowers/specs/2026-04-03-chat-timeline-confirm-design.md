# Chat timeline preview and explicit save — design

**Date:** 2026-04-03  
**Status:** Approved for implementation (author red-team + user deferral to best practice)

## Problem

The coach can already **preview** timeline activities from chat (`preview_timeline_from_text`, same parser as Log) and **commit** via `commit_timeline_activities`, but the **client never receives structured preview data** (streaming path does not surface tool payloads). Users cannot confirm entries with the same mental model as Log: review rows, optionally edit, then Save.

## Goals

1. When the user asks to log time in chat, the coach parses (preview only), explains in prose, and the app shows a **confirmation UI** with parsed rows and a **Save** control.
2. **Timeline rows are persisted only after** the user clicks Save (or equivalent explicit action in that UI).
3. **Log (VoiceCheckIn) and chat Save use the same server-side persistence logic** so normalization, timestamps, and inserts stay aligned.
4. The confirmation UI **appears only when** a successful preview is available for confirmation; it **closes after** a successful save (and clears pending state). Cancel/dismiss clears pending state without writing.

## Non-goals

- Changing the parse model or `parse` edge function contract for Log.
- Auto-saving from chat without explicit Save.
- Supporting multiple simultaneous pending previews (see concurrency).

## Red-team / mitigations

| Risk | Mitigation |
|------|------------|
| Model calls `commit_timeline_activities` while user stares at the card → double write | **Remove** `commit_timeline_activities` from tools exposed to the model. All writes go through the new save endpoint invoked from the client. |
| Two previews in quick succession | Each successful preview **replaces** `pendingTimelinePreview` in client state (latest wins). |
| Tool result / block ordering | When emitting SSE, **zip** `tool_use` blocks with their executed results by index (same order as `Promise.all` on `toolUseBlocks`). |
| Auth weaker than chat | Save endpoint validates JWT with **`supabase.auth.getUser(token)`** (same pattern as `chat/index.ts`), not only JWT payload decode. |
| Log and chat drift on time handling | **Extract** insert + normalization into `_shared/save-timeline-checkin.ts`; **only** that module performs `normalizeActivities` + `inferredTimeToIso` + inserts. |
| User deletes all rows in editor then saves | Reuse **ActivityReview** behavior: treat as validation error (empty list) and block save with message, consistent with Log expectations. |
| Accessibility | Confirmation surface is keyboard-operable; focus management for modal (trap + return focus) per existing app patterns. |

## Architecture

### Parse (unchanged contract)

- **Log:** `POST /functions/v1/parse` with transcript → activities.
- **Chat:** Model calls **`preview_timeline_from_text`** only (parse-only, no DB). Same shared `parse-transcript-activities` stack as parse function internals.

### Persist (single path)

- New edge function **`save-check-in`** (name may be adjusted to match repo naming): `POST` body `{ transcript: string, activities: unknown[] }`, user JWT required.
- Handler validates user, calls **`saveTimelineCheckIn(supabase, userId, transcript, activities)`** in `_shared/save-timeline-checkin.ts` (extracted from current `commitTimelineActivities` body).
- **VoiceCheckIn** `handleSaveActivities` stops performing direct `supabase.from(...).insert` and instead **`fetch(save-check-in)`** with session token (same activities shape as today).
- **Chat** Save button calls the **same** `fetch(save-check-in)` with `source_text` from the preview payload and **edited** activities from ActivityReview.

### Chat → client signaling

- After each assistant hop that runs tools, for each `preview_timeline_from_text` tool block whose result is `status: 'ok'` with `data.activities`, the chat edge function **emits an SSE event** (e.g. `timeline_preview_pending`) including:
  - `activities` — array returned from preview (normalized parser output),
  - `source_text` — the `text` argument passed to the preview tool (stored as `check_ins.transcript` on save).

- **`Chat.tsx`** listens for this event, sets pending state, renders the confirmation UI. **Ignore** generic `tool_use` events for display if they remain internal; the dedicated event carries the payload.

### Prompt / model

- Update **`TIMELINE_FROM_CHAT`** (and related lines): preview only; **never** claim data is on the timeline until the user has saved in the app; **do not** use a commit tool (removed from definitions).

## UI / UX

- **Component:** Reuse **`ActivityReview`** inside a compact overlay/modal (Phase 21 styling — match Log review patterns: typography, spacing, no extra chrome).
- **Actions:** Save (primary), Cancel / dismiss (secondary). Save disabled while request in flight; show error inline on failure; **do not** close on failure.
- **After successful save:** dismiss overlay, clear pending state, fire the same **timeline refresh** hook pattern used when Log saves (e.g. `onActivitiesSaved` if wired from parent).

## Fast-path note

Intent fast-path does **not** today route “log this block” messages; no change required for classifier. If a future fast-path parses timeline text, it must emit the same `timeline_preview_pending` shape or skip fast-path for that intent.

## Testing

- **Unit / integration:** `save-timeline-checkin` with valid and invalid activity payloads; empty array rejected.
- **Manual / E2E:** Chat message requesting a log → card appears → edit row → Save → entries in DB, card gone; Cancel → no DB row from that preview.

## Open decisions (resolved)

- **Client vs edge save:** Edge **`save-check-in`** + shared module (single write implementation).
- **Commit tool:** Removed from model; persistence only via **`save-check-in`**.
