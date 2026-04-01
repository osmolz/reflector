import { useEffect, useState, useRef } from 'react';

const SpeechRecognition =
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

export function useWebSpeechAPI() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported] = useState(() => SpeechRecognition !== null);
  const activeRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const recognitionRef = useRef(null);

  const [recognition] = useState(() => {
    if (!SpeechRecognition) return null;
    const instance = new SpeechRecognition();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = 'en-US';
    return instance;
  });

  useEffect(() => {
    if (!recognition) return;

    recognition.onstart = () => {
      setIsListening(true);
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
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      const code = event.error || 'unknown';
      if (code === 'aborted' && stopRequestedRef.current) {
        return;
      }
      if (code === 'no-speech' && activeRef.current && !stopRequestedRef.current) {
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
      console.error('Speech recognition error:', event.error);
      activeRef.current = false;
      stopRequestedRef.current = false;
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          setTranscript((prev) => {
            const combined = prev + ' ' + transcriptSegment;
            return combined.trim();
          });
        } else {
          interimTranscript += transcriptSegment;
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      activeRef.current = false;
      stopRequestedRef.current = false;
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
      recognitionRef.current = null;
    };
  }, [recognition]);

  const startListening = () => {
    if (!recognition) {
      console.error('Speech Recognition not supported');
      return;
    }
    try {
      activeRef.current = true;
      stopRequestedRef.current = false;
      setTranscript('');
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };

  const stopListening = () => {
    if (!recognition) return;
    stopRequestedRef.current = true;
    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
