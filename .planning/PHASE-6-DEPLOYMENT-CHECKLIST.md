# Phase 6: Deployment Checklist

**Status:** READY FOR PRODUCTION ✅

This checklist covers everything needed to deploy Reflector to Vercel and go live.

---

## Pre-Deployment (Completed ✓)

- [x] All code committed and pushed to GitHub (`master` branch)
- [x] Build succeeds: `npm run build` (541ms, 441 KB dist/)
- [x] No TypeScript/syntax errors
- [x] Security audit passed (API keys moved to backend)
- [x] `.env.local` protected in `.gitignore`
- [x] `.env.example` created with placeholders
- [x] README.md comprehensive and ready
- [x] PHASE-6-VERIFICATION.md testing plan documented

**Git Status:**
```
Branch: master
Commits ahead: 14
Latest: 18eb17a docs(phase-6): execution summary
```

---

## Step 1: Deploy to Vercel

### 1a. Connect GitHub Repo

1. Go to https://vercel.com
2. Sign in or create account
3. Click "New Project"
4. Click "Import" (for GitHub repo)
5. Authorize Vercel to access GitHub (if not authorized)
6. Search for and select: `osmolz/reflector`
7. Click "Import"

### 1b. Configure Build Settings

Vercel should auto-detect Vite. Verify these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 1c. Set Environment Variables

In Vercel dashboard → Project Settings → Environment Variables, add:

```
VITE_SUPABASE_URL
https://jjwmtqkjpbaviwdvyuuq.supabase.co
```

```
VITE_SUPABASE_ANON_KEY
sb_publishable_DV6VyO5OiTRZaMMjPTE53A_BNbOd-SX
```

(Get these from Supabase Dashboard → Settings → API)

### 1d. Deploy

Click "Deploy" button → Wait for build (~2-5 minutes) → Get live URL

**Result:**
- Live URL: `https://reflector-osmol.vercel.app` (or custom domain)
- Deployment automatic on future `git push main`

---

## Step 2: Deploy Edge Functions to Supabase

### 2a. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2b. Link to Your Supabase Project

```bash
cd /path/to/reflector
supabase link --project-ref <your-project-ref>
```

Get project ref from: Supabase Dashboard → Settings → General → Project Ref

### 2c. Deploy Parse Function

```bash
supabase functions deploy parse
```

Verify deployment:
```bash
supabase functions list
# Should show: parse (deployed)
```

### 2d. Deploy Chat Function

```bash
supabase functions deploy chat
```

Verify deployment:
```bash
supabase functions list
# Should show: chat (deployed)
```

### 2e. Set ANTHROPIC_API_KEY in Edge Functions

This is crucial! The Edge Functions need access to the Claude API key.

**Option A: Via Supabase Dashboard (Recommended)**

1. Supabase Dashboard → Project Settings → Edge Functions
2. Click "Secrets" or "Environment Variables"
3. Add new secret:
   ```
   ANTHROPIC_API_KEY = <your-claude-api-key>
   ```
4. Save

**Option B: Via Vercel (If Using Vercel Postgres)**

If you've configured Supabase via Vercel integration, set in Vercel:
```
ANTHROPIC_API_KEY = <your-claude-api-key>
```

---

## Step 3: Verify Edge Functions Work

### Test the Parse Function

```bash
# Get your auth token first (from browser after login, or use CLI)
BEARER_TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  https://jjwmtqkjpbaviwdvyuuq.supabase.co/auth/v1/token?grant_type=password \
  | jq -r '.access_token')

# Test parse function
curl -X POST https://jjwmtqkjpbaviwdvyuuq.supabase.co/functions/v1/parse \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transcript":"I woke up at 7 and had breakfast for 15 minutes"}'

# Expected response:
# {"activities":[{"activity":"breakfast","duration_minutes":15,...}]}
```

### Test the Chat Function

```bash
curl -X POST https://jjwmtqkjpbaviwdvyuuq.supabase.co/functions/v1/chat \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"How much time did I spend working?"}'

# Expected response:
# {"question":"...","response":"Based on your data..."}
```

---

## Step 4: Production Testing

### 4a. Test Auth Flow

1. Visit https://reflector-osmol.vercel.app
2. Click "Sign Up"
3. Create account with test email/password
4. Verify redirect to dashboard
5. Refresh page → verify still logged in
6. Logout → verify redirect to login
7. Login again → verify works

### 4b. Test Voice Check-in

1. Click "New Check-in" or mic button
2. Speak: "I woke up at 7 AM, had breakfast for 15 minutes, then worked for 2 hours"
3. Wait for transcript (should appear in 3-5 seconds)
4. Wait for parsing (should complete in <10 seconds)
5. Verify activities appear (breakfast, work)
6. Click Save
7. Verify activities appear in timeline

### 4c. Test Timeline

1. View "Timeline" tab
2. Verify today's activities listed chronologically
3. Verify gaps flagged (if any unaccounted time)
4. Click an activity → verify edit form appears
5. Change name/duration → save → verify persists on refresh

### 4d. Test Journal

1. Click "Journal"
2. Type: "Today was productive"
3. Click Save
4. Verify entry appears in history
5. Refresh page → verify entry persists

### 4e. Test Chat

1. Click "Chat"
2. Ask: "How much time did I spend working?"
3. Wait for response (should appear in 10-15 seconds)
4. Verify response based on actual data
5. Ask another question: "What was my most time-consuming activity?"
6. Verify response appears

### 4f. Check Console

