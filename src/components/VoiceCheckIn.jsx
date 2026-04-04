import { useState } from 'react';
import { MicButton } from './MicButton';
import { ActivityReview } from './ActivityReview';
import { parseTranscript } from '../lib/anthropic';
import { saveTimelineCheckIn } from '../lib/saveTimelineCheckIn';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import './VoiceCheckIn.css';

function localDateYmd() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function VoiceCheckIn({ onActivitiesSaved, logDateYmd = localDateYmd() }) {
  const [transcript, setTranscript] = useState('');
  const [parsedActivities, setParsedActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('recording'); // 'recording', 'review', 'saved'

  const handleParseTranscript = async (text) => {
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

  const handleVoiceDraftReady = (text) => {
    setError(null);
    setTranscript((prev) => {
      const combined = `${prev} ${text}`.trim();
      return combined;
    });
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await saveTimelineCheckIn(session.access_token, transcript.trim(), activities, {
        logDateYmd,
        clientTimeZone,
      });

      // #region agent log
      fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'773e28'},body:JSON.stringify({sessionId:'773e28',location:'VoiceCheckIn.jsx:handleSaveActivities',message:'save success path',data:{},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
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

  const handleDiscard = () => {
    setTranscript('');
    setParsedActivities([]);
    setError(null);
    setStage('recording');
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
          <div className="form-group">
            <label htmlFor="voice-check-in-transcript">Activities and times</label>
            <p className="voice-check-in-helper">
              Type directly, or record and then review before saving.
            </p>
            <textarea
              id="voice-check-in-transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Example: 9am–12pm deep work, lunch 12–1, meetings 2–4."
              className="voice-check-in-textarea"
            />
            <div className="voice-check-in-actions">
              <MicButton onTranscriptReady={handleVoiceDraftReady} />
              <button
                type="button"
                className="btn btn-primary voice-check-in-parse"
                onClick={() => handleParseTranscript(transcript)}
                disabled={isLoading || !transcript.trim()}
              >
                {isLoading ? 'Parsing...' : 'Parse and review'}
              </button>
            </div>
          </div>

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


