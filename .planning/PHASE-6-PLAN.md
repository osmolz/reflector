# Phase 6: Testing & Deploy

**Goal:** App is tested, secure, and live on Vercel.

**Timeline:** ~3–4 hours
**Deliverables:**
- Manual testing checklist (all features + edge cases)
- Security audit (RLS policies, no exposed secrets, CORS configured)
- Vercel deployment (frontend live)
- Supabase production config
- Documentation (README with setup instructions)
- All bugs fixed, UI responsive verified

---

## Testing Scope

### Functional Testing

#### 1. Authentication Flow
- [ ] Sign-up with email + password works
- [ ] Sign-up validation: email format, password strength (if enforced), error messages
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong email shows "user not found" or generic error
- [ ] Login with wrong password shows "invalid credentials"
- [ ] Logout clears session and redirects to login
- [ ] Session persists across page refresh (localStorage + auth state check)
- [ ] Protected routes redirect to login if not authenticated
- [ ] After logout, user cannot access authenticated routes
- [ ] Multiple login/logout cycles work correctly (no stale tokens)

#### 2. Voice Capture & Transcription
- [ ] Mic button is accessible and styled correctly
- [ ] Clicking mic button starts recording (visual feedback: button state changes)
- [ ] Recording indicator is visible (timer, animation, or text "Recording...")
- [ ] User can speak into microphone during recording
- [ ] Clicking mic button again stops recording
- [ ] Silence timeout or manual stop works (no infinite recordings)
- [ ] Transcript appears after recording stops (< 5 seconds)
- [ ] Transcript is visible for review before parsing
- [ ] If transcription fails (no speech detected), error message displays
- [ ] Mic permissions are requested on first use (browser prompt)

#### 3. Parsing & Activity Review
- [ ] Claude API is called with transcript + system prompt
- [ ] Parsed activities appear in review screen (< 10 seconds after transcription)
- [ ] Each activity shows: name, duration (in minutes), category (if parsed), start time
- [ ] User can edit activity fields (name, duration, category) in review screen
- [ ] User can delete an activity from review screen
- [ ] User can accept all activities and proceed to save
- [ ] User can discard parsed activities and re-record
- [ ] Parsing handles various input formats (e.g., "2 hours" → 120 min, "lunch was like 45 minutes" → 45 min)
- [ ] Error handling: if Claude API fails, user sees clear error + option to retry

#### 4. Timeline Display
- [ ] Daily timeline shows all activities for the selected day
- [ ] Activities are ordered chronologically (earliest to latest)
- [ ] Each activity displays: name, duration, start time, category
- [ ] Timeline is readable on desktop, tablet, and narrower screens (responsive)
- [ ] Weekly view shows aggregated totals by day (if implemented)
- [ ] Clicking an activity opens edit mode or detail view

#### 5. Gap Detection
- [ ] Gaps > 15 minutes are flagged (e.g., "1h 45m unaccounted between breakfast and work")
- [ ] Gap detection is accurate: if activities are 7:00–7:15 and 9:00–10:00, gap is 1h 45m
- [ ] User can dismiss or fill gaps (per Phase 3 implementation)
- [ ] Gap detection recalculates after activity edits
- [ ] Empty timeline (no activities) does not show false gaps

#### 6. Activity Editing
- [ ] User can click an activity to edit it
- [ ] Edit form shows: name, duration, category, start time
- [ ] User can modify any field and save
- [ ] Deletion of an activity removes it from timeline
- [ ] Timeline updates immediately after edit/delete
- [ ] Gap detection recalculates after edits
- [ ] Edit changes persist to Supabase (verify via refresh)

#### 7. Journal Entries
- [ ] Journal entry form is visible (text input + optional voice button)
- [ ] User can type text and submit
- [ ] Text entry is saved and appears in journal history
- [ ] Voice entry option works (mic button starts recording)
- [ ] Voice is transcribed to text and saved
- [ ] Journal history displays entries in reverse-chronological order (newest first)
- [ ] Each entry shows date/time and content
- [ ] Scrolling through history works (no truncation)
- [ ] Entries persist across sessions (refresh page, data still there)

