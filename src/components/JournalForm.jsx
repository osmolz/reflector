import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { MicButton } from './MicButton';
import './Journal.css';

/** Local-calendar YYYY-MM-DD → ISO timestamp (noon local) for `created_at`. */
function createdAtIsoFromLogDateYmd(ymd) {
  const parts = String(ymd || '')
    .split('-')
    .map((n) => parseInt(n, 10));
  const [y, m, d] = parts;
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

export function JournalForm({ onEntryCreated, logDateYmd }) {
  const user = useAuthStore((state) => state.user);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVoiceDraftReady = (draft) => {
    setError(null);
    setText((prev) => {
      const combined = `${prev} ${draft}`.trim();
      return combined;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      return;
    }
    if (!user) {
      setError('You need to be signed in to save a journal entry.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('journal_entries').insert([
        {
          user_id: user.id,
          text: text.trim(),
          created_at: createdAtIsoFromLogDateYmd(logDateYmd),
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
          placeholder="Write today's note"
          rows={4}
          disabled={loading}
          className="journal-textarea"
          aria-label="Journal entry text"
        />
        <div className="journal-form-actions">
          <MicButton onTranscriptReady={handleVoiceDraftReady} disabled={loading} />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="journal-submit-button"
            aria-label={loading ? 'Saving entry' : 'Save entry'}
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>

      {error && (
        <div className="journal-error" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
