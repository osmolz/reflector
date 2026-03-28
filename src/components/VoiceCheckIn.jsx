import { useState } from 'react';
import { MicButton } from './MicButton';

export function VoiceCheckIn() {
  const [transcript, setTranscript] = useState('');

  const handleTranscriptReady = (text) => {
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
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  );
}