#### 8. Chat Analytics
- [ ] Chat interface is visible (text input + send button)
- [ ] User can type a question and click send
- [ ] Chat message appears in history (user's question)
- [ ] Claude API is called with user's time_entries + question
- [ ] Response appears in chat history (Claude's answer)
- [ ] Response is displayed within 10–15 seconds
- [ ] Chat history shows all past messages (scrollable)
- [ ] Multiple questions work correctly (each query is independent)
- [ ] Example queries work:
  - "How much time did I spend on work today?"
  - "What was my biggest time sink this week?"
  - "Show me my top 3 activities by time spent"
  - "What percentage of today was unaccounted?"
- [ ] Error handling: if Claude API fails, user sees error message + option to retry

#### 9. Data Persistence
- [ ] Activities are saved to Supabase `time_entries` table
- [ ] Journal entries are saved to `journal_entries` table
- [ ] Chat messages are saved to `chat_messages` table
- [ ] All entries are tagged with correct `user_id`
- [ ] Timestamps are accurate (created_at, updated_at)
- [ ] After logout and login, all data is still accessible (user-scoped)
- [ ] No cross-user data leakage (logged-in user A cannot see user B's data)

#### 10. UI/UX
- [ ] Design passes the "serious designer" test (no Tailwind scaffolding, intentional craft)
- [ ] Off-white/white background, dark charcoal text, accent color used sparingly
- [ ] Typography is intentional (font pairing, weights, line heights deliberate)
- [ ] Mic button feels premium and custom (not Bootstrap)
- [ ] Timeline has editorial aesthetic (similar to Financial Times, Linear)
- [ ] Whitespace is generous; borders only where needed
- [ ] Focus states are visible (keyboard navigation supported)
- [ ] Hover states are smooth (interactive elements responsive)
- [ ] No loading spinners or animations feel generic

### Responsive Design Testing

#### Desktop (1920x1080, 1440x900, 1024x768)
- [ ] All sections visible without horizontal scroll
- [ ] Text is readable (font size, line height, contrast)
- [ ] Buttons and inputs are easily clickable (size, spacing)
- [ ] Mic button is prominent and well-positioned

#### Tablet (iPad: 1024x768, Android tablets: similar ranges)
- [ ] Layout adapts to narrower width (2-column → 1-column if needed)
- [ ] Touch targets are 44px+ (mobile accessibility standard)
- [ ] Timeline is scrollable and readable
- [ ] Form inputs are not cramped

#### Mobile (375x667 for iPhone SE, 412x915 for larger phones)
- [ ] App is usable (note: desktop-first, but should not break)
- [ ] Text is readable without pinch-zoom
- [ ] Buttons are touchable (44px+ targets)
- [ ] Horizontal scroll is avoided (responsive layout)
- [ ] Note: MVP is desktop-first; mobile is "works but not optimized"

### Edge Case & Error Handling Testing

#### Empty Data States
- [ ] First-time user sees empty timeline (not broken)
- [ ] Empty journal history shows placeholder or "no entries"
- [ ] Empty chat shows placeholder or instruction
- [ ] User can still create first check-in, journal, chat message

#### Long Transcripts
- [ ] 5+ minute transcript is parsed without truncation
- [ ] Many activities (20+) are rendered without performance issues
- [ ] Long activity names display correctly (text wrapping, no overflow)

#### Rapid Check-ins
- [ ] User can create 3 check-ins in quick succession
- [ ] Each check-in is saved separately with correct timestamps
- [ ] Timeline correctly orders all activities by time

#### Deleted Activities
- [ ] Deleting an activity removes it from timeline immediately
- [ ] Gaps are recalculated after deletion
- [ ] Deletion is reflected in Supabase after refresh

#### Network Failures
- [ ] If transcription API is unreachable, user sees error message (not blank screen)
- [ ] If Claude API is unreachable, user sees error message with retry option
- [ ] If Supabase is unreachable, user sees error (not silent failure)
- [ ] Retrying after network recovery works

#### Missing Data
- [ ] Activity with no duration specified defaults to 0 or shows error
- [ ] Activity with no start time shows placeholder or current time
- [ ] Chat query with no user data (no time entries) returns sensible response

#### Browser Compatibility
- [ ] Chrome/Chromium (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Firefox (latest)
- [ ] Web Speech API works in all (or graceful fallback)

---

## Security Audit Checklist

### Row-Level Security (RLS)

- [ ] Supabase RLS is ENABLED on all user-data tables:
  - [ ] `time_entries`
  - [ ] `journal_entries`
  - [ ] `chat_messages`
  - [ ] `check_ins`

- [ ] RLS policies prevent unauthorized access:
  - [ ] Users can only SELECT their own rows (`auth.uid() = user_id`)
  - [ ] Users can only INSERT rows with their own `user_id`
  - [ ] Users can only UPDATE rows they own
  - [ ] Users can only DELETE rows they own

- [ ] Test RLS violation: Log in as User A, attempt to query User B's data via browser dev tools → Should return 0 results or 403 error

- [ ] Anonymous/unauthenticated users cannot access any tables
  - [ ] Policy: `auth.uid() IS NOT NULL`

### Secrets & API Keys

- [ ] `.env.local` is in `.gitignore` (not committed)

- [ ] Environment variables are used for all sensitive data:
  - [ ] `VITE_SUPABASE_URL` (public, safe to expose)
  - [ ] `VITE_SUPABASE_ANON_KEY` (public, limited by RLS)
  - [ ] `VITE_CLAUDE_API_KEY` (PRIVATE, keep in server-side .env only)

- [ ] Claude API key is NOT in frontend `.env` or localStorage
  - [ ] If Claude API is called from frontend, move to backend (Edge Function or API route)
  - [ ] If using Vercel, Claude API key should be in Vercel environment variables (Settings → Environment Variables)

- [ ] Supabase Service Key (if used) is ONLY in backend, never in frontend

- [ ] Check `.env.example` for reference (no actual keys)

- [ ] Verify secrets are not in git history:
  ```bash
  git log --all -S 'CLAUDE_API_KEY' --oneline
  # Should return no results
  ```

### CORS Configuration

- [ ] Supabase is accessible from Vercel domain (check CORS in Supabase dashboard if custom domain)

- [ ] Claude API calls (if frontend-based) have correct headers:
  - [ ] `Content-Type: application/json`
  - [ ] `Authorization: Bearer {key}` (or equivalent)

- [ ] No CORS errors in production (check browser console)

- [ ] If using Edge Functions, CORS headers are set correctly:
  ```javascript
  headers: {
    'Access-Control-Allow-Origin': 'https://yourdomain.vercel.app',
    'Content-Type': 'application/json',
  }
  ```

### Authentication & Sessions

- [ ] Session tokens are stored securely:
  - [ ] Supabase session is in `localStorage` or cookie (check Supabase docs)
  - [ ] No sensitive data in localStorage (only session tokens + user ID)

- [ ] Sessions expire appropriately:
  - [ ] Access token: ~1 hour expiry (default)
  - [ ] Refresh token: ~7 days expiry (default, used to renew access token)

- [ ] Logout clears session:
  - [ ] `localStorage` is cleared
  - [ ] User is redirected to login

- [ ] HTTPS enforced in production:
  - [ ] Vercel auto-enforces HTTPS
  - [ ] Supabase uses HTTPS (verify via connection string)

### Input Validation

- [ ] Email input is validated (format check)

- [ ] Password input has minimum length (8 characters recommended)

- [ ] Activity name, duration, category are sanitized (no SQL injection risk via Supabase RLS)

- [ ] Chat query is sent as plain text (no code execution risk if Claude response is displayed as text)

- [ ] File uploads are not supported (no risk)

### Rate Limiting

- [ ] Supabase free tier has rate limits:
  - [ ] 100,000 requests/month (~3,300 req/day)
  - [ ] Check billing dashboard for usage
  - [ ] For testing: Create check-in, verify rate limit not hit

- [ ] Claude API has rate limits (check Anthropic dashboard):
  - [ ] Free tier or paid plan?
  - [ ] Track usage during testing

- [ ] Monitor production usage:
  - [ ] Create task to check Supabase dashboard post-launch
  - [ ] Create task to check Claude API billing post-launch

### Data Privacy

- [ ] No logs or console output contain sensitive data (user IDs, API keys, email)

- [ ] Transcripts (raw speech) are stored securely in Supabase (encrypted by default at rest)

- [ ] Chat responses are not logged externally (e.g., not sent to Google Analytics)

- [ ] README.md includes privacy note: "Data is stored in Supabase (encrypted at rest). Transcripts are processed by Claude API (check Anthropic privacy terms)."

---

## Deployment Steps

### Pre-Deployment Checklist

- [ ] All code is committed and pushed to `main` (or deployment branch)

- [ ] Environment variables are set in Vercel:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_CLAUDE_API_KEY` (if frontend-based; consider moving to backend)
  - Any other secrets needed

- [ ] `package.json` build script is correct:
  ```json
  "build": "vite build"
  ```

- [ ] `package.json` start script (or Vercel default) is:
  ```json
  "start": "vite preview"
  ```
  or rely on Vercel's auto-detection of Vite

### Vercel Deployment

#### Option 1: Git-Based Deployment (Recommended)

1. **Connect GitHub repo to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import GitHub repo (authorize if needed)
   - Select repository `osmol/prohairesis` (or your repo name)
   - Click "Import"

2. **Configure build & output:**
   - **Framework Preset:** Vite (Vercel auto-detects)
   - **Build Command:** `npm run build` (or `yarn build`)
   - **Output Directory:** `dist` (Vite default)
   - **Install Command:** `npm install` (or `yarn install`)

3. **Set environment variables in Vercel:**
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add each variable:
     - `VITE_SUPABASE_URL` → copy from Supabase dashboard
     - `VITE_SUPABASE_ANON_KEY` → copy from Supabase dashboard
     - `VITE_CLAUDE_API_KEY` (optional, if frontend-based; not recommended)
   - Save

4. **Deploy:**
   - Vercel auto-deploys on `git push` to `main`
   - Or manually click "Deploy" in Vercel dashboard
   - Wait for build to complete (~2–5 min)

5. **Get deployment URL:**
   - Vercel provides: `https://<project-name>.vercel.app`
   - Or custom domain (set up DNS if using custom domain)

#### Option 2: Vercel CLI (Alternative)

```bash
# Install Vercel CLI globally
npm install -g vercel

# In project directory
vercel

# Follow prompts:
# - Link to project (create new or existing)
# - Confirm build settings
# - Set environment variables
# - Deploy

# For production deployment after testing:
vercel --prod
```

### Supabase Production Config

1. **Verify Supabase project is on correct tier:**
   - Free tier: 100k req/month, 1GB storage
   - Check [supabase.com/dashboard](https://supabase.com/dashboard) → Billing
   - For MVP, free tier is fine; monitor usage post-launch

2. **Enable RLS on all user-data tables** (already done in Phase 1):
   - [OK] `time_entries`
   - [OK] `journal_entries`
   - [OK] `chat_messages`
   - [OK] `check_ins`
   - Verify in Supabase dashboard → SQL Editor or Authentication → RLS section

3. **Backup strategy (optional for MVP):**
   - Supabase free tier does NOT include automatic backups
   - For now, data is at-risk; acceptable for MVP (user is sole user)
   - Post-MVP: consider paid tier or manual backups

4. **API Rate Limits:**
   - Supabase free tier: 100k req/month (soft limit, contacts on overage)
   - Verify usage in Supabase dashboard → SQL Editor → "Storage" or "Usage" tab

### Production Verification

#### Step 1: Vercel Site Live Check
```bash
# Verify site is up
curl -I https://<project-name>.vercel.app

# Expected: HTTP/1.1 200 OK
```

#### Step 2: Test Auth Flow in Production
1. Visit `https://<project-name>.vercel.app`
2. Click "Sign Up"
3. Create account with test email (e.g., `test@example.com`, password `TestPass123`)
4. Verify redirect to dashboard
5. Check session persists (refresh page, still logged in)
6. Logout and verify redirect to login
7. Log back in with credentials

#### Step 3: Test Voice Capture in Production
1. Click "New Check-in" or mic button
2. Record: "I woke up at 7 AM, had breakfast for 15 minutes, then worked for 2 hours"
3. Verify transcription appears
4. Verify parsed activities appear (breakfast, work)
5. Verify activities save to timeline
6. Refresh page; verify activities still there

#### Step 4: Test Timeline in Production
1. View today's timeline
2. Verify activities are listed chronologically
3. Verify gaps are flagged (if any)
4. Try editing an activity (click, change name, save)
5. Verify edit is reflected on page and persists after refresh

#### Step 5: Test Journal in Production
1. Open journal entry form
2. Type: "Today was productive"
3. Click save
4. Verify entry appears in history
5. Refresh page; verify entry is still there

#### Step 6: Test Chat in Production
1. Open chat interface
2. Ask: "How much time did I spend working today?"
3. Verify response from Claude (< 15 seconds)
4. Ask another question: "What was my most time-consuming activity?"
5. Verify both responses appear in history

#### Step 7: Check Browser Console
1. Open DevTools → Console
2. Perform all actions above
3. Verify NO red errors (warnings are OK)
4. Verify NO API key leaks in Network tab (Claude API key should not appear in request headers if using backend)

#### Step 8: Test on Tablet/Mobile
1. Open `https://<project-name>.vercel.app` on tablet (iPad, Android)
2. Verify layout is responsive (no horizontal scroll)
3. Verify touch targets are large enough (buttons, inputs)
4. Test one check-in on mobile (full flow)
5. Note: Desktop-first, but should not break on mobile

---

## Documentation Tasks

### README.md

Create `README.md` in project root with:

#### 1. Project Overview
```markdown
# Prohairesis

A personal time-tracking and journaling app. Speak your day, see your time.

**Live:** https://<project-name>.vercel.app
```

#### 2. Features
```markdown
## Features

- **Voice Check-ins:** Speak stream-of-consciousness about your day; Prohairesis parses it into a timeline
- **Timeline:** See activities with durations, flag unaccounted gaps
- **Journal:** Separate text/voice notes, no time association
- **Chat Analytics:** Ask questions about your time data ("What did I spend time on this week?")
- **Supabase Sync:** All data persisted securely, per-user isolation
```

#### 3. Tech Stack
```markdown
## Tech Stack

- **Frontend:** React 18 + Vite, custom CSS
- **Backend:** Supabase (Auth, Postgres, RLS)
- **APIs:** Claude API (parsing & chat), Web Speech API (transcription)
- **Deployment:** Vercel (frontend), Supabase hosted (database)
```

#### 4. Local Setup
```markdown
## Setup (Local Development)

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone repository
   ```bash
   git clone https://github.com/osmol/prohairesis.git
   cd prohairesis
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create `.env.local` in project root (copy from `.env.example`):
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   VITE_CLAUDE_API_KEY=<your-claude-key>
   ```

   **Note:** Do NOT commit `.env.local`. It's in `.gitignore`.

   Get keys from:
   - **Supabase:** Dashboard → Project Settings → API
   - **Claude API:** https://console.anthropic.com/ → API Keys

4. Start development server
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in browser

### Build for Production
```bash
npm run build
# Output: dist/
```

### Deploy to Vercel
```bash
# Via Vercel dashboard: connect GitHub repo, auto-deploys on push

# Or via CLI:
npm install -g vercel
vercel --prod
```
```

#### 5. Usage
```markdown
## Usage

### Creating a Check-in

1. Click the mic button on the dashboard
2. Speak your stream-of-consciousness (e.g., "Woke up at 7, had breakfast for 15 minutes...")
3. Review parsed activities
4. Edit as needed (name, duration, category)
5. Click "Save"

### Viewing Timeline

- Click "Timeline" to see all activities for today/this week
- Timeline shows activities in order with durations
- Gaps > 15 minutes are flagged as "unaccounted"

### Creating Journal Entries

1. Click "Journal"
2. Type or voice-record a note
3. Click "Save"

### Asking Questions (Chat)

1. Click "Chat"
2. Ask a question: "What was I doing most this week?" or "How much time on work?"
3. Claude analyzes your time data and responds

### Editing Activities

1. Click an activity in the timeline
2. Edit name, duration, or category
3. Click "Save" or delete activity
```

#### 6. Environment Variables
```markdown
## Environment Variables

Create `.env.local` with:

| Variable | Source | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API | Supabase API endpoint |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Supabase anonymous key (safe to expose) |
| `VITE_CLAUDE_API_KEY` | Anthropic Console → API Keys | Claude API key (KEEP PRIVATE) |

**Security Note:** Never commit `.env.local`. It's in `.gitignore`.
```

#### 7. Deployment
```markdown
## Deployment

### Vercel (Recommended)

1. **Push code to GitHub** (already connected in Vercel)
2. **Set environment variables:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLAUDE_API_KEY`
   - Save
3. **Deploy:**
   - Vercel auto-deploys on `git push main`
   - Or click "Deploy" in dashboard
4. **Verify:**
   - Visit https://<project-name>.vercel.app
   - Test auth, check-in, chat in production

### Supabase (Hosted)

- Supabase project is already set up
- Free tier: 100k req/month, 1GB storage
- Check usage: Supabase Dashboard → Billing or Storage

**Rate Limits:**
- 100,000 requests/month (free tier)
- Monitor usage during testing and post-launch
- If approaching limit, contact Supabase support or upgrade to paid

### Database Backups

- Supabase free tier does NOT include automatic backups
- For MVP, acceptable (sole user)
- Post-MVP: consider paid tier for backup coverage
```

#### 8. Known Limitations
```markdown
## Known Limitations (MVP)

- **Single User Only:** No multi-user or collaboration support
- **Desktop-First:** Optimized for desktop/tablet; mobile works but not optimized
- **No Automated Tests:** Manual testing only (automated tests can be added post-MVP)
- **No Analytics Dashboards:** Chat-driven queries only
- **No Multi-Turn Chat:** Each chat query is stateless (no conversation history maintained for context)
- **No Notifications:** No reminders for daily check-ins
- **Free Tier Limits:** Supabase free tier has 100k req/month; monitor usage
```

#### 9. Troubleshooting
```markdown
## Troubleshooting

### "Mic button doesn't work"
- Ensure browser has microphone permissions (check browser settings)
- Try Chrome/Chromium (most reliable Web Speech API support)
- Check browser console for errors (F12 → Console)

### "Transcription not appearing"
- Wait 3–5 seconds (Web Speech API can be slow on some devices)
- Check network tab (F12 → Network) to see if transcription request succeeded
- Ensure you spoke clearly and long enough (>1 second)

### "Claude API errors"
- Verify `VITE_CLAUDE_API_KEY` is set in `.env.local`
- Check Claude API dashboard for rate limits or quota
- Check Anthropic dashboard for account status (trial expired?)

### "Can't log in"
- Verify Supabase project is active (check Supabase dashboard)
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check browser console for auth errors
- Try incognito mode (clear cookies/cache)

### "Data not saving"
- Check Supabase RLS policies (Dashboard → SQL Editor → RLS policies should allow INSERT/UPDATE)
- Verify user is authenticated (check browser DevTools → Application → localStorage, should have session)
- Check Supabase Usage (Dashboard → Billing) to ensure rate limit not hit

### "Design looks off on mobile"
- MVP is desktop-first; responsive design may not be perfect on small screens
- Test on tablet (iPad or Android tablet) for better experience
- Post-MVP: optimize for mobile
```

#### 10. Contributing (Optional)
```markdown
## Future Work (Post-MVP)

- [ ] Automated tests (Jest + React Testing Library)
- [ ] Dark mode
- [ ] Multi-turn chat with context awareness
- [ ] Habit insights (most productive hours, patterns)
- [ ] Calendar integration
- [ ] Export data (CSV, JSON)
- [ ] Mobile app (React Native or PWA)
```

#### 11. License (Optional)
```markdown
## License

Personal use only (no open-source license for MVP).
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Production secrets leaked** | Account compromise, API quota stolen | Use Vercel environment variables (not .env.local), verify no secrets in git history before deploy |
| **RLS policies not enabled** | Data cross-user leakage, privacy breach | Manual audit of Supabase RLS on all tables; test with 2 users if possible |
| **Claude API quota exhausted** | Chat feature broken in production | Monitor Claude API dashboard during test phase; upgrade plan if needed |
| **Supabase rate limit hit** | App becomes slow or unresponsive | Monitor Supabase Usage dashboard; plan budget for scaling post-MVP |
| **Web Speech API fails on Safari** | Voice capture broken on 15% of users | Test on Safari early; provide text input fallback if time allows |
| **Responsive design breaks on mobile** | Mobile users see broken layout | Test on mobile before launch; note limitation in README if MVP is desktop-only |
| **Performance issue under load** | Page loads slowly, features lag | Test with realistic data (100+ activities); if slow, optimize Supabase queries or add pagination |
| **Vercel deployment fails** | Site not live | Test deployment in staging; have rollback plan (can quickly redeploy from previous commit) |

---

## Verification Checklist

### Pre-Launch (Before Production Deployment)

- [ ] All tests from "Testing Scope" section completed and passed
- [ ] Security audit checklist completed (RLS, secrets, CORS, auth)
- [ ] All critical bugs fixed
- [ ] Responsive design verified on desktop, tablet, mobile
- [ ] Edge cases tested (empty data, long transcripts, rapid check-ins, deleted activities)
- [ ] Network failure handling tested
- [ ] Browser console is clean (no red errors in DevTools)
- [ ] Environment variables set in Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CLAUDE_API_KEY)
- [ ] git push to main branch (Vercel will auto-deploy)
- [ ] README.md is complete and accurate
- [ ] `.env.example` created (no secrets, keys listed as placeholders)
- [ ] `.env.local` is in `.gitignore` (verified)

### Post-Launch (First 24 Hours)

- [ ] Site is live and accessible (`https://<project-name>.vercel.app`)
- [ ] Auth flow works in production (sign up, log in, logout)
- [ ] Check-in feature works end-to-end (record, transcribe, parse, save, view)
- [ ] Timeline displays correctly with today's activities
- [ ] Journal entries save and display
- [ ] Chat feature works with real data
- [ ] Responsive design verified on production site (mobile, tablet, desktop)
- [ ] Browser console is clean in production
- [ ] No CORS errors in Network tab
- [ ] Supabase Dashboard → Usage shows acceptable request count (not spike)
- [ ] Claude API Dashboard shows reasonable usage
- [ ] Performance is acceptable (pages load < 3s)
- [ ] All success criteria from REQUIREMENTS.md are met

### MVP Success Criteria (from PROJECT.md)

- [ ] User can speak a stream-of-consciousness check-in and see it parsed into a clean timeline with 80%+ accuracy
- [ ] Timeline shows activities + durations, with unaccounted gaps clearly flagged
- [ ] Journal entries persist and are scrollable; user can add text or voice entries
- [ ] Chat feature works: user asks "what did I spend time on this week?" and gets accurate answers from logged data
- [ ] Design passes the "serious designer" test: no Tailwind defaults, no AI scaffolding feel, intentional craft
- [ ] App is fast, feels responsive, desktop-first responsive design
- [ ] User can log in, data is persisted to Supabase, sessions are secure

---

## Post-Launch Monitoring (Week 1)

**Create tasks in backlog (Phase 7+) if issues found:**

1. Check Supabase Usage dashboard daily (request count, storage)
2. Check Claude API billing (usage, costs)
3. Monitor Vercel deployment logs for errors
4. Gather user feedback on design, UX, parsing accuracy
5. Log any bugs found post-launch (prioritize security issues)

---

## Deliverables Checklist

By end of Phase 6:

- [ ] Manual testing completed (all sections above [ok])
- [ ] Security audit completed (RLS, secrets, CORS, auth [ok])
- [ ] All critical bugs fixed
- [ ] Vercel deployment live (`https://<project-name>.vercel.app` live)
- [ ] Supabase production config verified
- [ ] README.md complete and committed
- [ ] `.env.example` created (no actual secrets)
- [ ] All MVP success criteria met
- [ ] Post-launch checklist completed
- [ ] Phase 6 SUMMARY created (optional, for record-keeping)

---

## Timeline Estimate

- **Manual Testing:** 1–1.5 hours (all sections, all browsers)
- **Security Audit:** 0.5–1 hour (verify RLS, secrets, CORS)
- **Bug Fixes:** 0.5–1 hour (fix issues found during testing)
- **Deployment Setup:** 0.5 hour (Vercel + Supabase config)
- **Production Verification:** 0.5–1 hour (test live site, all features)
- **Documentation:** 0.5 hour (README.md, .env.example)

**Total: ~3–4 hours**

---

## Success Outcome

At end of Phase 6, you have:

[OK] A live, tested app at `https://<project-name>.vercel.app`
[OK] All features working: auth, voice capture, timeline, journal, chat
[OK] Secure configuration: RLS enforced, secrets hidden, CORS correct
[OK] Responsive design verified (desktop, tablet, mobile)
[OK] Edge cases and error handling tested
[OK] Documentation for future reference
[OK] Ready to share with users or submit for feedback

**Ship it! [run]**

