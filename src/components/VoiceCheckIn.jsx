import { useState } from 'react';
import { MicButton } from './MicButton';
import { ActivityReview } from './ActivityReview';
import { parseTranscript } from '../lib/anthropic';

export function VoiceCheckIn() {
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
      const activities = await parseTranscript(text);
      setParsedActivities(activities);
      setStage('review');
    } catch (err) {
      setError(err.message || 'Failed to parse transcript.');
      setIsLoading(false);
    }
  };

  const handleSaveActivities = async (activities) => {
    // Task 2.4 will implement this with Supabase
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
