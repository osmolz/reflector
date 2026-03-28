import { useState, useRef } from 'react';
import './MicButton.css';

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
    <div className="mic-button-wrapper">
      <div className="mic-button-container">
        <button
          onClick={handleClick}
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          aria-pressed={isRecording}
          title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
        >
          {isRecording ? '🔴' : '🎤'}
        </button>
        <div className={`mic-status ${isRecording ? 'recording' : ''}`}>
          {isRecording ? 'Recording...' : 'Ready to record'}
        </div>
      </div>
      {error && <div className="mic-error">{error}</div>}
    </div>
  );
}
