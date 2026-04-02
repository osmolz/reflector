# Requirements: Prohairesis MVP

## 1. User Authentication & Sessions

**REQ-1.1:** User can sign up and log in via Supabase Auth (OAuth or email/password)
- Standard secure auth flow
- Session persisted in localStorage, validated on app load
- Single user (no team/multi-user logic)

**REQ-1.2:** User data is isolated per account
- All entries, journal, chat history scoped to authenticated user
- No cross-user data leakage

---

## 2. Voice Check-in & Parsing

**REQ-2.1:** User can initiate a voice check-in
- Tap a mic button to start recording
- Records user's stream-of-consciousness speech (~1-5 min target)
- Transcription via Web Speech API (browser native) or external API
- Stops on user action (click button again or timeout)

**REQ-2.2:** Parsing raw speech into structured time blocks
- Claude API processes the transcript and returns:
  - List of activities (name, inferred duration in minutes, category if clear)
  - Start time inferred from check-in time or explicitly mentioned
  - Confidence level (if activity is ambiguous, note it)
- Example input: "So I woke up around 7, had breakfast for like 15 minutes, then started work. Got emails sorted, probably took 30 minutes, then deep work for about 2 hours before lunch, which was like 45 minutes."
- Expected output: `[{activity: "breakfast", duration: 15, start: "7:00"}, {activity: "emails", duration: 30, start: "7:15"}, {activity: "deep work", duration: 120, start: "7:45"}, {activity: "lunch", duration: 45, start: "9:45"}]`

**REQ-2.3:** User reviews and can accept, edit, or discard parsed activities
- Show parsed activities in a preview/review screen
- User can:
  - Adjust activity name, duration, or category
  - Delete an activity
  - Accept and save to timeline
  - Start over and re-record