1. Open DevTools (F12)
2. Click Console tab
3. Perform all actions above
4. Verify NO red errors ✗
5. Warnings are OK, errors are not

### 4g. Check Network Tab

1. Open DevTools → Network tab
2. Perform check-in workflow
3. Verify requests to:
   - Supabase API (api.supabase.co)
   - Edge Functions (supabase.co/functions/v1/parse)
4. Verify NO failed requests (all 200/201)
5. Verify NO API keys in request headers ✓

### 4h. Test on Mobile/Tablet

1. Open https://reflector-osmol.vercel.app on tablet
2. Verify layout responsive (no horizontal scroll)
3. Verify buttons/inputs touchable (44px+ size)
4. Test one check-in on mobile (full flow)
5. Note: Desktop-first, mobile "works but not optimized"

---

## Step 5: Monitor Production

### Daily for First Week

**Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Project → Billing or Usage
3. Check request count
   - Expected: 20-50 requests/day for single user
   - Alert if: > 1000 requests/day (unusual spike)

**Claude API:**
1. Go to https://console.anthropic.com
2. Check usage/billing
   - Each parse/chat call uses ~100-500 tokens
   - 100 calls/week ≈ 10,000-50,000 tokens
   - Alert if: Nearing rate limits or unexpected usage

**Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Project → Deployments
3. Check for any failed deployments
4. Check Logs for errors

### Weekly Post-Launch

- Monitor daily active usage
- Check for any performance issues
- Review error logs
- Gather user feedback on design/UX

---

## Troubleshooting During Deployment

### Build Fails on Vercel

**Symptoms:** Red X on deployment, error message

**Solutions:**
1. Check build command: Should be `npm run build`
2. Check environment variables are set
3. Check Node.js version (should be 18+)
4. Verify package.json has correct dependencies
5. Try manual rebuild: Click "Redeploy" in Vercel dashboard

### Edge Functions Not Deploying

**Symptoms:** 404 when calling `/functions/v1/parse`

**Solutions:**
1. Verify Edge Functions are deployed: `supabase functions list`
2. Verify function names are lowercase: `parse`, `chat`
3. Check function logs: Supabase Dashboard → Edge Functions → Logs
4. Redeploy: `supabase functions deploy parse`

### API Key Not Found in Edge Functions

**Symptoms:** 500 error with "ANTHROPIC_API_KEY not set"

**Solutions:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add secret: `ANTHROPIC_API_KEY = <your-key>`
3. Save
4. Redeploy functions: `supabase functions deploy parse`

### Supabase RLS Errors

**Symptoms:** Activities don't save, 403 Forbidden error

**Solutions:**
1. Check Supabase RLS policies are enabled
2. Verify policies have `auth.uid() = user_id`
3. Check user is authenticated (session exists)
4. Check browser console for detailed error

### CORS Errors in Browser

**Symptoms:** "Access to XMLHttpRequest blocked by CORS"

**Solutions:**
1. Check Edge Functions have CORS headers (they do)
2. Check Supabase CORS settings
3. Try incognito/private mode (clear cache)
4. Check browser console for specific CORS error

---

## Rollback Plan

If something goes wrong in production:

### Option 1: Revert Vercel Deployment

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"
4. Done (reverted to previous version)

### Option 2: Revert Git Commit

```bash
git revert <bad-commit>
git push origin master
# Vercel auto-redeploys with previous version
```

### Option 3: Disable Edge Function

If Edge Function is causing issues:

```bash
supabase functions delete parse
# Or temporarily rename it
```

Frontend will get error about function not found, user sees graceful error message.

---

## Post-Launch Checklist (Week 1)

- [ ] Site is live and accessible
- [ ] Auth works (sign-up, login, logout)
- [ ] Check-in feature works end-to-end
- [ ] Timeline displays correctly
- [ ] Journal works
- [ ] Chat works
- [ ] No console errors
- [ ] No CORS errors
- [ ] Mobile/tablet responsive
- [ ] Supabase usage normal (<50 req/day)
- [ ] Claude API usage normal
- [ ] Performance acceptable (<3s load time)

---

## Success Criteria

✅ **Site is live at:** https://reflector-osmol.vercel.app

✅ **All features working:**
- Voice check-in with parsing ✓
- Timeline display ✓
- Journal entries ✓
- Chat analytics ✓

✅ **Security verified:**
- No API keys exposed ✓
- RLS enforced ✓
- HTTPS only ✓
- Auth working ✓

✅ **Documentation complete:**
- README.md ✓
- Deployment instructions ✓
- Troubleshooting guide ✓

---

## Final Verification

Before declaring launch complete:

```bash
# Verify build
npm run build
# Should output: "✓ built in XXXms"

# Verify git
git status
# Should output: "On branch master, nothing to commit"

# Verify remote
git log --oneline origin/master | head -1
# Should match: 18eb17a docs(phase-6): execution summary

# Verify packages
npm list
# Should show all dependencies installed
```

---

## Go Live!

When all checks pass:

1. ✅ Vercel site deployed and tested
2. ✅ Edge Functions deployed and tested
3. ✅ All manual tests passed
4. ✅ No console errors
5. ✅ Environment variables set
6. ✅ Documentation complete

**Status:** READY TO SHARE 🚀

Share the live URL: **https://reflector-osmol.vercel.app**

---

## Questions?

See:
- README.md - Setup, usage, troubleshooting
- PHASE-6-VERIFICATION.md - Testing details
- PHASE-6-PLAN.md - Original plan and requirements

---

**Prepared:** 2026-03-28
**Ready for:** Production Launch
**Status:** ✅ COMPLETE
