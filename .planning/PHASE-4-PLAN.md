# Phase 4 Plan: Chat Analytics

**Phase Goal:** User can ask questions about their time data and get answers from Claude.

**Estimated Total Effort:** 4–5 hours
**Timeline:** Assumes Phase 1 (auth), Phase 2 (time entries), and Phase 3 (editing) are complete
**Blocks:** Phase 5 (design polish)
**Depends on:** Phase 1 (auth) + Phase 2 (time entries exist)

---

## Objective

Enable users to query their logged time data conversationally through a chat interface. Each query is stateless: Claude receives the full user time_entries for a date range, processes the user's question, and returns a natural language response. Chat history is persisted to Supabase.

**Purpose:** Unlock analytics and insight without building a dashboard. User asks, Claude answers from real data.

**Output:**
- Chat UI component with input, send button, scrollable history
- API endpoint to fetch time_entries and forward to Claude API
- Chat messages persisted to Supabase `chat_messages` table
- Functional chat flow: user question → Claude response → display + save

---

## Execution Context

This plan assumes you have:
- Phase 1 complete: Auth working, RLS policies in place
- Phase 2 complete: `time_entries` table populated with user data
- Phase 3 complete: User can edit/delete activities
- React + Vite scaffold from Phase 1
- Zustand store for auth state
- Supabase client initialized
- `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and NEW: `VITE_ANTHROPIC_API_KEY`

**Critical:** You must obtain a Claude API key from Anthropic (https://console.anthropic.com). Store it in `.env.local` as `VITE_ANTHROPIC_API_KEY`. This key will be used in a backend API route, NOT in the client-side code (to avoid exposing it).

---

## Context & Data Model

### Time Entries (from Phase 2)
```typescript
// From Supabase time_entries table
interface TimeEntry {
  id: string;
  user_id: string;
  activity_name: string;
  category: string;
  duration_minutes: number;
  start_time: string; // ISO 8601 timestamp
  check_in_id: string | null;
  created_at: string;
  updated_at: string;
}
```

### Chat Messages Table (Phase 1 schema)
```typescript
interface ChatMessage {
  id: string;
  user_id: string;
  question: string;
  response: string;
  created_at: string;
}
```

### Claude API
- Endpoint: `https://api.anthropic.com/v1/messages` (Claude 3 Sonnet or Opus)
- Model: `claude-3-5-sonnet-20241022` (or latest stable)
- Input: System prompt + user's time data formatted as context + user's question
- Output: Natural language response with facts, figures, analysis

---

## Task Breakdown

### Task 4.1: Create Chat UI Component with Local State

**Goal:** Build a functional chat interface with input, send button, and scrollable message history. Messages stored in local state only (no persistence yet).

**Files:**
- `src/components/Chat.tsx` (new)
- `src/types/chat.ts` (new, type definitions)

**Action:**

1. Create `src/types/chat.ts` with type definitions:
   ```typescript
   export interface ChatMessage {
     id: string;
     question: string;
     response: string;
     created_at: string;
   }

   export interface ChatState {
     messages: ChatMessage[];
     loading: boolean;
     error: string | null;
   }
   ```

2. Create `src/components/Chat.tsx` with:
   - Input field for user's question
   - Send button (disabled while loading)
   - Scrollable message history showing Q&A pairs
   - Loading state (show "Claude is thinking..." while processing)
   - Error state (display error message if API fails)
   - Use local state (useState) to hold messages; do NOT call API yet
   - Style minimally (use semantic HTML, styled components or basic CSS module)
   - Messages should scroll to bottom when new message added
   - Example: user types "What did I spend most time on this week?" → sends (local only) → shows "Claude is thinking..." → (TODO: API will fill this)

