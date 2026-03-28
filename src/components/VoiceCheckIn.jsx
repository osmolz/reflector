import { useState } from 'react';
import { MicButton } from './MicButton';
import { ActivityReview } from './ActivityReview';
import { parseTranscript } from '../lib/anthropic';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function VoiceCheckIn({ onActivitiesSaved }) {
  const [transcript, setTranscript] = useState('');
  const [parsedActivities, setParsedActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('recording'); // 'recording', 'review', 'saved'

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
            fontSize: '14px',
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
            <div style={{ color: '#c0392b', marginTop: '10px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
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
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
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
                  fontSize: '14px',
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
