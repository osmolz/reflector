# Phase 1 Plan: Backend Setup

**Phase Goal:** Supabase project initialized, auth working, data schema defined and migrated. User can sign up, log in, and access an authenticated app.

**Estimated Total Effort:** 3–4 hours
**Deadline:** End of Day 1 (2026-03-28)

---

## Task Breakdown

### Task 1.1: Create and Configure Supabase Project

**Goal:** Set up a Supabase project, generate API keys, and configure environment variables locally.

**Acceptance criteria:**
- [ ] Supabase project created at https://app.supabase.com
- [ ] Anon/public key and service role key retrieved
- [ ] `.env.local` file in project root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] `supabase` CLI installed and authenticated locally
- [ ] `supabase link` completed (links local project to Supabase cloud)
- [ ] Supabase SQL editor accessible and can run test query (e.g., `SELECT 1;`)

**Implementation steps:**

1. Create a Supabase account (if not already done) at https://app.supabase.com

2. Create a new project:
   - Click "New Project"
   - Name: `reflector-mvp` (or similar)
   - Database password: Generate and save securely (e.g., pass manager)
   - Region: Closest to you or us-east-1
   - Click "Create new project" (wait 2–3 min for DB to initialize)

3. Once project is live, get API keys:
   - Go to **Settings** → **API**
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **Anon (public) key** (starts with `eyJ...`)
   - Save both somewhere secure (note: anon key is public-facing; it's safe to expose)

4. Set up local environment:
   ```bash
   # Create project root if not already done
   mkdir -p ~/reflector
   cd ~/reflector
   npm init -y
   npm install vite react react-dom
   npx vite --version  # Verify Vite is installed
   ```

5. Create `.env.local` in project root:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   **Note:** These are safe to commit (anon key is public-facing by design). Do NOT commit service role key.

6. Install Supabase CLI globally:
   ```bash
   npm install -g supabase
   supabase --version  # Verify
   ```

7. Authenticate CLI with Supabase:
   ```bash
   supabase login
   ```
   This opens a browser to generate an access token. Follow the prompts and paste token back into terminal.

8. Link local project to Supabase cloud:
   ```bash
   supabase link --project-ref <PROJECT_REF>
   ```
   Where `<PROJECT_REF>` is the alphanumeric ID from your Supabase URL (e.g., `xxxxx` in `https://xxxxx.supabase.co`).

9. Verify SQL editor access:
   - Go to Supabase dashboard → SQL Editor
   - Run: `SELECT NOW();`
   - Should return current timestamp

**Estimated effort:** 20 minutes

**Blocks:** Task 1.2 (schema creation depends on Supabase project existing)

---

### Task 1.2: Create Database Schema (Tables and Relationships)

**Goal:** Define and migrate the complete data schema for all 5 tables with proper relationships and constraints.

**Acceptance criteria:**
- [ ] All 5 tables created: `users`, `check_ins`, `time_entries`, `journal_entries`, `chat_messages`
- [ ] Foreign key constraints in place (e.g., `time_entries.user_id` → `users.id`)
- [ ] UUID primary keys on all tables
- [ ] Timestamps (`created_at`, `updated_at`) on all tables
- [ ] Migration file saved locally in `supabase/migrations/` directory
- [ ] Migration successfully runs (visible in Supabase SQL editor)
- [ ] All tables visible in Supabase dashboard → Tables

**Implementation steps:**

1. Create migrations directory:
   ```bash
   supabase migration new create_tables
   ```
   This generates a new migration file in `supabase/migrations/<timestamp>_create_tables.sql`.

2. Edit the migration file with the complete schema. Use this SQL:

   ```sql
   -- Enable UUID extension
   create extension if not exists "uuid-ossp";

   -- Users table (from Supabase Auth)
   -- Note: We don't create this manually; it's managed by Supabase Auth.
   -- But we reference it in foreign keys. If needed, you can add custom columns here.
   -- For MVP, we rely on Supabase Auth's built-in users table.

   -- Check-ins table
   create table if not exists check_ins (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid not null references auth.users(id) on delete cascade,
     transcript text not null,
     parsed_activities jsonb,
     created_at timestamp with time zone default now()
   );

   -- Time entries table
   create table if not exists time_entries (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid not null references auth.users(id) on delete cascade,
     activity_name text not null,
     category text,
     duration_minutes integer not null check (duration_minutes > 0),
     start_time timestamp with time zone not null,
     check_in_id uuid references check_ins(id) on delete set null,
     created_at timestamp with time zone default now(),
     updated_at timestamp with time zone default now()
   );

   -- Journal entries table
   create table if not exists journal_entries (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid not null references auth.users(id) on delete cascade,
     text text not null,
     created_at timestamp with time zone default now()
   );

   -- Chat messages table
   create table if not exists chat_messages (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid not null references auth.users(id) on delete cascade,
     question text not null,
     response text not null,
     created_at timestamp with time zone default now()
   );

   -- Indexes for performance
   create index if not exists idx_check_ins_user_id on check_ins(user_id);
   create index if not exists idx_time_entries_user_id on time_entries(user_id);
   create index if not exists idx_time_entries_start_time on time_entries(start_time);
   create index if not exists idx_journal_entries_user_id on journal_entries(user_id);
   create index if not exists idx_chat_messages_user_id on chat_messages(user_id);
   ```

3. Save the migration file and push to Supabase:
   ```bash
   supabase db push
   ```
   This applies the migration to your cloud Supabase instance. Wait for confirmation.

4. Verify schema in Supabase dashboard:
   - Go to **Tables** in Supabase dashboard
   - You should see: `check_ins`, `time_entries`, `journal_entries`, `chat_messages`
   - Click each table to verify columns and types match the SQL above

5. Test foreign key integrity (optional but good verification):
   - In SQL editor, run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
   - Should list all 4 tables you created

**Estimated effort:** 30 minutes

**Blocks:** Task 1.3 (RLS policies depend on tables existing)

**Gotchas:**
- The `users` table is managed by Supabase Auth. Do NOT create it manually. Foreign keys reference `auth.users`.
- Timestamps must be `timestamp with time zone` to avoid timezone confusion later.
- `on delete cascade` ensures that if a user is deleted, all their data is cleaned up.

---

### Task 1.3: Enable and Configure Row-Level Security (RLS) Policies

**Goal:** Configure RLS on all tables to enforce per-user data isolation. Users can only read/write their own rows.

**Acceptance criteria:**
- [ ] RLS enabled on all 4 data tables (`check_ins`, `time_entries`, `journal_entries`, `chat_messages`)
- [ ] SELECT policy: Users can only read rows where `user_id` matches their authenticated ID
- [ ] INSERT policy: Users can only insert rows with their own `user_id`
- [ ] UPDATE policy: Users can only update rows where `user_id` matches their authenticated ID
- [ ] DELETE policy: Users can only delete rows where `user_id` matches their authenticated ID
- [ ] All policies are set to **`using` AND `with` check**` to enforce both read and write constraints
- [ ] Policies tested in SQL editor with test user ID

**Implementation steps:**

1. Enable RLS on each table. In Supabase SQL editor, run:

   ```sql
   -- Enable RLS on all tables
   alter table check_ins enable row level security;
   alter table time_entries enable row level security;
   alter table journal_entries enable row level security;
   alter table chat_messages enable row level security;
   ```

2. Create policies. For each table, create 4 policies (SELECT, INSERT, UPDATE, DELETE). Example for `check_ins`:

   ```sql
   -- check_ins: SELECT policy
   create policy "Users can view their own check-ins"
   on check_ins for select
   using (auth.uid() = user_id);

   -- check_ins: INSERT policy
   create policy "Users can create their own check-ins"
   on check_ins for insert
   with check (auth.uid() = user_id);

   -- check_ins: UPDATE policy
   create policy "Users can update their own check-ins"
   on check_ins for update
   using (auth.uid() = user_id)
   with check (auth.uid() = user_id);

   -- check_ins: DELETE policy
   create policy "Users can delete their own check-ins"
   on check_ins for delete
   using (auth.uid() = user_id);
   ```

3. Repeat for `time_entries`, `journal_entries`, `chat_messages`. Replace `check_ins` table name in each policy.

   **Complete set of all 16 policies (4 per table):**

   ```sql
   -- TIME_ENTRIES policies
   create policy "Users can view their own time entries"
   on time_entries for select
   using (auth.uid() = user_id);

   create policy "Users can create their own time entries"
   on time_entries for insert
   with check (auth.uid() = user_id);

   create policy "Users can update their own time entries"
   on time_entries for update
   using (auth.uid() = user_id)
   with check (auth.uid() = user_id);

   create policy "Users can delete their own time entries"
   on time_entries for delete
   using (auth.uid() = user_id);

   -- JOURNAL_ENTRIES policies
   create policy "Users can view their own journal entries"
   on journal_entries for select
   using (auth.uid() = user_id);

   create policy "Users can create their own journal entries"
   on journal_entries for insert
   with check (auth.uid() = user_id);

   create policy "Users can update their own journal entries"
   on journal_entries for update
   using (auth.uid() = user_id)
   with check (auth.uid() = user_id);

   create policy "Users can delete their own journal entries"
   on journal_entries for delete
   using (auth.uid() = user_id);

   -- CHAT_MESSAGES policies
   create policy "Users can view their own chat messages"
   on chat_messages for select
   using (auth.uid() = user_id);

   create policy "Users can create their own chat messages"
   on chat_messages for insert
   with check (auth.uid() = user_id);

   create policy "Users can update their own chat messages"
   on chat_messages for update
   using (auth.uid() = user_id)
   with check (auth.uid() = user_id);

   create policy "Users can delete their own chat messages"
   on chat_messages for delete
   using (auth.uid() = user_id);
   ```

4. Verify policies are enabled:
   - In Supabase dashboard, go to **Authentication** → **Policies**
   - You should see 16 policies listed (4 per table)
   - Each table should show "RLS enabled" status

5. Test RLS enforcement (optional but critical for security):
   - In SQL editor, run:
     ```sql
     -- This should return 0 rows because we're not authenticated
     select * from check_ins;
     ```
   - You should get an error like "new row violates row-level security policy".
   - This confirms RLS is working.

**Estimated effort:** 25 minutes

**Blocks:** Task 1.4 (React auth setup uses RLS-protected tables)

**Critical gotchas:**
- RLS is **not optional**. Without it, any user could query any other user's data.
- `auth.uid()` is Supabase's function that returns the authenticated user's ID. It returns `NULL` if not authenticated.
- `with check` is required for INSERT/UPDATE to prevent users from inserting rows with other users' IDs.
- If RLS is not enabled, queries will not be protected. Verify in dashboard.

---

### Task 1.4: Set Up React App Skeleton with Auth Context

**Goal:** Create a basic React app with authentication integrated. Users can sign up, log in, and see their authenticated state.

**Acceptance criteria:**
- [ ] React + Vite app scaffold exists with TypeScript (optional but recommended)
- [ ] Supabase client initialized in `src/lib/supabase.ts` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] AuthContext or global state (Zustand recommended) tracks authenticated user and session
- [ ] Auth context loads persisted session on app startup (checks localStorage)
- [ ] Sign-up form with email/password inputs that calls `supabase.auth.signUp()`
- [ ] Login form with email/password inputs that calls `supabase.auth.signIn()`
- [ ] Logout function that calls `supabase.auth.signOut()`
- [ ] Protected route/component that shows authenticated user's email (or "Not logged in")
- [ ] App renders without errors; console has no Supabase errors

**Implementation steps:**

1. Create React + Vite scaffold (with TypeScript):
   ```bash
   npm create vite@latest reflector -- --template react-ts
   cd reflector
   npm install
   npm install @supabase/supabase-js zustand
   npm install -D @types/node
   ```

2. Create Supabase client in `src/lib/supabase.ts`:

   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. Create auth store in `src/store/authStore.ts` (using Zustand):

   ```typescript
   import { create } from 'zustand';
   import { supabase } from '../lib/supabase';

   interface AuthState {
     user: any | null;
     loading: boolean;
     signUp: (email: string, password: string) => Promise<void>;
     signIn: (email: string, password: string) => Promise<void>;
     signOut: () => Promise<void>;
     checkAuth: () => Promise<void>;
   }

   export const useAuthStore = create<AuthState>((set) => ({
     user: null,
     loading: true,

     signUp: async (email: string, password: string) => {
       const { data, error } = await supabase.auth.signUp({
         email,
         password,
       });
       if (error) throw error;
       set({ user: data.user });
     },

     signIn: async (email: string, password: string) => {
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
       if (error) throw error;
       set({ user: data.user });
     },

     signOut: async () => {
       const { error } = await supabase.auth.signOut();
       if (error) throw error;
       set({ user: null });
     },

     checkAuth: async () => {
       try {
         const { data, error } = await supabase.auth.getSession();
         if (error) throw error;
         set({ user: data.session?.user || null, loading: false });
       } catch (err) {
         console.error('Auth check failed:', err);
         set({ loading: false });
       }
     },
   }));
   ```

4. Create an AuthProvider component in `src/components/AuthProvider.tsx`:

   ```typescript
   import { useEffect } from 'react';
   import { useAuthStore } from '../store/authStore';

   export function AuthProvider({ children }: { children: React.ReactNode }) {
     const checkAuth = useAuthStore((state) => state.checkAuth);

     useEffect(() => {
       checkAuth();
     }, [checkAuth]);

     return <>{children}</>;
   }
   ```

5. Create a simple Auth UI in `src/components/Auth.tsx`:

   ```typescript
   import { useState } from 'react';
   import { useAuthStore } from '../store/authStore';

   export function Auth() {
     const { user, signUp, signIn, signOut } = useAuthStore();
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [mode, setMode] = useState<'login' | 'signup'>('login');

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       try {
         if (mode === 'signup') {
           await signUp(email, password);
           alert('Sign up successful! Please check your email to confirm.');
         } else {
           await signIn(email, password);
         }
       } catch (err) {
         alert(`Error: ${err.message}`);
       }
     };

     if (user) {
       return (
         <div>
           <p>Logged in as: {user.email}</p>
           <button onClick={signOut}>Log Out</button>
         </div>
       );
     }

     return (
       <form onSubmit={handleSubmit}>
         <input
           type="email"
           placeholder="Email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           required
         />
         <input
           type="password"
           placeholder="Password"
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           required
         />
         <button type="submit">{mode === 'login' ? 'Log In' : 'Sign Up'}</button>
         <button
           type="button"
           onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
         >
           Switch to {mode === 'login' ? 'Sign Up' : 'Log In'}
         </button>
       </form>
     );
   }
   ```

6. Update `src/App.tsx`:

   ```typescript
   import { AuthProvider } from './components/AuthProvider';
   import { Auth } from './components/Auth';

   function App() {
     return (
       <AuthProvider>
         <div>
           <h1>Reflector</h1>
           <Auth />
         </div>
       </AuthProvider>
     );
   }

   export default App;
   ```

7. Ensure `.env.local` is set (from Task 1.1) and run the dev server:
   ```bash
   npm run dev
   ```

8. Open http://localhost:5173 and verify:
   - App loads without errors in browser console
   - Sign up form appears
   - You can enter email/password and click "Sign Up" (or "Log In" if you switch modes)

**Estimated effort:** 45 minutes

**Blocks:** Task 1.5 (testing auth flow)

**Gotchas:**
- Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are in `.env.local`, not `.env`. Vite only loads `.env.local` for client-side.
- Supabase auth requires email confirmation by default. You can disable it in Supabase dashboard → Authentication → Providers → Email if you want instant signup.
- `checkAuth()` in the AuthProvider will check if there's an existing session in localStorage. This is critical for persistence across page reloads.

---

### Task 1.5: Test and Verify Auth Flow End-to-End

**Goal:** Confirm that sign up, login, logout, and session persistence all work correctly.

**Acceptance criteria:**
- [ ] User can sign up with a valid email/password
- [ ] Email confirmation is handled (either instant or user checks email inbox for confirmation link)
- [ ] User can log in with the same credentials
- [ ] Authenticated state shows user's email after login
- [ ] User can log out and authenticated state clears
- [ ] Session persists across page refresh (reload the page after login; user should still be logged in)
- [ ] Invalid credentials (wrong email or password) return an error message
- [ ] No errors in browser console or Network tab for auth requests

**Implementation steps:**

1. Start the dev server (if not already running):
   ```bash
   npm run dev
   ```

2. Test sign-up flow:
   - Visit http://localhost:5173
   - Click "Switch to Sign Up" to enter sign-up mode
   - Enter a test email (e.g., `test@example.com`) and password (e.g., `TestPass123`)
   - Click "Sign Up"
   - **Expected:** Alert says "Sign up successful! Please check your email to confirm."
   - Check Supabase dashboard → Authentication → Users. You should see the new user listed.

3. Test email confirmation (if required):
   - If Supabase requires email confirmation:
     - Go to Supabase dashboard → Authentication → Providers → Email
     - If you see "Confirm email" enabled, you need to verify email
     - For testing, you can disable this in the dashboard (toggle "Confirm email" off) and sign up again, OR
     - Use a service like Mailtrap or Ethereal to intercept emails during testing
     - For MVP, **disable email confirmation** to speed up testing:
       - Dashboard → Authentication → Providers → Email
       - Toggle "Confirm email" OFF
       - Then re-test sign-up (you should be able to log in immediately)

4. Test login flow:
   - Refresh the page (or switch to "Log In" mode if you're still on sign-up)
   - Enter the same email and password
   - Click "Log In"
   - **Expected:** The auth UI changes to show "Logged in as: test@example.com" and a "Log Out" button

5. Test session persistence:
   - While logged in, press F5 (refresh page)
   - **Expected:** You should still see "Logged in as: test@example.com" (session is restored from localStorage)
   - **Not expected:** "Not logged in" or auth form re-appearing

6. Test logout:
   - Click "Log Out"
   - **Expected:** Auth form reappears, user is no longer shown

7. Test invalid credentials:
   - Try logging in with email `invalid@example.com` and any password
   - **Expected:** Alert or error message appears (e.g., "Invalid login credentials")

8. Check browser console and Network tab:
   - Open DevTools (F12)
   - Go to Network tab
   - Repeat sign-up and login
   - All requests to `api.supabase.co` should be 2xx or 401 (not 5xx)
   - Console should have no red errors related to auth

**Estimated effort:** 30 minutes

**Verification checklist for this task:**
- [ ] Sign-up creates a new user in Supabase Auth
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong credentials fails gracefully
- [ ] Logout clears authenticated state
- [ ] Session persists after page refresh
- [ ] No console errors

---

## Dependency Graph

```
Task 1.1: Supabase Setup
    ↓
