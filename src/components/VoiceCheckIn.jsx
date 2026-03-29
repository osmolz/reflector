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

      setStage('saved');
      onActivitiesSaved?.();
    } catch (err) {
      setError(err.message || 'Failed to save activities. Please try again.');
      setIsLoading(false);
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
  };

  if (stage === 'saved') {
    return (
      <div className="voice-check-in">
        <h2>Activities Saved</h2>
        <p>Your check-in has been saved to the timeline.</p>
        <button className="btn btn-primary" onClick={handleDiscard}>
          Record Another Check-in
        </button>
      </div>
    );
  }

  return (
    <div className="voice-check-in">
      <h2>Check-in</h2>
      {stage === 'recording' && (
        <>
          {!inputMode && (
            <div className="voice-check-in-mode-select">
              <button className="btn btn-primary" onClick={() => setInputMode('voice')}>
                Speak
              </button>
              <button className="btn btn-primary" onClick={() => setInputMode('text')}>
                Type
              </button>
            </div>
          )}

          {inputMode === 'voice' && (
            <>
              <button className="btn btn-secondary voice-check-in-back" onClick={() => setInputMode(null)}>
                Back
              </button>
              <MicButton onTranscriptReady={handleTranscriptReady} />
            </>
          )}

          {inputMode === 'text' && (
            <>
              <button className="btn btn-secondary voice-check-in-back" onClick={() => setInputMode(null)}>
                Back
              </button>
              <div className="form-group">
                <label>What did you do today?</label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Describe your activities, times, and durations..."
                  className="voice-check-in-textarea"
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleTranscriptReady(transcript)}
                disabled={isLoading || !transcript.trim()}
              >
                {isLoading ? 'Parsing...' : 'Parse & Continue'}
              </button>
            </>
          )}

          {transcript && inputMode === 'voice' && (
            <div className="voice-check-in-transcript">
              <h3>Your transcript</h3>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="voice-check-in-textarea"
              />
              <button
                className="btn btn-primary"
                onClick={() => handleTranscriptReady(transcript)}
                disabled={isLoading}
                style={{ marginTop: 'var(--space-md)' }}
              >
                {isLoading ? 'Parsing...' : 'Parse Transcript'}
              </button>
            </div>
          )}

          {error && <div className="voice-check-in-error">{error}</div>}
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
