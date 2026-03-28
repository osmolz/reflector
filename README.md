# Reflector

A personal time-tracking and journaling app. Speak your day, see your time.

**Live:** https://reflector-osmol.vercel.app

## Features

- **Voice Check-ins:** Speak stream-of-consciousness about your day; Reflector parses it into a timeline of activities with durations
- **Timeline:** See activities with durations, categories, and start times. Unaccounted gaps are flagged for awareness
- **Journal:** Separate text/voice notes, no time association. Reflect freely
- **Chat Analytics:** Ask questions about your time data ("What did I spend time on this week?", "How much time on work today?")
- **Supabase Sync:** All data persisted securely with per-user isolation via Row-Level Security
- **Responsive Design:** Desktop-first, works on tablet and mobile

## Tech Stack

- **Frontend:** React 18 + Vite, custom CSS (no frameworks for design control)
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **APIs:** Claude 3.5 Sonnet (parsing & chat via Edge Functions), Web Speech API (transcription)
- **Deployment:** Vercel (frontend), Supabase (database & functions)

## Setup (Local Development)

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier sufficient)
- An Anthropic Claude API key (free trial or paid)

### Installation

1. Clone repository

```bash
git clone https://github.com/osmol/reflector.git
cd reflector
```

2. Install dependencies

```bash
npm install
```

3. Create `.env.local` in project root with your API credentials:

```bash
# Supabase (from Dashboard → Settings → API)
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Claude API (from Anthropic Console → API Keys)
# Note: Only needed for local development
ANTHROPIC_API_KEY=<your-claude-api-key>
```

**Security Note:** Do NOT commit `.env.local`. It's in `.gitignore`.

4. Set up Supabase schema

Apply the database migrations via Supabase dashboard:

```bash
# Copy from supabase/migrations/ and run in Supabase SQL Editor
```

Or use Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

5. Start development server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Build & Deploy

### Local Build

```bash
npm run build
# Output: dist/
```

### Deploy to Vercel

