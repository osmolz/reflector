import { useState, useRef } from 'react';

export function MicButton({ onTranscriptReady }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const startRecording = () => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
      };

      recognition.onerror = (event) => {
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
    } catch (err) {
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
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
        }}
      >
        {isRecording ? '🔴 Recording...' : '🎤 Start Recording'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>}
    </div>
  );
}
