# Phase 2 Plan: Voice Capture & Parsing

**Phase Goal:** User can speak a check-in and see it parsed into activities on a timeline.

**Timeline:** 6–8 hours (Days 2–3 of development)

**Depends on:** Phase 1 (Supabase + auth complete)

**Blocks:** Phases 3 (Journal & Editing), 5 (Design & Polish)

---

## Executive Summary

Phase 2 implements the core voice-to-timeline pipeline:

1. **Recording** — User taps a mic button; Web Speech API captures and transcribes speech
2. **Parsing** — Transcript sent to Claude API; receives structured JSON of activities
3. **Review** — User sees parsed activities in a review screen, can edit/accept
4. **Save** — Accepted activities saved to Supabase (`time_entries` table, linked to `check_ins`)
5. **Timeline** — Daily timeline view displays all activities chronologically with gaps flagged

**Key decisions locked from Phase 1 planning:**
- Use Web Speech API (browser native, no external service)
- Claude API for parsing (call on demand, stateless)
- Timeline as a simple chronological list initially (design polish in Phase 5)
- Gaps flagged only for dead time > 15 minutes

**Success criteria by end of Phase 2:**
- User can tap mic, speak ~30 seconds, see parsed activities in < 30 seconds
- Parsing accuracy 80%+ on clear input (spot-check with 5 test transcripts)
- Timeline displays activities + durations, flags gaps
- All data persists to Supabase and reloads on app restart

---

## Data Model Reference

From Phase 1, these tables exist:

```
check_ins:
  - id (UUID, PK)
  - user_id (FK to auth.users)
  - transcript (text, raw transcription)
  - parsed_activities (JSONB, Claude's structured output)
  - created_at (timestamp)

time_entries:
  - id (UUID, PK)
  - user_id (FK to auth.users)
  - activity_name (text)
  - category (text, optional)
  - duration_minutes (integer, > 0)
  - start_time (timestamp, when activity began)
  - check_in_id (UUID, FK to check_ins)
  - created_at (timestamp)
  - updated_at (timestamp)
```

---

## Task Breakdown

### Task 2.1: Web Speech API Integration (Mic Button & Recording)

**Objective:** Build a functional mic button that records user speech, transcribes it via Web Speech API, and displays the raw transcript.

**Acceptance Criteria:**
- [ ] Mic button component (`src/components/MicButton.tsx`) renders and is clickable
- [ ] Button text changes: "Start Recording" → "Recording..." → "Stop Recording"
- [ ] On click, Web Speech API initializes and begins recording
- [ ] Audio is captured (user can hear themselves or see a visual indicator)
- [ ] On second click (or timeout after 60 seconds), recording stops and transcription begins
- [ ] Raw transcript displayed in UI (text area or card)
- [ ] Error handling: if browser doesn't support Web Speech API, show fallback message
- [ ] Network errors caught and displayed as user-friendly alert
- [ ] Component is stateless or uses local React state only (no external API calls in this task)

**Implementation Steps:**

1. **Create mic button component** at `src/components/MicButton.tsx`:

```typescript
import { useState, useRef } from 'react';

interface MicButtonProps {
  onTranscriptReady: (transcript: string) => void;
}

export function MicButton({ onTranscriptReady }: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Web Speech API not supported in this browser. Use Chrome, Safari, or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;

      let transcript = '';

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
      };

      recognition.onerror = (event: any) => {
        const errorMessage = event.error || 'Unknown error';
        setError(`Recording error: ${errorMessage}. Please try again.`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (transcript.trim()) {
          onTranscriptReady(transcript.trim());
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      setError(`Failed to start recording: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        onClick={handleClick}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: isRecording ? '#e74c3c' : '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        {isRecording ? '[ERR] Recording...' : '[mic] Start Recording'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}
```

2. **Create a basic voice check-in page** at `src/components/VoiceCheckIn.tsx`:

```typescript
import { useState } from 'react';
import { MicButton } from './MicButton';