3. Local state management (useState):
   ```typescript
   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [input, setInput] = useState('');
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

4. Send handler (for now, only updates local state—no API call):
   ```typescript
   const handleSend = async () => {
     if (!input.trim()) return;

     const userMessage = {
       id: Date.now().toString(),
       question: input,
       response: '', // Will be filled by API (Task 4.2)
       created_at: new Date().toISOString(),
     };

     setMessages((prev) => [...prev, userMessage]);
     setInput('');
     setLoading(true);
     setError(null);
     // TODO: Call API here (Task 4.2)
   };
   ```

5. Render logic:
   - Show all past messages (questions only for now, responses will come in Task 4.2)
   - Show input field + send button
   - Show loading indicator while `loading` is true
   - Show error banner if `error` is set

**Verify:**
- `npm run dev` starts without errors
- Chat component renders in app (add to main layout or route)
- User can type in input field
- Send button works (adds message to local history)
- Message history scrolls to bottom on new message
- Loading state shows while message is pending

**Done:** Chat component functional with local state. No API calls yet. Component is ready for Task 4.2.

---

### Task 4.2: Create Backend API Route for Claude Integration

**Goal:** Build a Node.js/Edge Function endpoint that receives a user question, fetches their time_entries, sends to Claude API, and returns the response.

**Files:**
- `src/app/api/chat/route.ts` (new, or equivalent for your backend)

**Alternative backend paths:**
- If using Vercel Edge Functions: `api/chat.ts`
- If using Express backend: `server/routes/chat.ts`
- If using Supabase Edge Functions: `supabase/functions/chat/index.ts`

This plan assumes **Vercel Edge Function** (simplest for Vercel deployment). Adjust path if using different backend.

**Action:**

1. Create `src/app/api/chat/route.ts` (or equivalent):

   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import Anthropic from '@anthropic-ai/sdk';
   import { NextRequest, NextResponse } from 'next/server';

   export const runtime = 'nodejs'; // Use Node runtime (not edge) for Anthropic SDK

   export async function POST(request: NextRequest) {
     try {
       // Parse request body
       const { question, dateRange } = await request.json();
       if (!question) {
         return NextResponse.json(
           { error: 'Question is required' },
           { status: 400 }
         );
       }

       // Get authenticated user from request headers
       // (Vercel middleware should inject user info, or use Supabase auth)
       const authHeader = request.headers.get('authorization');
       if (!authHeader) {
         return NextResponse.json(
           { error: 'Unauthorized' },
           { status: 401 }
         );
       }

       // Extract Bearer token and verify with Supabase
       const token = authHeader.replace('Bearer ', '');
       const supabase = createClient(
         process.env.VITE_SUPABASE_URL || '',
         process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Use service role for server-side queries
       );

       const { data: { user }, error: authError } = await supabase.auth.getUser(token);
       if (authError || !user) {
         return NextResponse.json(
           { error: 'Unauthorized' },
           { status: 401 }
         );
       }

       // Fetch user's time_entries for the date range
       // Default: last 30 days
       const endDate = new Date();
       const startDate = new Date(endDate);
       startDate.setDate(startDate.getDate() - 30);

       const { data: timeEntries, error: dbError } = await supabase
         .from('time_entries')
         .select('*')
         .eq('user_id', user.id)
         .gte('start_time', startDate.toISOString())
         .lte('start_time', endDate.toISOString())
         .order('start_time', { ascending: true });

       if (dbError) {
         console.error('Database error:', dbError);
         return NextResponse.json(
           { error: 'Failed to fetch time entries' },
           { status: 500 }
         );
       }

       // Format time_entries for Claude context
       const formattedEntries = (timeEntries || [])
         .map(
           (entry: any) =>
             `${entry.activity_name} (${entry.duration_minutes} min, ${entry.category || 'uncategorized'}) at ${new Date(entry.start_time).toLocaleString()}`
         )
         .join('\n');

       const context = `
User's time entries for the last 30 days:
${formattedEntries || 'No entries found'}

