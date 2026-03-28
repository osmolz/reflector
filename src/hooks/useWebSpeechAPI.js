import { useEffect, useState } from 'react';

const SpeechRecognition =
  (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

export function useWebSpeechAPI() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported] = useState(() => SpeechRecognition !== null);
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
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
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

    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [recognition]);

  const startListening = () => {
    if (!recognition) {
      console.error('Speech Recognition not supported');
      return;
    }
    try {
      setTranscript('');
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };

  const stopListening = () => {
    if (!recognition) return;
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