**REQ-2.4:** Activities are saved to Supabase
- Table: `time_entries` (user_id, activity_name, duration_minutes, category, start_time, check_in_id, created_at)
- Entries are time-aware; can represent past activities (e.g., backfill this morning's work done yesterday)

---

## 3. Timeline Visualization

**REQ-3.1:** User sees a daily timeline view
- Shows all time entries for a selected day (default: today)
- Displays activities in chronological order with duration
- Visual timeline bar or list, clean and editorial aesthetic

**REQ-3.2:** Timeline detects and flags unaccounted gaps
- If there's a gap between activities, flag it as "unaccounted"
- Example: 7am breakfast (15 min), then work starts at 9am → 1.75h gap flagged
- User can manually fill gaps or dismiss

**REQ-3.3:** Weekly view
- Aggregates time entries by day
- Shows day-by-day summary with total accounted hours
- Users can click into a day to see full timeline

**REQ-3.4:** Timeline is editable
- User can click an activity to edit duration, name, category, or delete
- Changes are saved to Supabase
- Edits trigger re-computation of gaps

---

## 4. Journal Entries

**REQ-4.1:** User can create journal entries
- Text input or voice input (transcribed to text via Web Speech API)
- No time association; entries are narrative, not data
- Timestamp automatically recorded (created_at)

**REQ-4.2:** Journal history
- Scrollable, reverse-chronological list of all entries
- Display: date, snippet of text, option to expand and read full entry
- Pagination or infinite scroll (no strict limit for MVP)

**REQ-4.3:** Journal entries are persisted
- Table: `journal_entries` (user_id, text, created_at)

---

## 5. Chat Analytics

**REQ-5.1:** Chat interface for asking questions about logged data
- Text input, user asks a question about their time logs
- Claude API processes the query and the full history of time_entries
- Returns a natural language response with specific facts and figures

**REQ-5.2:** Supported queries (not exhaustive, but examples):
- "How much time did I spend on work this week?"
- "What was my biggest time sink this month?"
- "Did I waste more time on my phone or on Reddit?"
- "What percentage of this week was unaccounted?"
- "Show me my top 5 activities by time spent"

**REQ-5.3:** Chat context & history
- Each query is stateless (Claude gets full log context each time, not a multi-turn conversation)
- Chat history is stored for reference; user can scroll back
- Table: `chat_messages` (user_id, question, response, created_at)

**REQ-5.4:** Data passed to Claude
- Chat endpoint receives: user's full time_entries for the requested time period (default: last 30 days), user's query
- Claude generates an answer using that data
- No PII beyond the user's own time data is sent

---

## 6. High-Level Analytics (Optional, minimal MVP)

**REQ-6.1:** Summary cards on dashboard
- Total hours logged this week
- Top 3 categories by time spent this week
- Total unaccounted hours

**REQ-6.2:** No dashboards, charts, or heavy analytics
- Focus on chat-driven analysis, not visual dashboards

---

## 7. UI/UX Design Requirements

**REQ-7.1:** Design direction
- Off-white or white background (#F9F9F9 or #FFFFFF)
- Dark charcoal text (#1A1A1A or similar)
- One accent color, used sparingly (e.g., for interactive elements or focus states)
- Typography: intentional font pairing (no system defaults, no generic Inter at default weights)
- Generous whitespace; borders only when structure is needed
- Premium, restrained aesthetic—no Tailwind scaffolding look

**REQ-7.2:** Mic button
- Custom styled to feel like a premium physical object
- Not a Bootstrap or standard component

**REQ-7.3:** Timeline layout
- Editorial aesthetic, closer to Financial Times or Linear
- Clean, hierarchical, information-dense but not cramped

**REQ-7.4:** Responsive design
- Desktop-first, but should work on tablets and narrower screens
- No mobile app, but responsive web

---

## 8. Data Model Summary

### Tables

**users** (from Supabase Auth)
- id (UUID, primary key)
- email
- created_at

**time_entries**
- id (UUID, primary key)
- user_id (FK to users)
- activity_name (text)
- category (text, e.g., "work", "personal", "phone", "sleep")
- duration_minutes (integer)
- start_time (timestamp, when the activity began)
- check_in_id (UUID, FK to check_ins, links entry to the check-in that created it)
- created_at (timestamp, when the entry was logged)
- updated_at (timestamp, when last edited)

**check_ins**
- id (UUID, primary key)
- user_id (FK to users)
- transcript (text, raw voice transcription)
- parsed_activities (JSON, Claude's parsed output)
- created_at (timestamp)

**journal_entries**
- id (UUID, primary key)
- user_id (FK to users)
- text (text, content)
- created_at (timestamp)

**chat_messages**
- id (UUID, primary key)
- user_id (FK to users)
- question (text)
- response (text, Claude's response)
- created_at (timestamp)

---

## 9. Success Criteria (Testable)

- [ ] User can sign up, log in, and access their personal dashboard
- [ ] User can tap mic, speak, and see parsed activities in < 30 seconds
- [ ] Parsed activities are 80%+ accurate on clear input (spot-check 10 entries)
- [ ] User can manually edit a parsed activity and see change reflected in timeline
- [ ] Timeline shows activities in order with durations and flags gaps > 15 min
- [ ] User can create a journal entry (text or voice) and see it in history
- [ ] Chat feature works: user asks "what was my top activity this week?" and gets a correct answer
- [ ] All data persists across sessions (check after logout/login)
- [ ] Design passes the "serious designer" test (no Tailwind defaults, restrained, intentional)
- [ ] App loads in < 3s, interactions feel responsive

---

## 10. Out of Scope (for MVP)

- Real-time notifications, push alerts
- Recurring reminders for check-ins
- Habit tracking, goals, or metrics beyond raw time logging
- Calendar integration, task management integration
- Sharing, collaboration, or team features
- Heavy dashboards, charts, or data visualization
- Mobile-native app (responsive web only)
- On-device ML; all parsing via Claude API
- Offline-first or sync; assumes online use

---

## Phase Breakdown

1. **Phase 1: Backend Setup** — Supabase schema, user auth, data models
2. **Phase 2: Voice & Parsing** — Web Speech API, Claude parsing, timeline display
3. **Phase 3: Journal & Editing** — Journal entries, edit parsed activities
4. **Phase 4: Chat Analytics** — Claude chat integration, data querying
5. **Phase 5: Design & Polish** — Custom CSS, restrained design, mic button styling
6. **Phase 6: Testing & Deploy** — Verification, edge cases, security, Vercel launch

**Interdependencies:** Phase 2 depends on Phase 1. Phase 3-4 depend on Phase 2. Phase 5 spans all phases (design is iterative). Phase 6 is final.

---

## Notes

- **Timeline tightness**: 1-2 weeks to MVP means design > features. Prioritize restrained, intentional UI over feature parity.
- **Parsing assumptions**: Input is expected to be clear and deliberate. No fuzzy matching, no complex heuristics.
- **Analytics scope**: Chat-driven queries only; minimal preloaded analytics.
- **Deployment**: Vercel + Supabase (standard, secure, no custom hosting).