Task 1.2: Schema Creation
    ↓
Task 1.3: RLS Policies
    ↓
Task 1.4: React Auth Setup
    ↓
Task 1.5: Auth Testing
```

All tasks are sequential. Task 1.1 must complete before 1.2. Task 1.2 before 1.3. Task 1.3 before 1.4 (because the auth store needs to access RLS-protected tables). Task 1.4 before 1.5 (testing depends on the app being built).

---

## Effort Summary

| Task | Effort | Cumulative |
|------|--------|-----------|
| 1.1: Supabase Setup | 20 min | 20 min |
| 1.2: Schema Creation | 30 min | 50 min |
| 1.3: RLS Policies | 25 min | 75 min |
| 1.4: React Auth Setup | 45 min | 120 min |
| 1.5: Auth Testing | 30 min | 150 min |
| **Total** | **150 min (2.5 hours)** | — |

**Note:** This is well within the 3–4 hour estimate. Buffer for debugging, clarifications, or unexpected issues (e.g., Supabase region latency).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Supabase account creation fails** | Blocks everything | Use existing account if you have one; test with free tier. Supabase is very reliable. |
| **`supabase link` fails or times out** | Can't push migrations | Run `supabase link --project-ref <ID>` with correct project ID. If times out, try again. |
| **RLS policies prevent test user from accessing tables** | Can't save/load data in Phase 2 | This is by design (security). Policies are tested in Task 1.5 with authenticated user. No data should be visible before login. |
| **React + Supabase client has version conflicts** | Build fails or runtime errors | Use the exact npm packages recommended: `@supabase/supabase-js` (latest) + React 18. Avoid React 17 or Supabase old versions. |
| **Email confirmation blocks signup testing** | Can't test signup flow quickly | Disable "Confirm email" in Supabase dashboard → Authentication → Providers → Email for MVP testing. Re-enable later if needed. |
| **Environment variables not loaded** | App can't connect to Supabase | Ensure `.env.local` exists in project root (not `.env`). Vite requires the `.local` suffix for client-side env vars. Restart dev server after adding `.env.local`. |
| **Web Speech API not tested (out of scope for Phase 1, but plan to test in Phase 2)** | Voice feature may not work in some browsers | Deferred to Phase 2. For now, focus on auth and schema. |

---

## Verification Checklist (End of Phase 1)

**Core Backend:**
- [ ] Supabase project created and accessible at https://app.supabase.com
- [ ] `.env.local` exists with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] `supabase` CLI linked to cloud project (`supabase link --project-ref` successful)

**Database:**
- [ ] Schema migration applied (`supabase db push` successful)
- [ ] All 4 tables exist: `check_ins`, `time_entries`, `journal_entries`, `chat_messages`
- [ ] All tables have UUID primary keys and timestamps
- [ ] Foreign key constraints in place (columns reference `auth.users(id)`)
- [ ] Indexes created on `user_id` and relevant lookup columns

**Security:**
- [ ] RLS enabled on all 4 tables (Supabase dashboard → Tables shows "RLS" badge)
- [ ] All 16 policies created and visible in dashboard (4 per table: SELECT, INSERT, UPDATE, DELETE)
- [ ] SELECT policy ensures users can only query their own rows
- [ ] INSERT policy prevents inserting rows with other users' `user_id`
- [ ] UPDATE and DELETE policies similarly restricted to user's own rows

**React App & Auth:**
- [ ] React + Vite app runs without errors (`npm run dev` works)
- [ ] Supabase client initialized in `src/lib/supabase.ts`
- [ ] Auth store (Zustand) created with `signUp`, `signIn`, `signOut` functions
- [ ] Sign-up form works: user can create account with email/password
- [ ] Login form works: user can log in with correct credentials
- [ ] Logout works: user can clear session
- [ ] Session persists across page reload (localStorage integration)
- [ ] Invalid credentials return an error (no silent failures)

**Testing:**
- [ ] Tested sign-up → user appears in Supabase Auth
- [ ] Tested login → authenticated state shows user email
- [ ] Tested logout → authenticated state clears
- [ ] Tested session persistence → reload page while logged in, user still logged in
- [ ] Console has no auth-related errors
- [ ] Network requests to Supabase API are 2xx (not 5xx)

**Documentation:**
- [ ] `.env.local` documented in a local README or notes (don't commit it, but note the required keys)
- [ ] Database migration file checked into git (in `supabase/migrations/`)
- [ ] Notes on RLS policies (for reference when onboarding or auditing)

---

## Next Steps (Phase 2)

Once Phase 1 is complete and verified:

1. Commit all changes to git:
   ```bash
   git add .
   git commit -m "Phase 1: Backend setup (Supabase auth, schema, RLS)"
   ```

2. Start Phase 2: Voice Capture & Parsing
   - Integrate Web Speech API for recording
   - Create endpoint to send transcript to Claude API
   - Implement review screen for parsed activities
   - Save activities to `time_entries` and `check_ins`

---

## Gotchas Summary

1. **Environment variables:** Use `.env.local`, not `.env`. Restart dev server after creating it.
2. **RLS is strict by design:** Users can't see other users' data. This is correct and secure.
3. **Email confirmation can slow down testing:** Disable it in Supabase dashboard for MVP.
4. **Foreign keys reference `auth.users`, not a `users` table you create.** Supabase Auth manages the users table.
5. **`supabase db push` applies migrations to cloud.** Always test migrations locally first with `supabase start` (local docker instance) if you want to be extra cautious.
6. **Session persistence relies on `checkAuth()` in the AuthProvider.** Without it, users will be logged out after a page refresh.
7. **Zustand is optional.** You can use React Context or Redux instead. Zustand is lightweight and sufficient for MVP.
