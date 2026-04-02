---
status: awaiting_human_verify
trigger: "Investigate issue: chat-datetime-drift"
created: 2026-04-01T22:13:38.5041537-04:00
updated: 2026-04-01T22:19:30.0000000-04:00
---

## Current Focus

hypothesis: Prompt datetime drift should be fixed by using client local datetime/timezone per request.
test: Human verification in real chat workflow (ask day/time and time-relative follow-up).
expecting: Assistant now consistently reports correct local day/date/time context.
next_action: wait for user verification result

## Symptoms

expected: Chat should always reference the actual current local date and time correctly.
actual: Chat sometimes believes an incorrect day/date/time (example: Thursday April 2 at 8pm) and answers using that wrong context.
errors: No explicit runtime error reported.
reproduction: Ask the prohairesis chat what day/time it is or ask time-relative questions; it may answer with stale/incorrect date context.
started: Observed now in current build; unclear when it started.

## Eliminated

## Evidence

- timestamp: 2026-04-01T22:14:20.0000000-04:00
  checked: .planning/debug/knowledge-base.md
  found: No matching historical pattern for datetime drift.
  implication: Must investigate current code path directly.

- timestamp: 2026-04-01T22:15:05.0000000-04:00
  checked: supabase/functions/chat/system-prompt.ts
  found: System prompt uses `const now = new Date()` and injects "Today is ... Right now it's ...".
  implication: Date/time context is generated server-side.

- timestamp: 2026-04-01T22:15:40.0000000-04:00
  checked: supabase/functions/chat/index.ts and src/components/Chat.jsx
  found: Chat request payload includes message/session/model only; no client timezone or client current timestamp.
  implication: Backend cannot reliably construct user-local current datetime; timezone/day drift is plausible and reproducible.

- timestamp: 2026-04-01T22:17:20.0000000-04:00
  checked: src/components/Chat.jsx
  found: Outbound `/functions/v1/chat` payload now includes `clientNowIso` and `clientTimeZone`.
  implication: Backend can use user-local clock context on each message request.

- timestamp: 2026-04-01T22:17:45.0000000-04:00
  checked: supabase/functions/chat/index.ts + supabase/functions/chat/system-prompt.ts
  found: Chat function now accepts client datetime fields and `buildSystemPrompt` formats using them (with fallback if missing/invalid).
  implication: Prompt datetime should align with user's local day/time instead of server environment time.

- timestamp: 2026-04-01T22:18:40.0000000-04:00
  checked: lints on edited files
  found: No linter errors in src/components/Chat.jsx, supabase/functions/chat/index.ts, supabase/functions/chat/system-prompt.ts.
  implication: Changes are syntactically and lint-wise clean.

## Resolution

root_cause: The chat system prompt generated "Today is ... Right now it's ..." from server-side `new Date()` without any client timezone/current-time input, causing timezone/day drift versus user local time.
fix: Added client-local `clientNowIso` and `clientTimeZone` to chat requests, passed through edge handler into `buildSystemPrompt`, and formatted date/time with those values (with safe fallback to server time).
verification:
files_changed: [src/components/Chat.jsx, supabase/functions/chat/index.ts, supabase/functions/chat/system-prompt.ts]
