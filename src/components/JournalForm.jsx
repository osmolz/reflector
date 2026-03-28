import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWebSpeechAPI } from '../hooks/useWebSpeechAPI';
import './Journal.css';

export function JournalForm({ onEntryCreated }) {
  const user = useAuthStore((state) => state.user);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useWebSpeechAPI();

  const handleVoiceInput = () => {
    if (!isSupported) {
      setError('Web Speech API is not supported in this browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    if (isListening) {
      stopListening();
      if (transcript) {
        setText((prev) => {
          const combined = prev + (prev ? ' ' : '') + transcript;
          return combined.trim();
        });
        resetTranscript();
      }
    } else {
      setError('');
      resetTranscript();
      startListening();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('journal_entries').insert([
        {
          user_id: user.id,
          text: text.trim(),
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      setText('');
      onEntryCreated();
    } catch (err) {
      setError(err.message || 'Failed to save journal entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="journal-form">
      <div className="journal-form-group">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your thoughts here... or use the voice button below"
          rows={4}
          disabled={loading}
          className="journal-textarea"
          aria-label="Journal entry text"
        />
        <div className="journal-char-count">
          {text.length} characters
        </div>
      </div>

      <div className="journal-form-controls">
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={loading}
          className={`journal-voice-button ${isListening ? 'listening' : ''}`}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
          aria-pressed={isListening}
        >
          {isListening ? 'Stop Recording' : 'Start Voice Input'}
        </button>
        {!isSupported && (
          <span className="journal-error" role="alert">
            Web Speech API not supported
          </span>
        )}
        {isSupported && transcript && (
          <span className="journal-transcript">
            Transcript: {transcript}
          </span>
        )}
      </div>

      <div className="journal-form-controls">
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="journal-submit-button"
          aria-label={loading ? 'Saving entry' : 'Save entry'}
        >
          {loading ? 'Saving...' : 'Save Entry'}
        </button>
      </div>

      {error && (
        <div className="journal-error" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
