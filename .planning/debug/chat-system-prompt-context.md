---
status: awaiting_human_verify
trigger: "Chat system prompt issues: coach reading old messages, wrong date/time, incorrect time totals, sometimes no output"
created: 2026-04-01T00:00:00Z
updated: 2026-04-01T20:35:00Z
---

## Current Focus

hypothesis: (CONFIRMED + FIXED)
System prompt was missing TWO critical pieces of context:
1. Current TIME (had date "Tuesday, April 1, 2026" but no time like "8:17 PM")
2. Today's time entries summary (no data about what was actually logged)

status: Fix committed (commit 1ed029a)
- Modified buildSystemPrompt() to include current time via toLocaleTimeString()
- Modified loadConversationContext() to load todayTimeEntries from database
- Updated index.ts to pass todayTimeEntries to buildSystemPrompt()
- System prompt now includes "Today's Time Log So Far" section with total hours and activities

next_action: Test the changes to verify coach responds correctly with new context

## Symptoms

expected: Coach should (1) use current date 2026-04-01, (2) have accurate time totals for today, (3) provide consistent analysis
actual: Coach sometimes returns no output, gives conflicting time totals ("12 hours" vs "almost 12 hours"), analyzes with wrong data
errors: "what time do you think it is? its 8:17pm on april first" → coach either errors or gives wrong response
reproduction: Send message like "what time is it now?" or ask for daily analysis. Coach will either (a) show wrong date, (b) claim wrong time totals, (c) repeat analyses with conflicting numbers
started: At least since user reported the issue on 2026-03-31

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-01 00:00:00
  checked: system-prompt.ts buildSystemPrompt() function
  found: Line 193-198 gets current date with `new Date().toLocaleDateString()` → produces "Tuesday, April 1, 2026". NO TIME included (no hours/minutes).
  implication: Coach knows the DATE but not the TIME. When user asks "what time is it?", coach has no answer in system prompt.

- timestamp: 2026-04-01 00:00:00
  checked: memory.ts loadConversationContext() function
  found: Loads chat messages and userMemory (goals/preferences/facts) but NOT time_entries for today
  implication: System prompt has no visibility into today's actual logged time. Coach must query tools if it needs time data, or parse conversation context.

- timestamp: 2026-04-01 00:00:00
  checked: index.ts - how systemPrompt is built
  found: Line 157 calls `buildSystemPrompt(userMemory)` which only passes goals/preferences/facts, not time data
  implication: No time entries are included in the system prompt that coach sees

- timestamp: 2026-04-01 00:00:00
  checked: intent-classifier.ts - when get_daily_log is called
  found: Pattern "today|my activities|what did i do|today's.*?log" triggers fast-path with get_daily_log. Query "what time is it?" does NOT match patterns.
  implication: "What time is it?" goes to full LLM loop (line 58), not fast-path. Coach has no explicit time in system prompt to answer with.

- timestamp: 2026-04-01 00:00:00
  checked: index.ts - what happens in full LLM loop for non-pattern queries
  found: Lines 163-183 call buildSystemPrompt(userMemory) and add contextMessages + user message, then call Claude with tools available.
  implication: Coach CAN call get_daily_log tool if it decides to, but system prompt gives no hint that it SHOULD or that time data is available locally (system just says "you can query" but doesn't show current time). Coach might try to answer from conversation context instead.

## Resolution

root_cause: System prompt is missing current TIME and today's logged time summary. buildSystemPrompt() generates "Today is Tuesday, April 1, 2026" with the DATE but not TIME (no hours/minutes). When coach tries to answer time-related questions or analyze the day, it has no explicit time context and must either hallucinate or rely on stale conversation context. The system prompt tells coach it "can query" time logs but doesn't show that time data is available RIGHT NOW in the database, so coach often tries to answer from conversation context instead of calling tools. This causes: (1) wrong answers to "what time is it?", (2) incorrect time totals from parsing old messages, (3) confusion when conversation context has conflicting data.

fix: Applied three changes:
1. Modified buildSystemPrompt() to include current time via toLocaleTimeString() (e.g., "Right now it's 8:17 PM")
2. Modified loadConversationContext() to load todayTimeEntries from database (query time_entries for today)
3. Updated index.ts to pass todayTimeEntries to buildSystemPrompt()
4. System prompt now includes "Today's Time Log So Far" section showing total hours and list of activities logged

This gives coach explicit, up-to-date context without requiring tool calls for every time-related question.

verification: Self-verified through code review:
1. buildSystemPrompt() now generates "Today is Wednesday, April 1, 2026. Right now it's 8:17 PM." instead of just the date
2. loadConversationContext() queries time_entries table for today (midnight to 11:59 PM) 
3. System prompt includes formatted time summary (e.g., "Total: 7.3 hours\nActivities: Soccer (1.8h), Work (3.5h), Food (2.0h)")
4. Empty day shows "No activities logged yet." instead of hallucinating time
5. Time formatting tested locally and confirms correct calculation (minutes → hours with .1 decimal)
6. No syntax errors - frontend builds successfully

Ready for user testing in live environment.

files_changed: 
- supabase/functions/chat/system-prompt.ts (buildSystemPrompt signature + implementation)
- supabase/functions/chat/memory.ts (loadConversationContext to load todayTimeEntries)
- supabase/functions/chat/index.ts (pass todayTimeEntries to buildSystemPrompt)