1. Connect GitHub repo to Vercel (https://vercel.com → New Project → Import GitHub)
2. Select `osmol/reflector` repo
3. Configure environment variables in Vercel dashboard (Project Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click Deploy
5. Vercel will auto-deploy on `git push main`

### Deploy Edge Functions

Supabase Edge Functions (parse & chat) are automatically deployed when you push to the repository if linked to Supabase.

```bash
# Local testing:
supabase functions serve

# Deploy to Supabase:
supabase functions deploy parse
supabase functions deploy chat
```

## Usage

### Creating a Check-in

1. Click the mic button or "New Check-in" on the dashboard
2. Speak your stream-of-consciousness about your day
   - Example: "Woke up at 7, had breakfast for 15 minutes, worked on the project for 2 hours, lunch at noon..."
3. Review the parsed activities on the next screen
4. Edit any activities if needed (name, duration, category)
5. Click "Save" to add to your timeline

### Viewing Your Timeline

- Click "Timeline" to see all activities for today
- Activities are listed chronologically with durations
- Gaps > 15 minutes are flagged as "unaccounted" time
- Click an activity to edit or delete it

### Creating Journal Entries

1. Click "Journal"
2. Type or voice-record a note (can be any length, no time attached)
3. Click "Save"
4. View all past entries in reverse-chronological order

### Asking Questions (Chat)

1. Click "Chat"
2. Ask a question about your time:
   - "What did I spend the most time on this week?"
   - "How much time did I spend working today?"
   - "Show me my top 3 activities by time spent"
   - "What percentage of today was unaccounted?"
3. Claude analyzes your time data and responds with insights

## Environment Variables

| Variable | Source | Purpose | Required |
|----------|--------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API | Supabase API endpoint | ✓ Frontend |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Supabase anonymous key (safe to expose) | ✓ Frontend |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | Claude API key (server-side only) | ✓ Edge Functions |

**Security Notes:**
- `VITE_*` variables are exposed to the client (safe if public keys only)
- `ANTHROPIC_API_KEY` is server-side only (Edge Functions) — never exposed to client
- Never commit `.env.local`

## API Endpoints (Supabase Edge Functions)

### POST `/functions/v1/parse`

Parses a transcript into structured activities.

**Request:**

```json
{
  "transcript": "Woke up at 7 AM, had breakfast for 15 minutes, then worked for 2 hours..."
}
```

**Response:**

```json
{
  "activities": [
    {
      "activity": "breakfast",
      "duration_minutes": 15,
      "start_time_inferred": "07:00 AM",
      "category": "food"
    },
    {
      "activity": "work",
      "duration_minutes": 120,
      "start_time_inferred": "07:15 AM",
      "category": "work"
    }
  ]
}
```

Requires: Authorization header with Bearer token (Supabase session)

### POST `/functions/v1/chat`

Answers questions about your time data using Claude.

**Request:**

```json
{
  "question": "How much time did I spend working this week?",
  "dateRange": { "days": 7 }
}
```

**Response:**

```json
{
  "question": "How much time did I spend working this week?",
  "response": "Based on your logged activities, you spent approximately 25 hours on work-related tasks this week..."
}
```

Requires: Authorization header with Bearer token (Supabase session)

## Security & Privacy

### Data Security

- **Row-Level Security (RLS):** All data tables enforce RLS policies. Users can only access their own data
- **Encryption at rest:** Supabase encrypts all data at rest
- **Authentication:** Supabase Auth with email + password
- **HTTPS:** All communication is encrypted (Vercel + Supabase both enforce HTTPS)

### API Keys

- Claude API key is server-side only (in Supabase Edge Functions)
- Frontend only has access to public Supabase keys (limited by RLS)
- No sensitive data is logged or shared externally

### Privacy

- Transcripts are processed by Claude API (check [Anthropic Privacy Policy](https://www.anthropic.com/privacy))
- All user data is stored in Supabase (encrypted at rest)
- No third-party analytics or tracking
- No data is shared with external services except Claude API (for parsing/chat)

## Troubleshooting

### "Mic button doesn't work"

- Ensure browser has microphone permissions (check browser settings)
- Try Chrome/Chromium (best Web Speech API support)
- Check browser console (F12 → Console) for errors
- Verify microphone is working in other apps

### "Transcription not appearing"

- Wait 3–5 seconds (Web Speech API can be slow)
- Check browser Network tab (F12 → Network) to verify request succeeded
- Speak clearly and for at least 1 second of audio
- Try a short test phrase: "Testing one two three"

### "Claude API errors"

- Verify `ANTHROPIC_API_KEY` is set in Vercel environment variables (for production)
- Check [Anthropic Console](https://console.anthropic.com) for rate limits or quota issues
- Check account status (trial expired?)
- Wait 1 minute and retry (rate limiting)

### "Can't log in"

- Verify Supabase project is active (Supabase Dashboard → Projects)
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in environment
- Try incognito/private mode (clear cookies/cache)
- Check browser console for auth errors

### "Data not saving"

- Verify you're authenticated (check browser DevTools → Application → localStorage for `sb-*` sessions)
- Check Supabase RLS policies (Dashboard → SQL Editor → verify SELECT/INSERT/UPDATE policies)
- Verify Supabase project is not out of quota (Dashboard → Billing → Usage)
- Check browser Network tab for failed requests

### "Design looks broken on mobile"

- MVP is desktop-first optimized; mobile is "works but not fully optimized"
- Test on tablet (iPad or Android tablet) for better experience
- Responsive design works but may not be perfect on small phones (< 375px width)
- Post-MVP: optimize for mobile

## Known Limitations (MVP)

- **Single User Only:** No multi-user or collaboration features
- **Desktop-First:** Optimized for desktop/tablet (≥768px); mobile works but not primary focus
- **No Automated Tests:** Manual testing only (automated tests can be added post-MVP)
- **No Conversation History:** Each chat query is stateless (no multi-turn context maintained)
- **No Notifications:** No reminders for daily check-ins
- **No Data Export:** Can't export timeline or journal as CSV/JSON (can be added post-MVP)
- **Web Speech API Limitations:** Accuracy depends on speech clarity; transcription can fail in noisy environments
- **Free Tier Limits:** Supabase free tier has 100k requests/month; monitor usage

## Future Work (Post-MVP Backlog)

- [ ] Automated tests (Jest + React Testing Library)
- [ ] Dark mode
- [ ] Multi-turn chat with conversation history
- [ ] Habit & productivity insights (most productive hours, weekly patterns)
- [ ] Calendar integration (view activities on calendar)
- [ ] Data export (CSV, JSON, PDF)
- [ ] Mobile app (React Native or PWA)
- [ ] Activity templates ("Quick add: Coffee", "Quick add: Lunch")
- [ ] Recurring activities (daily standup, etc.)
- [ ] Detailed analytics dashboard (time spent by category, trends)
- [ ] Backup & restore functionality
- [ ] Custom categories & activity filtering
- [ ] Shareable activity reports (week summary)

## License

Personal use only. No open-source license for MVP phase.

## Author

Built with care by osmol.

---

## Support & Feedback

Found a bug or have a feature request? Create an issue on GitHub: https://github.com/osmol/reflector/issues

For questions about Claude API or Supabase, check their respective docs:

- [Claude API Docs](https://docs.anthropic.com)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
