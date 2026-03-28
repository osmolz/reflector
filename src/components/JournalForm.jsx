import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useWebSpeechAPI } from '../hooks/useWebSpeechAPI';

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
      onEntryCreated(); // Trigger journal history refresh
    } catch (err) {
      setError(err.message || 'Failed to save journal entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your thoughts here... or use the voice button below"
          rows={4}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontFamily: 'inherit',
            fontSize: '1rem',
          }}
        />
        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#666' }}>
          {text.length} characters
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: isListening ? '#ffe6e6' : '#f5f5f5',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: isListening ? '#d00' : '#000',
            fontWeight: isListening ? 'bold' : 'normal',
            marginRight: '0.5rem',
          }}
        >
          {isListening ? 'Stop Recording' : 'Start Voice Input'}
        </button>
        {!isSupported && <span style={{ color: '#d00', fontSize: '0.9rem' }}>Web Speech API not supported</span>}
        {isSupported && transcript && (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#666' }}>(Transcript: {transcript})</span>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: '4px',
            border: '1px solid #0066cc',
            background: '#0066cc',
            color: 'white',
            cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !text.trim() ? 0.5 : 1,
          }}
        >
          {loading ? 'Saving...' : 'Save Entry'}
        </button>
      </div>

      {error && (
        <div
          style={{
            color: '#d00',
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#ffe6e6',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}
    </form>
  );
}
