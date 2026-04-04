import { useState, useRef } from 'react';
import './MicButton.css';

function MicIcon() {
  return (
    <svg
      className="mic-button-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M19 10v1a7 7 0 01-14 0v-1M12 18v3M8 22h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      className="mic-button-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

export function MicButton({ onTranscriptReady, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const activeRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Web Speech API not supported in this browser. Use Chrome, Safari, or Edge.');
      return;
    }

    try {
      transcriptRef.current = '';
      activeRef.current = true;
      stopRequestedRef.current = false;
      setError(null);

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptRef.current += event.results[i][0].transcript + ' ';
        }
      };

      recognition.onerror = (event) => {
        const code = event.error || 'Unknown error';
        if (code === 'aborted' && stopRequestedRef.current) {
          return;
        }
        if (code === 'no-speech' && activeRef.current && !stopRequestedRef.current) {
          setTimeout(() => {
            if (activeRef.current && !stopRequestedRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch {
                /* InvalidStateError: already started */
              }
            }
          }, 0);
          return;
        }
        setError(`Recording error: ${code}. Please try again.`);
        activeRef.current = false;
        stopRequestedRef.current = false;
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        if (activeRef.current && !stopRequestedRef.current) {
          setTimeout(() => {
            if (activeRef.current && !stopRequestedRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch {
                /* InvalidStateError */
              }
            }
          }, 0);
          return;
        }

        const shouldSubmit = stopRequestedRef.current;
        activeRef.current = false;
        stopRequestedRef.current = false;
        setIsRecording(false);
        recognitionRef.current = null;
        if (shouldSubmit) {
          const text = transcriptRef.current.trim();
          if (text) {
            onTranscriptReady(text);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      activeRef.current = false;
      recognitionRef.current = null;
    }
  };

  const stopRecording = () => {
    stopRequestedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  };

  const handleClick = () => {
    if (disabled) return;
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
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          aria-pressed={isRecording}
          title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
        >
          {isRecording ? <StopIcon /> : <MicIcon />}
        </button>
        {isRecording ? (
          <div className="mic-status recording">Recording...</div>
        ) : null}
      </div>
      {error && <div className="mic-error">{error}</div>}
    </div>
  );
}