Please answer the user's question based on this data. Be specific with numbers, categories, and insights.
       `.trim();

       // Call Claude API
       const anthropic = new Anthropic({
         apiKey: process.env.VITE_ANTHROPIC_API_KEY,
       });

       const message = await anthropic.messages.create({
         model: 'claude-3-5-sonnet-20241022',
         max_tokens: 1024,
         messages: [
           {
             role: 'user',
             content: `${context}\n\nUser's question: ${question}`,
           },
         ],
       });

       // Extract response text
       const responseText =
         message.content[0].type === 'text' ? message.content[0].text : '';

       // Save question + response to chat_messages table
       const { error: saveError } = await supabase.from('chat_messages').insert([
         {
           user_id: user.id,
           question,
           response: responseText,
           created_at: new Date().toISOString(),
         },
       ]);

       if (saveError) {
         console.error('Error saving chat message:', saveError);
         // Don't fail the response; message was generated even if save failed
       }

       return NextResponse.json({
         question,
         response: responseText,
       });
     } catch (error) {
       console.error('Chat API error:', error);
       return NextResponse.json(
         { error: 'Failed to process question' },
         { status: 500 }
       );
     }
   }
   ```

2. **Environment variables:**
   - Add to `.env.local`:
     ```
     VITE_ANTHROPIC_API_KEY=sk-ant-...
     SUPABASE_SERVICE_ROLE_KEY=eyJ... (from Supabase Settings → API Keys)
     ```
   - **CRITICAL:** `SUPABASE_SERVICE_ROLE_KEY` is a secret. Do NOT expose it on the client. Only use in backend routes.

3. **Dependencies:**
   - Install Anthropic SDK: `npm install @anthropic-ai/sdk`

4. **API contract:**
   - **Request:** POST `/api/chat` with JSON body:
     ```json
     {
       "question": "What did I spend most time on this week?",
       "dateRange": { "days": 7 }  // optional; defaults to 30 days
     }
     ```
   - **Response:** 200 OK with:
     ```json
     {
       "question": "What did I spend most time on this week?",
       "response": "Based on your time entries, you spent the most time on deep work (15 hours 30 minutes), followed by emails (4 hours), and meetings (3 hours)."
     }
     ```
   - **Error responses:** 400 (bad request), 401 (unauthorized), 500 (server error)

**Verify:**
- Backend route file created at correct path
- `npm install @anthropic-ai/sdk` succeeds
- `.env.local` has `VITE_ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
- Test API with curl or Postman:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
    -d '{"question":"What did I do today?"}'
  ```
  (You'll need a valid JWT token from login; harder to test manually without modifying Auth headers)
- Backend successfully calls Claude API (check logs for API response)
- Chat message is saved to Supabase `chat_messages` table

**Done:** Backend API route working. Receives question, fetches user's time_entries, calls Claude API, saves response to database.

---

### Task 4.3: Connect Frontend Chat Component to Backend API

**Goal:** Wire the Chat.tsx component to call the `/api/chat` endpoint, display Claude's response, and handle errors.

**Files:**
- `src/components/Chat.tsx` (modify from Task 4.1)

**Action:**

1. Import auth context and implement API call:

   ```typescript
   import { useAuthStore } from '../store/authStore'; // Or your auth hook

   const Chat = () => {
     const { user } = useAuthStore();
     const [messages, setMessages] = useState<ChatMessage[]>([]);
     const [input, setInput] = useState('');
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);

     const handleSend = async () => {
       if (!input.trim() || !user) return;

       const userMessage: ChatMessage = {
         id: Date.now().toString(),
         question: input,
         response: '', // Will be filled by Claude
         created_at: new Date().toISOString(),
       };

       setMessages((prev) => [...prev, userMessage]);
       setInput('');
       setLoading(true);
       setError(null);

       try {
         // Get user's session token
         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
         if (sessionError || !session) {
           throw new Error('Not authenticated');
         }

         // Call backend API
         const response = await fetch('/api/chat', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session.access_token}`,
           },
           body: JSON.stringify({
             question: input,
             dateRange: { days: 30 }, // Default 30 days
           }),
         });

         if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Failed to get response');
         }

         const data = await response.json();

         // Update message with Claude's response
         setMessages((prev) =>
           prev.map((msg) =>
             msg.id === userMessage.id
               ? { ...msg, response: data.response }
               : msg
           )
         );
       } catch (err) {
         const errorMsg = err instanceof Error ? err.message : 'Unknown error';
         setError(errorMsg);
         // Remove the pending message on error
         setMessages((prev) =>
           prev.filter((msg) => msg.id !== userMessage.id)
         );
       } finally {
         setLoading(false);
       }
     };

     if (!user) {
       return <p>Please log in to use chat.</p>;
     }

     return (
       <div className="chat-container">
         <div className="chat-history">
           {messages.map((msg) => (
             <div key={msg.id} className="chat-message">
               <div className="user-message">
                 <strong>You:</strong> {msg.question}
               </div>
               {msg.response && (
                 <div className="claude-message">
                   <strong>Claude:</strong> {msg.response}
                 </div>
               )}
             </div>
           ))}
           {loading && (
             <div className="loading-indicator">
               Claude is thinking...
             </div>
           )}
         </div>
         {error && (
           <div className="error-banner">
             Error: {error}
           </div>
         )}
         <div className="chat-input-container">
           <input
             type="text"
             placeholder="Ask about your time..."
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 handleSend();
               }
             }}
             disabled={loading}
           />
           <button onClick={handleSend} disabled={loading || !input.trim()}>
             Send
           </button>
         </div>
       </div>
     );
   };

   export default Chat;
   ```

2. Add basic CSS (create `src/components/Chat.module.css` or use styled-components):

   ```css
   .chat-container {
     display: flex;
     flex-direction: column;
     height: 100%;
     max-width: 600px;
     margin: 0 auto;
   }

   .chat-history {
     flex: 1;
     overflow-y: auto;
     padding: 1rem;
     border: 1px solid #ddd;
     margin-bottom: 1rem;
   }

   .chat-message {
     margin-bottom: 1rem;
   }

   .user-message {
     background-color: #f0f0f0;
     padding: 0.5rem;
     border-radius: 4px;
     margin-bottom: 0.25rem;
   }

   .claude-message {
     background-color: #e8f5e9;
     padding: 0.5rem;
     border-radius: 4px;
   }

   .loading-indicator {
     font-style: italic;
     color: #666;
     padding: 0.5rem;
   }

   .error-banner {
     background-color: #ffebee;
     color: #c62828;
     padding: 0.5rem;
     border-radius: 4px;
     margin-bottom: 0.5rem;
   }

   .chat-input-container {
     display: flex;
     gap: 0.5rem;
   }

   .chat-input-container input {
     flex: 1;
     padding: 0.5rem;
     border: 1px solid #ccc;
     border-radius: 4px;
   }

   .chat-input-container button {
     padding: 0.5rem 1rem;
     background-color: #1976d2;
     color: white;
     border: none;
     border-radius: 4px;
     cursor: pointer;
   }

   .chat-input-container button:disabled {
     background-color: #ccc;
     cursor: not-allowed;
   }
   ```

3. **Handle session token:**
   - Get user's session from Supabase auth: `supabase.auth.getSession()`
   - Pass JWT token in Authorization header to API route
   - API route verifies token and extracts user ID

4. **Import supabase client in Chat.tsx:**
   ```typescript
   import { supabase } from '../lib/supabase';
   ```

**Verify:**
- Chat component loads without errors
- Click send button with a question
- Loading indicator appears ("Claude is thinking...")
- After ~2-3 seconds, Claude's response appears in chat
- Question + response saved to Supabase `chat_messages` table (check with SQL editor)
- Multiple questions can be asked in sequence
- Error message displays if API fails
- Session token is correctly passed to backend

**Done:** Frontend fully wired to backend. User can ask questions and see Claude's responses in real time.

---

### Task 4.4: Implement Chat History Persistence and Loading

**Goal:** Load saved chat messages from Supabase on component mount, display full history, and ensure new messages are added to the history.

**Files:**
- `src/components/Chat.tsx` (modify from Task 4.3)

**Action:**

1. Add `useEffect` to load chat history on component mount:

   ```typescript
   useEffect(() => {
     const loadChatHistory = async () => {
       if (!user) return;

       try {
         const { data, error } = await supabase
           .from('chat_messages')
           .select('*')
           .eq('user_id', user.id)
           .order('created_at', { ascending: true });

         if (error) throw error;

         setMessages(
           (data || []).map((msg: any) => ({
             id: msg.id,
             question: msg.question,
             response: msg.response,
             created_at: msg.created_at,
           }))
         );
       } catch (err) {
         console.error('Failed to load chat history:', err);
         setError('Failed to load chat history');
       }
     };

     loadChatHistory();
   }, [user]); // Re-load if user changes (logout/login)
   ```

2. **Ensure auto-scroll:**
   - Use `useRef` to track the chat history div
   - Call `scrollIntoView()` on new messages
   ```typescript
   const chatHistoryRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
     // Scroll to bottom when messages change
     chatHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [messages]);

   // In JSX:
   <div className="chat-history" ref={chatHistoryRef}>
     {/* messages */}
   </div>
   ```

3. **Handle empty history:**
   - Show "No messages yet. Ask a question to get started." if `messages.length === 0`

4. **Handle loading state on mount:**
   - Show spinner while loading history
   ```typescript
   const [historyLoading, setHistoryLoading] = useState(true);

   useEffect(() => {
     setHistoryLoading(true);
     loadChatHistory().finally(() => setHistoryLoading(false));
   }, [user]);

   // In JSX:
   {historyLoading && <p>Loading chat history...</p>}
   ```

5. **Delete old messages (optional, MVP):**
   - Users can click "Delete" on a message to remove it
   - Calls Supabase delete endpoint
   - Not required for MVP, but nice-to-have

**Verify:**
- Chat component mounts and loads saved messages from Supabase
- Old messages display in chronological order
- New messages appear at the bottom
- Component auto-scrolls to newest message
- History persists across page refresh
- Multiple users' chat histories are isolated (RLS prevents cross-user access)
- Loading indicator shows while history is loading

**Done:** Chat history fully persistent. User can see all past queries and responses.

---

### Task 4.5: Error Handling, Rate Limiting, and Edge Cases

**Goal:** Handle API failures gracefully, prevent rapid-fire requests, and manage edge cases (no data, API quota, malformed responses).

**Files:**
- `src/components/Chat.tsx` (modify from Task 4.4)
- `src/app/api/chat/route.ts` (modify from Task 4.2)

**Action:**

**Frontend (Chat.tsx):**

1. **Rate limiting:** Prevent user from sending multiple requests too quickly
   ```typescript
   const [lastSendTime, setLastSendTime] = useState(0);
   const MIN_SEND_INTERVAL = 1000; // 1 second between sends

   const handleSend = async () => {
     const now = Date.now();
     if (now - lastSendTime < MIN_SEND_INTERVAL) {
       setError('Please wait before sending another message');
       return;
     }
     setLastSendTime(now);
     // ... rest of send logic
   };
   ```

2. **Timeout handling:** Abort request if it takes too long
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

   try {
     const response = await fetch('/api/chat', {
       // ... other options
       signal: controller.signal,
     });
     clearTimeout(timeoutId);
     // ... handle response
   } catch (err) {
     clearTimeout(timeoutId);
     if (err instanceof Error && err.name === 'AbortError') {
       setError('Request timed out. Please try again.');
     } else {
       setError(err instanceof Error ? err.message : 'Unknown error');
     }
   }
   ```

3. **Specific error messages:**
   - "No time entries found for this period" (API returns empty data)
   - "Claude API is temporarily unavailable" (API error)
   - "Request timed out" (fetch timeout)
   - "Please log in to use chat" (not authenticated)

4. **Display original question on error:**
   - If API fails, keep the user's question visible so they can try again
   - Don't clear the message from history

**Backend (api/chat/route.ts):**

1. **Validate input:**
   ```typescript
   if (!question || typeof question !== 'string') {
     return NextResponse.json(
       { error: 'Question must be a non-empty string' },
       { status: 400 }
     );
   }
   if (question.length > 500) {
     return NextResponse.json(
       { error: 'Question is too long (max 500 characters)' },
       { status: 400 }
     );
   }
   ```

2. **Handle no time entries:**
   ```typescript
   if (!timeEntries || timeEntries.length === 0) {
     const message = 'No time entries found for the requested period. Start logging activities to enable analytics.';
     // Still return success, but with helpful message
     return NextResponse.json({
       question,
       response: message,
     });
   }
   ```

3. **Handle Claude API errors:**
   ```typescript
   try {
     const message = await anthropic.messages.create({ /* ... */ });
   } catch (claudeError: any) {
     console.error('Claude API error:', claudeError);

     if (claudeError.status === 429) {
       return NextResponse.json(
         { error: 'API rate limit exceeded. Please try again in a moment.' },
         { status: 429 }
       );
     }

     if (claudeError.status === 401) {
       return NextResponse.json(
         { error: 'Claude API key invalid. Check your credentials.' },
         { status: 500 }
       );
     }

     return NextResponse.json(
       { error: 'Claude API error. Please try again later.' },
       { status: 500 }
     );
   }
   ```

4. **Log errors for debugging:**
   ```typescript
   console.error('[Chat API] User:', user.id, 'Error:', error);
   ```

5. **Graceful save failure:**
   - If saving to `chat_messages` fails, still return the response to user
   - Log the error but don't fail the entire request

**Verify:**
- Send a question with very long text (>500 chars) → returns 400 error
- Send empty question → returns 400 error
- Disable internet and try to send → shows timeout error
- Send multiple questions in rapid succession → rate limit message appears (optional)
- API returns no time entries → Claude responds helpfully (e.g., "No data to analyze")
- Claude API returns rate limit error (429) → user sees helpful message
- Invalid API key in env vars → user sees error about API credentials

**Done:** Chat is resilient to errors. User experience is smooth even when things fail.

---

## Dependency Graph

```
Task 4.1: Chat UI Component (local state only)
    ↓
Task 4.2: Backend API Route (Claude integration)
    ↓
Task 4.3: Wire Frontend to Backend (API calls)
    ↓
Task 4.4: Load Chat History (persistence)
    ↓
Task 4.5: Error Handling & Edge Cases (robustness)
```

All tasks are sequential. Task 4.1 must complete first (provides component skeleton). Task 4.2 must complete before 4.3 (no API to call without it). Task 4.3 before 4.4 (history loading requires working API). Task 4.5 applies error handling across all components.

**Parallel work:** If your team were larger, 4.1 and 4.2 could happen in parallel (frontend and backend independently). For solo work, sequential is simpler.

---

## Effort Summary

| Task | Effort | Cumulative |
|------|--------|-----------|
| 4.1: Chat UI Component | 45 min | 45 min |
| 4.2: Backend API Route | 50 min | 95 min |
| 4.3: Wire Frontend to Backend | 40 min | 135 min |
| 4.4: Chat History Persistence | 30 min | 165 min |
| 4.5: Error Handling & Edge Cases | 35 min | 200 min |
| **Total** | **200 min (3.3 hours)** | — |

**Note:** This is within the 4–5 hour estimate. Buffer for debugging, API quirks, or unexpected issues.

---

## Must-Haves Verification

**Observable Truths:**
- [ ] User can type a question in the chat interface
- [ ] User can click send and see a loading indicator
- [ ] Claude's response appears in the chat after 2–3 seconds
- [ ] Chat history persists across page refresh
- [ ] Multiple users cannot see each other's chat histories

**Required Artifacts:**
- [ ] `src/components/Chat.tsx` — Chat UI component with input, send, history display
- [ ] `src/app/api/chat/route.ts` — Backend API route that calls Claude
- [ ] `src/types/chat.ts` — Type definitions for chat messages
- [ ] `.env.local` — `VITE_ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `supabase/migrations/` — schema already has `chat_messages` table (from Phase 1)

**Key Links:**
- `Chat.tsx` → calls `/api/chat` endpoint via fetch
- `/api/chat` → reads from `chat_messages` table and writes responses
- Auth context → provides user ID for queries and headers
- Claude API → receives formatted time_entries and question, returns response

**Critical Connections (failure points):**
- If API endpoint is not callable: user sees "Failed to get response"
- If Claude API key is invalid: responses fail with 500 error
- If Supabase RLS prevents chat message saves: responses still appear but aren't persisted
- If time_entries are empty: Claude can't analyze; responds with "no data" message

---

## Verification Checklist (End of Phase 4)

**Chat UI:**
- [ ] Chat component renders in app (add to route or dashboard)
- [ ] Input field is visible and accepts text
- [ ] Send button is clickable and has hover state
- [ ] Chat history is scrollable
- [ ] Loading indicator appears while processing

**API Integration:**
- [ ] Backend route exists at `/api/chat`
- [ ] Route accepts POST with `{ question, dateRange }` body
- [ ] Route authenticates user via Bearer token
- [ ] Route fetches user's time_entries from Supabase
- [ ] Route calls Claude API successfully
- [ ] Route returns `{ question, response }` JSON

**Persistence:**
- [ ] Chat messages are saved to Supabase `chat_messages` table
- [ ] Chat history loads on component mount
- [ ] Old messages display in chronological order
- [ ] New messages appear at the bottom

**Error Handling:**
- [ ] Empty question → shows error
- [ ] No time entries → Claude responds helpfully
- [ ] API timeout → user sees "Request timed out"
- [ ] Invalid API key → user sees credential error
- [ ] Network error → user sees error message, can retry

**Security:**
- [ ] API key (`SUPABASE_SERVICE_ROLE_KEY`) is never exposed in client-side code
- [ ] User can only access their own chat history (RLS enforced)
- [ ] User can only query their own time_entries (RLS enforced)
- [ ] Bearer token is required for API access (401 if missing)

**Performance:**
- [ ] Chat response appears in < 5 seconds (Claude API ~2–3s + overhead)
- [ ] Chat history loads quickly (< 1s for 100 messages)
- [ ] No console errors or warnings

**Integration with Phases 2–3:**
- [ ] Chat queries accurately reflect time_entries from Phase 2
- [ ] Edited activities (Phase 3) are reflected in Claude's analysis
- [ ] Chat respects date ranges (e.g., "last 7 days" works correctly)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Claude API response is slow (>10s)** | UX feels laggy | Set 30s timeout. Show loading indicator. Inform user. Consider caching responses (Phase 5+). |
| **Claude API rate limits (429 errors)** | Users can't ask questions | Handle 429 gracefully. Show user "API rate limit. Try again in a moment." Implement request queuing or backoff (optional for MVP). |
| **User has 1000+ time entries** | Claude context too large | Cap to last 90 days (or configurable). Summarize entries if > 5000 total. Verify context fits in API token limit. |
| **API key leak (committed to git)** | Security breach | Use `.env.local` (in .gitignore). Never commit `.env.local`. Rotate key if exposed. Use Vercel environment variables for production. |
| **Claude API returns malformed response** | Chat fails to parse | Validate response structure. If invalid, show "Claude returned an unexpected response" error. Log for debugging. |
| **Supabase save fails silently** | Message not persisted | Even if save fails, show response to user. Log error. (Acceptable for MVP; persistence is nice-to-have, not critical.) |
| **User not authenticated** | API returns 401 | Check auth before rendering chat. Show "Please log in" message. Redirect to login if needed. |
| **No time entries for user** | Claude has no data to analyze | Handle gracefully. Show "No data to analyze. Start logging activities." This is not an error; expected for new users. |

---

## Out of Scope (Phase 4)

- Multi-turn conversation (each query is stateless)
- Context awareness across messages (each query gets full data)
- Streaming responses (Claude response appears all at once, not word-by-word)
- Follow-up suggestions ("You might also ask...")
- Analytics dashboard (Phase 5)
- Export chat history (Phase 7+)
- Voice input for questions (Phase 7+)
- Real-time chat updates across devices (Phase 7+)

---

## Next Steps (Phase 5: Design & Polish)

Once Phase 4 is complete:

1. **Design chat interface** per project design direction
   - Restrained, editorial aesthetic (no Tailwind defaults)
   - Intentional typography, whitespace, color
   - Match the timeline and journal designs

2. **Polish loading states**
   - Consider animated loading indicator (subtle, not distracting)
   - Skeleton placeholder for response while loading

3. **Consider summary cards**
   - Optional: show weekly totals, top categories above chat
   - Low priority for MVP; can be added in Phase 5

4. **Responsive design**
   - Chat should work on tablets and narrow screens
   - Mobile-friendly (not primary, but should work)

---

## Testing Checklist (Manual)

**Happy path:**
1. Log in as test user
2. Ensure time_entries exist (from Phase 2)
3. Open Chat component
4. Ask: "How much time did I spend on work this week?"
5. Verify Claude responds with accurate numbers
6. Refresh page; chat history should persist
7. Ask another question; verify response

**Edge cases:**
1. Ask with empty question → error
2. Ask with 600-character question → error
3. Delete all time_entries; ask question → Claude says "no data"
4. Unplug internet while waiting for response → timeout error
5. Log out and back in as different user → see only own chat history
6. Ask with special characters ("What's my [hot] activity?") → Claude handles gracefully

**Performance:**
1. Ask 5 questions in rapid succession → rate limiting works
2. Load page with 50 old chat messages → loads quickly
3. Scroll through chat history → smooth, no jank

---

## Code Style & Conventions

- Use TypeScript for type safety
- Use React hooks (no class components)
- Use Zustand for simple state, React Context for auth
- Keep components under 200 lines (split if larger)
- Use semantic HTML (no div soup)
- No Tailwind for Phase 4; minimal inline styles or CSS modules
- Error handling: try/catch + user-friendly messages
- Logging: use `console.error()` for errors, `console.log()` for debugging

---

## Summary

Phase 4 delivers a functional chat analytics feature. Users can ask questions about their logged time, Claude analyzes the data, and responses are persisted. The implementation is robust, handles errors gracefully, and is ready for design polish in Phase 5.

**Key deliverables:**
- Chat UI component with input, send, history
- Backend API route for Claude integration
- Chat message persistence to Supabase
- Error handling and edge case coverage

**Success criteria:**
- User can ask "What did I spend time on this week?" and get an accurate answer
- Chat history persists across sessions
- No data leaks between users (RLS enforced)
- API failures are handled gracefully
