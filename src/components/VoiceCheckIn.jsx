import { useState } from 'react';
import { MicButton } from './MicButton';
import { ActivityReview } from './ActivityReview';
import { parseTranscript } from '../lib/anthropic';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import './VoiceCheckIn.css';

export function VoiceCheckIn({ onActivitiesSaved }) {
  const [transcript, setTranscript] = useState('');
  const [parsedActivities, setParsedActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('recording'); // 'recording', 'review', 'saved'
  const [inputMode, setInputMode] = useState(null); // null, 'voice', 'text'

  const handleTranscriptReady = async (text) => {
    setTranscript(text);
    setError(null);
    setIsLoading(true);

    try {
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const activities = await parseTranscript(text, session.access_token);
      setParsedActivities(activities);
      setStage('review');
      setIsLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to parse transcript.');
      setIsLoading(false);
    }
  };

  const handleSaveActivities = async (activities) => {
    // #region agent log
    fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'773e28'},body:JSON.stringify({sessionId:'773e28',location:'VoiceCheckIn.jsx:handleSaveActivities',message:'save invoked',data:{activityCount:activities?.length},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setError(null);
    setIsLoading(true);

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // 1. Create a check_in record
      const { data: checkInData, error: checkInError } = await supabase
        .from('check_ins')
        .insert([
          {
            user_id: user.id,
            transcript: transcript.trim(),
            parsed_activities: activities, // JSONB
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (checkInError) throw checkInError;
      if (!checkInData || checkInData.length === 0) throw new Error('Failed to create check_in');

      const checkInId = checkInData[0].id;

      // 2. Create time_entries for each activity
      const timeEntries = activities.map((activity) => {
        // Parse start_time_inferred (HH:MM AM/PM) to ISO timestamp
        const startTime = parseTimeString(activity.start_time_inferred);

        return {
          user_id: user.id,
          activity_name: activity.activity,
          duration_minutes: activity.duration_minutes,
          category: activity.category || null,
          start_time: startTime,
          check_in_id: checkInId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      const { error: entriesError } = await supabase.from('time_entries').insert(timeEntries);

      if (entriesError) throw entriesError;

      // #region agent log
      fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'773e28'},body:JSON.stringify({sessionId:'773e28',location:'VoiceCheckIn.jsx:handleSaveActivities',message:'save success path',data:{checkInId},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setIsLoading(false);
      setStage('saved');
      onActivitiesSaved?.();
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'773e28'},body:JSON.stringify({sessionId:'773e28',location:'VoiceCheckIn.jsx:handleSaveActivities',message:'save catch (rethrowing to caller)',data:{message:err?.message,code:err?.code},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setError(err.message || 'Failed to save activities. Please try again.');
      setIsLoading(false);
      throw err;
    }
  };

  // Helper function to parse "HH:MM AM/PM" to ISO timestamp
  const parseTimeString = (timeStr) => {
    if (!timeStr) return new Date().toISOString();

    try {
      // Parse "HH:MM AM/PM" format
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return new Date().toISOString();

      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();

      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      // Create date for today with the specified time
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const handleDiscard = () => {
    setTranscript('');
    setParsedActivities([]);
    setError(null);
    setStage('recording');
    setInputMode(null);
    setIsLoading(false);
  };

  if (stage === 'saved') {
    return (
      <div className="voice-check-in">
        <p className="voice-check-in-status" role="status">
          Saved. Those entries are on your timeline.
        </p>
        <button type="button" className="btn btn-primary" onClick={handleDiscard}>
          Log more time
        </button>
      </div>
    );
  }

  return (
    <div className="voice-check-in">
      {stage === 'recording' && (
        <>
          {!inputMode && (
            <div className="voice-check-in-mode-select">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setInputMode('voice')}>
                Speak
              </button>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setInputMode('text')}>
                Type
              </button>
            </div>
          )}

          {inputMode === 'voice' && (
            <>
              <button type="button" className="btn btn-secondary voice-check-in-back" onClick={() => setInputMode(null)} aria-label="Back to choose speak or type">Back</button>
              <MicButton onTranscriptReady={handleTranscriptReady} />
            </>
          )}

          {inputMode === 'text' && (
            <>
              <button type="button" className="btn btn-secondary voice-check-in-back" onClick={() => setInputMode(null)} aria-label="Back to choose speak or type">Back</button>
              <div className="form-group">
                <label htmlFor="voice-check-in-transcript">Activities and times (for the parser)</label>
                <textarea
                  id="voice-check-in-transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Example: 9am–12pm deep work, lunch 12–1, meetings 2–4…"
                  className="voice-check-in-textarea"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleTranscriptReady(transcript)}
                disabled={isLoading || !transcript.trim()}
              >
                {isLoading ? 'Parsing...' : 'Parse and review'}
              </button>
            </>
          )}

          {transcript && inputMode === 'voice' && (
            <div className="voice-check-in-transcript">
              <label className="voice-check-in-transcript-label" htmlFor="voice-check-in-transcript-edit">
                Edit transcript before parsing
              </label>
              <textarea
                id="voice-check-in-transcript-edit"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="voice-check-in-textarea"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleTranscriptReady(transcript)}
                disabled={isLoading}
                style={{ marginTop: 'var(--space-md)' }}
              >
                {isLoading ? 'Parsing...' : 'Parse and review'}
              </button>
            </div>
          )}

          {error && <div className="voice-check-in-error">{error}</div>}
        </>
      )}
      {stage === 'review' && (
        <>
          {error && (
            <div className="voice-check-in-error" role="alert">
              {error}
            </div>
          )}
          <ActivityReview
            activities={parsedActivities}
            isLoading={isLoading}
            onSave={handleSaveActivities}
            onDiscard={handleDiscard}
          />
        </>
      )}
    </div>
  );
}