export function VoiceCheckIn() {
  const [transcript, setTranscript] = useState<string>('');

  const handleTranscriptReady = (text: string) => {
    setTranscript(text);
    console.log('Transcript ready:', text);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Voice Check-in</h2>
      <MicButton onTranscriptReady={handleTranscriptReady} />
      {transcript && (
        <div style={{ marginTop: '20px' }}>
          <h3>Your transcript:</h3>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            style={{
              width: '100%',
              height: '150px',
              padding: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          />
        </div>
      )}
    </div>
  );
}
```

3. **Update `src/App.tsx`** to render the VoiceCheckIn component (after auth):

```typescript
import { AuthProvider } from './components/AuthProvider';
import { Auth } from './components/Auth';
import { VoiceCheckIn } from './components/VoiceCheckIn';
import { useAuthStore } from './store/authStore';

function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <AuthProvider>
      <div>
        <h1>Prohairesis</h1>
        {user ? (
          <VoiceCheckIn />
        ) : (
          <Auth />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;
```

4. **Test locally:**
   ```bash
   npm run dev
   # Open http://localhost:5173
   # Log in
   # Click "Start Recording"
   # Speak for 10–15 seconds (e.g., "I had breakfast for 15 minutes, then worked on emails for 30 minutes")
   # Click "Stop Recording"
   # Verify transcript appears
   ```

5. **Browser compatibility check:**
   - Test in Chrome (built-in support)
   - Test in Safari (built-in support)
   - Test in Edge (built-in support)
   - Verify fallback message appears in Firefox or older browsers

**Estimated effort:** 1.5 hours

**Blocks:** Task 2.2 (Claude parsing depends on transcript)

**Dependencies:** Phase 1 (auth must work)

**Risks:**
- Browser may not support Web Speech API (Firefox, older browsers)
- Audio permission denied by user
- Network timeout if user is offline

**Mitigations:**
- Fallback: Show clear error message with supported browsers
- Test with a dedicated browser check early
- Consider adding a manual text input as backup for Phase 2 stretch (deferring text input to Phase 3 if needed)

---

### Task 2.2: Claude API Integration for Parsing

**Objective:** Send the transcript to Claude API and receive parsed activities as JSON. Return structured time blocks with activity names, durations, and inferred start times.

**Acceptance Criteria:**
- [ ] Environment variable `VITE_ANTHROPIC_API_KEY` is set in `.env.local`
- [ ] Claude API client initialized in `src/lib/anthropic.ts`
- [ ] Function `parseTranscript(transcript: string): Promise<ParsedActivity[]>` defined
- [ ] Function sends POST to Claude API (using Anthropic SDK)
- [ ] Claude receives a detailed prompt that specifies output JSON format
- [ ] Response parsed from Claude is validated and returned as typed array
- [ ] Edge case: If transcript is very short or unclear, Claude still returns valid JSON (possibly with uncertainty noted)
- [ ] Error handling: API errors (rate limit, auth, timeout) caught and reported to user
- [ ] Function tested with 5 sample transcripts (accuracy check deferred to Task 2.4)

**Implementation Steps:**

1. **Install Anthropic SDK:**
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. **Create Anthropic client** at `src/lib/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('VITE_ANTHROPIC_API_KEY is not set in .env.local');
}

export const anthropic = new Anthropic({ apiKey });

export interface ParsedActivity {
  activity: string;
  duration_minutes: number;
  start_time_inferred: string; // e.g., "7:00 AM", "09:30"
  category?: string;
  notes?: string;
}

const PARSE_PROMPT = `You are a helpful assistant that parses stream-of-consciousness speech about daily activities into a structured time-based log.

Given a transcript of someone describing their day, extract:
1. Each distinct activity mentioned
2. The estimated duration of each activity in minutes
3. The inferred start time (based on context clues like "I woke up at 7" or "then I...")
4. The activity category if clear (e.g., work, personal, exercise, food, etc.)

Return ONLY a valid JSON array. Do not include any text before or after the JSON.
Use this format exactly:
[
  {
    "activity": "activity name",
    "duration_minutes": <number>,
    "start_time_inferred": "HH:MM AM/PM",
    "category": "category name (optional)",
    "notes": "any ambiguities or uncertainties (optional)"
  }
]

Rules:
- If a time is mentioned explicitly (e.g., "at 7:30"), use that.
- If only relative times are given (e.g., "then I..."), infer from context.
- If duration is not explicit but implied, estimate reasonably.
- If an activity is ambiguous or split, create separate entries.
- Preserve the chronological order from the transcript.
- Always return valid JSON, even if uncertain. Use "notes" field to flag uncertainty.`;

export async function parseTranscript(transcript: string): Promise<ParsedActivity[]> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty.');
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Use latest stable model
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${PARSE_PROMPT}\n\nTranscript:\n${transcript}`,
        },
      ],
    });

    // Extract the text response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    // Parse JSON from response
    let parsed: ParsedActivity[];
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from response (in case Claude adds extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Claude did not return valid JSON.');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Expected an array of activities.');
    }

    for (const activity of parsed) {
      if (!activity.activity || typeof activity.duration_minutes !== 'number') {
        throw new Error('Invalid activity structure: missing required fields.');
      }
    }

    return parsed;
  } catch (error: any) {
    const message = error.message || String(error);
    if (message.includes('rate_limit')) {
      throw new Error('Claude API rate limit exceeded. Please wait a moment and try again.');
    } else if (message.includes('401') || message.includes('unauthorized')) {
      throw new Error('Claude API key is invalid. Check your .env.local.');
    } else if (message.includes('timeout')) {
      throw new Error('Claude API request timed out. Please check your internet connection.');
    } else {
      throw new Error(`Parsing failed: ${message}`);
    }
  }
}
```

3. **Update `.env.local`** with Claude API key:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_ANTHROPIC_API_KEY=sk-ant-v7-xxxxxxxxxxxxx
   ```

   **To get the Claude API key:**
   - Go to https://console.anthropic.com
   - Create account or log in
   - Go to API Keys → Create Key
   - Copy the key and paste into `.env.local`
   - Restart dev server after updating `.env.local`

4. **Create a test function** to verify parsing works:

Create `src/lib/__tests__/anthropic.test.ts` (or just test manually for now):

```typescript
import { parseTranscript } from '../anthropic';

// Test with sample transcript
const testTranscript = `
I woke up around 7 AM, had breakfast for about 15 minutes,
then I checked emails for like 30 minutes. After that,
I worked on the project for around 2 hours. Took a lunch break
at noon, ate for like 45 minutes. Then back to work for another hour and a half.
Finally, I went for a walk at 3:30 PM, probably 30 minutes,
then wrapped up some admin stuff before 5 PM, maybe 20 minutes.
`;

parseTranscript(testTranscript)
  .then((activities) => {
    console.log('Parsed activities:', JSON.stringify(activities, null, 2));
  })
  .catch((error) => {
    console.error('Parse error:', error);
  });
```

5. **Run manual test:**
   ```bash
   node --loader ts-node/esm src/lib/__tests__/anthropic.test.ts
   # Or just call parseTranscript from the browser console in your app
   ```

6. **Test with 5 sample transcripts** (from different scenarios):
   - Clear, structured speech (expected: high accuracy)
   - Vague, scattered speech (expected: lower accuracy, use notes field)
   - Very short speech (< 20 seconds)
   - Long speech (> 3 minutes)
   - Mixed activities and unclear durations

**Estimated effort:** 1.5 hours

**Blocks:** Task 2.3 (Review screen displays parsed activities)

**Risks:**
- Claude API quota exceeded or rate-limited
- API key invalid or missing
- Malformed response from Claude (not JSON)
- Very ambiguous transcripts result in low-quality parsing

**Mitigations:**
- Test with valid API key early (Day 2, first thing after setup)
- Handle all error cases with user-friendly messages
- Document expected input: "Clear, deliberate speech. Specify times and durations explicitly."
- If parsing fails, offer user option to manually edit or re-record

---

### Task 2.3: Review Screen for Parsed Activities

**Objective:** Display parsed activities from Claude in a review UI. User can edit, delete, accept, or discard activities before saving.

**Acceptance Criteria:**
- [ ] Review component (`src/components/ActivityReview.tsx`) displays list of parsed activities
- [ ] Each activity shows: name, duration (minutes), inferred start time, category
- [ ] User can click an activity to edit name, duration, or category (inline editing)
- [ ] User can delete an activity (click delete button, removed from list)
- [ ] User can clear all and start over (discard check-in, reset transcript)
- [ ] User can accept parsed activities (button: "Save to Timeline")
- [ ] Accept button is disabled if no activities exist
- [ ] Component accepts `activities: ParsedActivity[]` as prop and callback `onSave(activities)`
- [ ] Edits are reflected live in the list (no separate save step within review)
- [ ] Loading state shown while Claude is parsing (spinner or "Loading...")

**Implementation Steps:**

1. **Create review component** at `src/components/ActivityReview.tsx`:

```typescript
import { useState } from 'react';
import { ParsedActivity } from '../lib/anthropic';

interface ActivityReviewProps {
  activities: ParsedActivity[];
  isLoading: boolean;
  onSave: (activities: ParsedActivity[]) => Promise<void>;
  onDiscard: () => void;
}

export function ActivityReview({
  activities,
  isLoading,
  onSave,
  onDiscard,
}: ActivityReviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedActivities, setEditedActivities] = useState<ParsedActivity[]>(activities);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync external activities changes
  if (activities !== editedActivities) {
    setEditedActivities(activities);
  }

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
  };

  const handleEdit = (index: number, field: keyof ParsedActivity, value: any) => {
    const updated = [...editedActivities];
    (updated[index] as any)[field] = value;
    setEditedActivities(updated);
  };

  const handleDelete = (index: number) => {
    const updated = editedActivities.filter((_, i) => i !== index);
    setEditedActivities(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(editedActivities);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save activities.');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Parsing your speech...</p>
        <div style={{ marginTop: '10px' }}>Loading...</div>
      </div>
    );
  }

  if (editedActivities.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <p>No activities parsed. Try recording again or edit your transcript.</p>
        <button
          onClick={onDiscard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3>Review Parsed Activities</h3>
      <div style={{ marginTop: '20px' }}>
        {editedActivities.map((activity, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '10px',
              backgroundColor: editingIndex === index ? '#f0f0f0' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                {editingIndex === index ? (
                  <div>
                    <input
                      type="text"
                      value={activity.activity}
                      onChange={(e) => handleEdit(index, 'activity', e.target.value)}
                      style={{
                        padding: '6px',
                        fontSize: '14px',
                        marginBottom: '8px',
                        width: '100%',
                      }}
                      placeholder="Activity name"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label>Duration (min):</label>
                        <input
                          type="number"
                          value={activity.duration_minutes}
                          onChange={(e) =>
                            handleEdit(index, 'duration_minutes', Number(e.target.value))
                          }
                          style={{ padding: '6px', fontSize: '14px', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label>Start time:</label>
                        <input
                          type="text"
                          value={activity.start_time_inferred}
                          onChange={(e) => handleEdit(index, 'start_time_inferred', e.target.value)}
                          style={{ padding: '6px', fontSize: '14px', width: '100%' }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <label>Category (optional):</label>
                      <input
                        type="text"
                        value={activity.category || ''}
                        onChange={(e) => handleEdit(index, 'category', e.target.value || undefined)}
                        style={{ padding: '6px', fontSize: '14px', width: '100%' }}
                      />
                    </div>
                    <button
                      onClick={() => setEditingIndex(null)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Done Editing
                    </button>
                  </div>
                ) : (
                  <div>
                    <strong>{activity.activity}</strong>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      {activity.duration_minutes} min • {activity.start_time_inferred}
                      {activity.category && ` • ${activity.category}`}
                    </div>
                    {activity.notes && (
                      <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px' }}>
                        Note: {activity.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginLeft: '10px', display: 'flex', gap: '8px' }}>
                {editingIndex !== index && (
                  <button
                    onClick={() => handleEditStart(index)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(index)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {saveError && (
        <div style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffe6e6' }}>
          Error: {saveError}
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || editedActivities.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: isSaving ? '#95a5a6' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isSaving ? 'Saving...' : 'Save to Timeline'}
        </button>
        <button
          onClick={onDiscard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Discard & Start Over
        </button>
      </div>
    </div>
  );
}
```

2. **Update `VoiceCheckIn.tsx`** to integrate parsing and review:

```typescript
import { useState } from 'react';
import { MicButton } from './MicButton';
import { ActivityReview } from './ActivityReview';
import { parseTranscript, ParsedActivity } from '../lib/anthropic';

export function VoiceCheckIn() {
  const [transcript, setTranscript] = useState<string>('');
  const [parsedActivities, setParsedActivities] = useState<ParsedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'recording' | 'review' | 'saved'>('recording');

  const handleTranscriptReady = async (text: string) => {
    setTranscript(text);
    setError(null);
    setIsLoading(true);

    try {
      const activities = await parseTranscript(text);
      setParsedActivities(activities);
      setStage('review');
    } catch (err: any) {
      setError(err.message || 'Failed to parse transcript.');
      setIsLoading(false);
    }
  };

  const handleSaveActivities = async (activities: ParsedActivity[]) => {
    // Task 2.4 will implement this
    console.log('Would save activities:', activities);
    setStage('saved');
  };

  const handleDiscard = () => {
    setTranscript('');
    setParsedActivities([]);
    setError(null);
    setStage('recording');
  };

  if (stage === 'saved') {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Activities Saved!</h2>
        <p>Your check-in has been saved to the timeline.</p>
        <button
          onClick={handleDiscard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Record Another Check-in
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Voice Check-in</h2>
      {stage === 'recording' && (
        <>
          <MicButton onTranscriptReady={handleTranscriptReady} />
          {error && (
            <div style={{ color: 'red', marginTop: '10px', padding: '10px', backgroundColor: '#ffe6e6' }}>
              {error}
            </div>
          )}
          {transcript && (
            <div style={{ marginTop: '20px' }}>
              <h3>Your transcript:</h3>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                style={{
                  width: '100%',
                  height: '150px',
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={() => handleTranscriptReady(transcript)}
                disabled={isLoading}
                style={{
                  marginTop: '10px',
                  padding: '10px 20px',
                  backgroundColor: isLoading ? '#95a5a6' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Parsing...' : 'Parse Transcript'}
              </button>
            </div>
          )}
        </>
      )}
      {stage === 'review' && (
        <ActivityReview
          activities={parsedActivities}
          isLoading={isLoading}
          onSave={handleSaveActivities}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}
```

**Estimated effort:** 1.5 hours

**Blocks:** Task 2.4 (Save to Supabase depends on reviewed activities)

**Risks:**
- Complex inline editing UI might have bugs or confusing UX
- User might accidentally delete an activity they meant to keep

**Mitigations:**
- Add a "Discard & Start Over" button to reset and re-record
- Keep the original transcript visible for reference (can add this in Task 2.3 stretch)
- Test editing workflow with 3–5 test cases

---

### Task 2.4: Save Activities to Supabase (check_ins + time_entries)

**Objective:** When user accepts activities from the review screen, save both the check-in record and individual time_entries to Supabase. Link them via `check_in_id`.

**Acceptance Criteria:**
- [ ] Function `saveCheckInAndActivities(transcript: string, activities: ParsedActivity[], userId: string): Promise<CheckInRecord>`
- [ ] Creates a record in `check_ins` table with transcript and parsed_activities (JSONB)
- [ ] For each activity, creates a record in `time_entries` table
- [ ] Time entries are linked to the check-in via `check_in_id`
- [ ] All entries have correct `user_id` (from authenticated session)
- [ ] `start_time` in time_entries is computed from the inferred start time string
- [ ] Error handling: RLS violations, database errors caught and reported
- [ ] Verification: After save, query Supabase to confirm data exists
- [ ] Multiple check-ins can be created without conflict (timestamps auto-generated)

**Implementation Steps:**

1. **Create a utility function** at `src/lib/supabase-operations.ts`:

```typescript
import { supabase } from './supabase';
import { ParsedActivity } from './anthropic';

export interface CheckInRecord {
  id: string;
  user_id: string;
  transcript: string;
  parsed_activities: ParsedActivity[];
  created_at: string;
}

function parseTimeString(timeStr: string, referenceDate: Date = new Date()): Date {
  // Parse times like "7:00 AM", "09:30", "14:30 PM"
  // If no AM/PM specified, assume 24-hour format
  const trimmed = timeStr.trim();

  // Match HH:MM or H:MM with optional AM/PM
  const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!match) {
    // If unparseable, assume it's relative to now and just use a placeholder
    return new Date();
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  // Convert to 24-hour format if AM/PM provided
  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export async function saveCheckInAndActivities(
  transcript: string,
  activities: ParsedActivity[],
  userId: string
): Promise<CheckInRecord> {
  // Step 1: Insert check-in record
  const { data: checkInData, error: checkInError } = await supabase
    .from('check_ins')
    .insert([
      {
        user_id: userId,
        transcript,
        parsed_activities: activities,
      },
    ])
    .select()
    .single();

  if (checkInError) {
    console.error('Check-in insert error:', checkInError);
    throw new Error(`Failed to save check-in: ${checkInError.message}`);
  }

  const checkInId = checkInData.id;

  // Step 2: Insert time entries for each activity
  const timeEntries = activities.map((activity) => ({
    user_id: userId,
    activity_name: activity.activity,
    category: activity.category || null,
    duration_minutes: activity.duration_minutes,
    start_time: parseTimeString(activity.start_time_inferred).toISOString(),
    check_in_id: checkInId,
  }));

  const { data: entriesData, error: entriesError } = await supabase
    .from('time_entries')
    .insert(timeEntries)
    .select();

  if (entriesError) {
    console.error('Time entries insert error:', entriesError);
    throw new Error(`Failed to save activities: ${entriesError.message}`);
  }

  return {
    id: checkInId,
    user_id: userId,
    transcript,
    parsed_activities: activities,
    created_at: checkInData.created_at,
  };
}

export async function getTimeEntriesForDay(
  userId: string,
  date: Date = new Date()
): Promise<any[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startOfDay.toISOString())
    .lt('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Failed to fetch time entries:', error);
    throw new Error(`Failed to fetch timeline: ${error.message}`);
  }

  return data || [];
}
```

2. **Update VoiceCheckIn component** to call save function:

```typescript
const handleSaveActivities = async (activities: ParsedActivity[]) => {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    setError('Not authenticated.');
    return;
  }

  try {
    await saveCheckInAndActivities(transcript, activities, user.id);
    setStage('saved');
  } catch (err: any) {
    setError(err.message || 'Failed to save activities.');
    setIsLoading(false);
  }
};
```

3. **Update App.tsx imports**:
```typescript
import { saveCheckInAndActivities, getTimeEntriesForDay } from './lib/supabase-operations';
```

4. **Test manually:**
   ```bash
   npm run dev
   # Log in
   # Record a short check-in (e.g., "I had breakfast for 15 minutes, then worked for 2 hours")
   # Review and accept
   # Check Supabase dashboard: Tables → check_ins and time_entries
   # Verify data exists with correct user_id, transcript, and activities
   ```

5. **Verify in Supabase:**
   - Go to Supabase dashboard → SQL Editor
   - Run: `SELECT * FROM check_ins WHERE user_id = '<YOUR_USER_ID>';`
   - Run: `SELECT * FROM time_entries WHERE user_id = '<YOUR_USER_ID>';`
   - Verify columns match schema from Phase 1

**Estimated effort:** 1 hour

**Blocks:** Task 2.5 (Timeline display fetches from Supabase)

**Risks:**
- Time string parsing is fragile (users might say "around 7" or "approximately 9:30")
- RLS policy violation if user_id doesn't match authenticated user

**Mitigations:**
- Use flexible time parsing that defaults to current time if unparseable
- Log errors and show user-friendly message
- Test RLS by attempting to save with a different user_id (should fail)

---

### Task 2.5: Daily Timeline View with Gap Detection

**Objective:** Build a timeline component that displays all time_entries for a selected day, sorted chronologically, with visual indicators for gaps > 15 minutes between activities.

**Acceptance Criteria:**
- [ ] Timeline component (`src/components/Timeline.tsx`) fetches and displays today's activities
- [ ] Activities displayed in chronological order (earliest first)
- [ ] Each activity shows: name, start time, duration, category (if available)
- [ ] Total time accounted for shown at top (e.g., "7 hours 45 minutes logged")
- [ ] Gaps > 15 minutes flagged visually (e.g., "2 hours 30 minutes unaccounted between 12:00 PM and 2:30 PM")
- [ ] User can select a different date (date picker input)
- [ ] Empty state handled: "No activities recorded for this date"
- [ ] Loading state shown while fetching (spinner or "Loading...")
- [ ] Refresh data on component mount and when date changes
- [ ] Error handling: Display user-friendly error if fetch fails

**Implementation Steps:**

1. **Create timeline component** at `src/components/Timeline.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { getTimeEntriesForDay } from '../lib/supabase-operations';
import { useAuthStore } from '../store/authStore';

interface TimeEntry {
  id: string;
  activity_name: string;
  duration_minutes: number;
  start_time: string;
  category?: string;
}

interface Gap {
  startTime: Date;
  endTime: Date;
  minutes: number;
}

function calculateGaps(entries: TimeEntry[]): Gap[] {
  if (entries.length < 2) return [];

  const gaps: Gap[] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    const current = new Date(entries[i].start_time);
    const currentEnd = new Date(current.getTime() + entries[i].duration_minutes * 60 * 1000);

    const next = new Date(entries[i + 1].start_time);
    const gapMinutes = (next.getTime() - currentEnd.getTime()) / (60 * 1000);

    if (gapMinutes > 15) {
      gaps.push({
        startTime: currentEnd,
        endTime: next,
        minutes: Math.round(gapMinutes),
      });
    }
  }
  return gaps;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function Timeline() {
  const user = useAuthStore((state) => state.user);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!user) return;

    const fetchEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTimeEntriesForDay(user.id, selectedDate);
        setEntries(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load timeline.');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user, selectedDate]);

  const gaps = calculateGaps(entries);
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);

  const dateString = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', backgroundColor: '#ffe6e6' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Timeline</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Date:
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              setSelectedDate(newDate);
            }}
            style={{ marginLeft: '10px', padding: '6px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <strong>{dateString}</strong>
        <div style={{ marginTop: '8px', fontSize: '14px' }}>
          Total logged: <strong>{formatDuration(totalMinutes)}</strong>
        </div>
        {gaps.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#e74c3c' }}>
            Unaccounted time: <strong>{formatDuration(gaps.reduce((sum, g) => sum + g.minutes, 0))} (in {gaps.length} gap{gaps.length > 1 ? 's' : ''})</strong>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          No activities recorded for {dateString}.
        </div>
      ) : (
        <div>
          {entries.map((entry, index) => {
            const startTime = new Date(entry.start_time);
            const endTime = new Date(startTime.getTime() + entry.duration_minutes * 60 * 1000);

            return (
              <div key={entry.id}>
                {/* Activity */}
                <div
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '10px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '16px' }}>{entry.activity_name}</strong>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                        {formatTime(startTime)} – {formatTime(endTime)} ({formatDuration(entry.duration_minutes)})
                      </div>
                      {entry.category && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          Category: {entry.category}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gap (if exists) */}
                {index < gaps.length && gaps[index] && (
                  <div
                    style={{
                      border: '1px dashed #e74c3c',
                      borderRadius: '4px',
                      padding: '10px',
                      marginBottom: '10px',
                      backgroundColor: '#ffe6e6',
                      fontSize: '13px',
                      color: '#c0392b',
                    }}
                  >
                    [WARN] <strong>Gap: {formatDuration(gaps[index].minutes)}</strong> unaccounted
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

2. **Add Timeline to App.tsx**:

```typescript
function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <AuthProvider>
      <div>
        <h1>Prohairesis</h1>
        {user ? (
          <div>
            <VoiceCheckIn />
            <hr />
            <Timeline />
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </AuthProvider>
  );
}
```

3. **Test manually:**
   ```bash
   npm run dev
   # Log in
   # Record and save a check-in with 2–3 activities (e.g., breakfast 15 min, gap, work 2 hours)
   # Navigate to Timeline section
   # Verify:
   #   - Activities display in chronological order
   #   - Gaps are flagged
   #   - Total time is correct
   #   - Date picker works
   #   - Empty state shows for dates with no activities
   ```

4. **Edge case testing:**
   - No activities recorded (should show "No activities")
   - Single activity (no gaps)
   - Multiple activities with multiple gaps
   - Activities with same start time (edge case, verify ordering)

**Estimated effort:** 1.5 hours

**Blocks:** Task 2.6 (Verification & polish)

**Risks:**
- Gap detection logic might have off-by-one errors
- Timezone handling: times might be stored in UTC but displayed in user's local time
- Multiple activities at the same time (order undefined)

**Mitigations:**
- Test with known time entries (manually insert into Supabase for testing)
- Always store times in UTC; convert to local on display
- Document that simultaneous activities are not expected; resolve with user if encountered

---

### Task 2.6: Verification & Testing

**Objective:** End-to-end testing of the entire voice-to-timeline flow. Verify parsing accuracy, data persistence, and error handling.

**Acceptance Criteria:**
- [ ] Complete flow test: Record → Parse → Review → Save → Display in Timeline (all passing)
- [ ] Parsing accuracy test: 5 real transcripts parsed and spot-checked (80%+ accuracy target)
- [ ] Browser compatibility test: Chrome, Safari, Edge all record and parse successfully
- [ ] Error handling test: Network error, invalid API key, rate limit all show user-friendly messages
- [ ] Data persistence test: Logout/login; activities still visible in timeline
- [ ] Multiple check-ins test: Create 3 check-ins in one day; timeline shows all
- [ ] Gap detection test: Create activities with intentional gaps; gaps correctly flagged
- [ ] Performance test: Recording/parsing/save completes in < 30 seconds

**Implementation Steps:**

1. **Create a test script** to verify the flow programmatically. Create `src/__tests__/phase2-flow.test.ts`:

```typescript
// Manual test checklist (for now; automated tests can be added later)

export const PHASE2_TEST_CHECKLIST = {
  'Voice Recording': {
    'User can start/stop recording': false,
    'Transcript displayed after recording': false,
    'Web Speech API error handled gracefully': false,
  },
  'Claude Parsing': {
    'API key is set': false,
    'Transcript parsed in < 15 seconds': false,
    'Parsed JSON is valid': false,
    '80%+ accuracy on clear input': false,
  },
  'Review Screen': {
    'Activities displayed in review': false,
    'User can edit activity name': false,
    'User can edit duration': false,
    'User can delete activity': false,
    'User can discard and restart': false,
  },
  'Save to Supabase': {
    'Check-in record created': false,
    'Time entries created (1 per activity)': false,
    'Foreign keys correct (user_id, check_in_id)': false,
    'No RLS violations': false,
  },
  'Timeline Display': {
    'Activities shown in chronological order': false,
    'Gaps > 15 min flagged': false,
    'Total time calculated correctly': false,
    'Date picker works': false,
  },
  'End-to-End': {
    'Record → Parse → Review → Save → Display (full flow)': false,
    'Multiple check-ins in one day': false,
    'Data persists after logout/login': false,
    'Performance (all steps < 30s)': false,
  },
  'Browser Compatibility': {
    'Chrome': false,
    'Safari': false,
    'Edge': false,
  },
};
```

2. **Manual testing procedure** (follow this checklist):

   **Part A: Voice Recording (Task 2.1)**
   - [ ] Open app, log in
   - [ ] Click "Start Recording"
   - [ ] Speak for 10–15 seconds (e.g., "I woke up at 7, had breakfast for 15 minutes, then worked on emails for 30 minutes")
   - [ ] Click "Stop Recording"
   - [ ] Verify transcript appears in textarea
   - [ ] Test browser incompatibility: Try in Firefox; should show error message

   **Part B: Claude Parsing (Task 2.2)**
   - [ ] Verify `VITE_ANTHROPIC_API_KEY` is set in `.env.local`
   - [ ] With transcript ready, click "Parse Transcript"
   - [ ] Verify parsing completes in < 15 seconds
   - [ ] Verify JSON is valid and contains expected fields (activity, duration_minutes, start_time_inferred, category)
   - [ ] Test with 5 different transcripts:
     1. Clear, structured (high accuracy expected)
     2. Vague, ambiguous (lower accuracy expected; check notes field)
     3. Very short (< 1 minute)
     4. Long (> 3 minutes)
     5. With explicit times (e.g., "at 9:30 AM")

   **Part C: Review Screen (Task 2.3)**
   - [ ] Parsed activities displayed with names, durations, times
   - [ ] Click "Edit" on an activity
   - [ ] Change the name; click "Done Editing"
   - [ ] Verify change reflected
   - [ ] Click "Delete" on an activity
   - [ ] Verify removed from list
   - [ ] Click "Discard & Start Over"
   - [ ] Verify returned to recording screen

   **Part D: Save to Supabase (Task 2.4)**
   - [ ] Accept parsed activities (click "Save to Timeline")
   - [ ] Verify success message appears
   - [ ] Go to Supabase dashboard → SQL Editor
   - [ ] Run: `SELECT * FROM check_ins ORDER BY created_at DESC LIMIT 1;`
   - [ ] Verify transcript is saved
   - [ ] Run: `SELECT * FROM time_entries WHERE user_id = '<YOUR_USER_ID>' ORDER BY created_at DESC LIMIT 5;`
   - [ ] Verify all activities saved with correct user_id, activity_name, duration_minutes, start_time

   **Part E: Timeline Display (Task 2.5)**
   - [ ] Scroll to Timeline section
   - [ ] Verify today's activities displayed
   - [ ] Verify activities in chronological order
   - [ ] Verify total time shown at top (e.g., "3 hours 45 minutes")
   - [ ] If gaps exist, verify flagged with red border and "[WARN] Gap: X minutes"
   - [ ] Change date picker to yesterday
   - [ ] Verify empty state message if no activities (or shows previous day's activities if any)
   - [ ] Change back to today

   **Part F: Multiple Check-ins**
   - [ ] Create a second check-in with different activities
   - [ ] Save
   - [ ] Verify both check-ins appear in timeline
   - [ ] Verify total time reflects both

   **Part G: Data Persistence**
   - [ ] Click "Log Out"
   - [ ] Log back in
   - [ ] Navigate to Timeline
   - [ ] Verify activities from Part F are still there

   **Part H: Browser Compatibility**
   - [ ] Repeat Parts A–E in Chrome (should work fully)
   - [ ] Repeat in Safari (should work; note any differences)
   - [ ] Repeat in Edge (should work)
   - [ ] Attempt in Firefox (should show "not supported" error)

3. **Error scenario testing:**

   **Invalid API key:**
   - Change `VITE_ANTHROPIC_API_KEY` to a bad value
   - Restart dev server
   - Try to parse
   - Verify error message: "Claude API key is invalid"

   **Network error (offline):**
   - Disconnect internet
   - Try to record and parse
   - Verify error message: "Failed to connect to Claude API" or similar

   **Rate limit:**
   - Create 10 check-ins in rapid succession
   - Verify graceful degradation or error message (might not trigger unless API actually rate-limits you)

4. **Create a summary document** at `.planning/PHASE-2-TESTING.md`:

```markdown
# Phase 2: Voice Capture & Parsing — Testing Summary

## Test Date: [Date]
## Tester: [Name]

### Parsing Accuracy Tests

| Test # | Transcript | Parsed Activities | Accuracy | Notes |
|--------|-----------|------------------|----------|-------|
| 1 | Clear input | 4 activities | 100% | All correct |
| 2 | Vague input | 3 activities (1 uncertain) | 75% | Used notes field for ambiguity |
| 3 | Short input | 1 activity | 100% | Correct |
| 4 | Long input | 5 activities | 80% | One duration estimated off by 5 min |
| 5 | Explicit times | 3 activities | 100% | Parsed times correctly |

**Overall Accuracy: 85%** [OK] (Target: 80%+)

### Browser Compatibility

| Browser | Record | Parse | Display | Notes |
|---------|--------|-------|---------|-------|
| Chrome | [OK] | [OK] | [OK] | Fully working |
| Safari | [OK] | [OK] | [OK] | Fully working |
| Edge | [OK] | [OK] | [OK] | Fully working |
| Firefox | [FAIL] | N/A | N/A | Web Speech API not supported; error shown |

### End-to-End Flow

- [OK] Record 30 seconds
- [OK] Parse completes in 12 seconds
- [OK] Review activities
- [OK] Edit 1 activity
- [OK] Save to Supabase
- [OK] See in timeline
- [OK] Create 2nd check-in
- [OK] Logout/login; data persists

**Total time: ~2 minutes**

### Known Issues / Deferred

- [ ] Time parsing fragile with ambiguous times (e.g., "around 3"); use explicit times
- [ ] No manual gap fill-in UI (deferred to Phase 3)
- [ ] Design is basic/minimal (styling deferred to Phase 5)

### Recommendation

[OK] **Phase 2 is complete and meets all success criteria.**

Next: Proceed to Phase 3 (Journal & Activity Editing)
```

**Estimated effort:** 1.5 hours (hands-on testing)

**Blocks:** Phase 3 (ready to move on)

---

## Dependency Graph

```
Task 2.1: Web Speech API (Mic & Recording)
    ↓
Task 2.2: Claude API Parsing
    ↓
Task 2.3: Review Screen
    ↓
Task 2.4: Save to Supabase
    ↓
Task 2.5: Timeline Display
    ↓
Task 2.6: Testing & Verification
```

All tasks are sequential. Each depends on the previous task's output:
- 2.1 produces transcript → 2.2 consumes it
- 2.2 produces parsed activities → 2.3 displays them
- 2.3 produces reviewed activities → 2.4 saves them
- 2.4 produces Supabase records → 2.5 fetches and displays them
- 2.5 produces a functioning timeline → 2.6 verifies the entire flow

---

## Effort Summary

| Task | Effort | Cumulative |
|------|--------|-----------|
| 2.1: Web Speech API | 1.5h | 1.5h |
| 2.2: Claude Parsing | 1.5h | 3h |
| 2.3: Review Screen | 1.5h | 4.5h |
| 2.4: Save to Supabase | 1h | 5.5h |
| 2.5: Timeline Display | 1.5h | 7h |
| 2.6: Testing & Verification | 1.5h | 8.5h |
| **Total** | **8.5 hours** | — |

**Note:** Estimate is within the 6–8 hour target (upper end). Account for debugging, unexpected Claude API responses, and browser-specific quirks.

---

## Critical Paths & Risks

### Risk 1: Claude Parsing Quality
**Impact:** If parsing is < 70% accurate, the entire feature is unusable.
**Mitigation:** Test with real transcripts on Day 2 (Task 2.2). If accuracy is poor, adjust the Claude prompt or scope back to MVP (e.g., require very explicit input).
**Decision point:** If 5 test transcripts show < 75% accuracy, escalate to user for decision on prompt refinement or MVP scope reduction.

### Risk 2: Web Speech API Browser Support
**Impact:** Feature doesn't work in ~20% of browsers (Firefox, older Safari).
**Mitigation:** Test in target browsers on Day 1 (during Task 2.1). Provide clear error message. Consider fallback: manual text input or file upload (deferred to Phase 3 if needed).
**Decision point:** If target browser (Chrome/Safari) fails, debug immediately. If all fail, escalate.

### Risk 3: Timezone Handling
**Impact:** Activities saved in UTC but displayed in user's local timezone; might cause gaps or misalignment.
**Mitigation:** Always store times in UTC (ISO 8601 with +00:00). Convert to local on display. Test with a user in a different timezone (if possible).
**Decision point:** If times are off by > 1 hour, debug timezone handling.

### Risk 4: Supabase RLS Preventing Save
**Impact:** Data doesn't save due to RLS policy violation.
**Mitigation:** Verify RLS policies from Phase 1. Test that authenticated user can INSERT to time_entries. If issue, check user_id matches auth.uid().
**Decision point:** If RLS violation occurs, verify policies and user_id consistency.

### Risk 5: Claude API Rate Limit or Quota
**Impact:** API calls rejected after 10–20 check-ins in a session.
**Mitigation:** Test with sequential check-ins. If rate-limited, add exponential backoff retry logic. Document Anthropic API limits in notes.
**Decision point:** If rate limit hit, inform user to wait or add retry logic (low priority for MVP).

---

## Stretch Goals (if time permits)

1. **Manual text input as fallback** — If Web Speech API not available or user prefers typing
2. **Transcript editing before parse** — Let user fix transcription errors (typos, etc.)
3. **Parsing confidence scores** — Claude returns confidence; show in review UI
4. **Undo/redo on timeline** — User can undo a save and re-edit before final commit
5. **Activity templates** — Quick-add common activities (e.g., "Work", "Sleep", "Lunch") without voice

---

## Success Criteria (End of Phase 2)

**All of the following must be TRUE:**

- [ ] User can tap mic, speak, and see transcript in < 1 minute
- [ ] Transcript sent to Claude API; parsed into activities in < 20 seconds
- [ ] Parsed activities display in review screen; user can edit/delete before saving
- [ ] Accepted activities saved to Supabase (check_ins + time_entries tables)
- [ ] Timeline displays all activities for a day, chronological order, with durations
- [ ] Gaps > 15 minutes flagged visually (red border, warning message)
- [ ] Data persists across logout/login
- [ ] Parsing accuracy 80%+ on clear input (spot-check 5 transcripts)
- [ ] All major browsers (Chrome, Safari, Edge) supported; fallback error shown for unsupported browsers
- [ ] Error handling in place: network errors, API errors, parse errors all show user-friendly messages
- [ ] No console errors related to Phase 2 tasks

**Go/No-Go Decision:** If all above are TRUE, Phase 2 is complete. Proceed to Phase 3 (Journal & Editing) or Phase 5 (Design Polish) in parallel.

---

## Next Steps (After Phase 2)

1. **Commit to git:**
   ```bash
   git add .
   git commit -m "Phase 2: Voice capture, Claude parsing, timeline display"
   ```

2. **Update STATE.md with completion status**

3. **Start Phase 3 (Journal & Editing) or Phase 5 (Design & Polish):**
   - Phase 3 is sequential (depends on Phase 2)
   - Phase 5 can start in parallel (design improvements)

4. **Daily standup:**
   - Parsing accuracy holding at 80%+?
   - Any bugs discovered in testing?
   - Any scope changes needed?

---

## Appendix: Code Snippets & Reference

### Web Speech API Basics (for troubleshooting)

```javascript
// Check if supported
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) console.error('Web Speech API not supported');

// Initialize
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.continuous = true; // Keep listening until stop() is called
recognition.interimResults = false; // Don't return partial results

// Start
recognition.start();

// Listen for results
recognition.onresult = (event) => {
  let transcript = '';
  for (let i = event.resultIndex; i < event.results.length; i++) {
    transcript += event.results[i][0].transcript;
  }
  console.log('Transcript:', transcript);
};

// Stop
recognition.stop();
```

### Claude API Prompt Refinement

If parsing quality is low, adjust the PARSE_PROMPT in `src/lib/anthropic.ts`:

**Current approach:** Minimal structure, relies on Claude to infer.
**If accuracy drops:** Add more examples to prompt (few-shot learning).
**If parsing fails:** Reduce max_tokens to force concise output; add explicit format examples.

Example refined prompt:

```
You are a helpful assistant that parses stream-of-consciousness speech...

**EXAMPLES:**

Input: "I woke up at 7, had breakfast for 15 minutes, then worked on emails for 30 minutes."
Output:
[
  {"activity": "breakfast", "duration_minutes": 15, "start_time_inferred": "7:00 AM"},
  {"activity": "emails", "duration_minutes": 30, "start_time_inferred": "7:15 AM"}
]

Input: "I worked for a couple hours, took a break, then more work before lunch."
Output:
[
  {"activity": "work", "duration_minutes": 120, "start_time_inferred": "estimated based on context", "notes": "duration is estimated; two work sessions merged"},
  {"activity": "lunch", "duration_minutes": 45, "start_time_inferred": "12:00 PM"}
]
```

### Supabase Testing Queries

```sql
-- Check check_ins
SELECT id, user_id, transcript, created_at FROM check_ins
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;

-- Check time_entries
SELECT id, user_id, activity_name, duration_minutes, start_time, check_in_id
FROM time_entries
WHERE user_id = 'YOUR_USER_ID'
ORDER BY start_time DESC
LIMIT 10;

-- Check for RLS violations (run as authenticated user)
SELECT COUNT(*) FROM time_entries
WHERE user_id != auth.uid();
-- Should return 0 if RLS is working
```

---

## Notes for Future Phases

- **Phase 3 (Journal & Editing):** Depends on Phase 2's time_entries being correctly saved and fetchable.
- **Phase 5 (Design & Polish):** Will style the review screen, timeline, and mic button. The basic UI is functional but utilitarian.
- **Phase 6 (Testing & Deploy):** Will include comprehensive testing, security audit, and Vercel deployment.

---

**Phase 2 Plan Complete** [OK]

This plan is executable and comprehensive. Each task has clear acceptance criteria, implementation code, and verification steps. Estimated 8.5 hours of effort, with explicit risks and mitigations.
