import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import './Journal.css';

export function JournalHistory({ refreshKey }) {
  const user = useAuthStore((state) => state.user);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, [refreshKey, user]);

  const fetchEntries = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('journal_entries')
        .select('id, text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEntries(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="journal-loading">Please log in to view journal entries.</div>;
  }

  if (loading) {
    return <div className="journal-loading">Loading journal...</div>;
  }

  if (error) {
    return (
      <div className="journal-error" role="alert">
        Error: {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="journal-empty">
        <p className="journal-empty-message">No entries yet.</p>
      </div>
    );
  }

  return (
    <div className="journal-history">
      <h3 className="journal-history-heading">Previous entries</h3>
      <div className="journal-history-list">
        {entries.map((entry) => (
          <article key={entry.id} className="journal-entry">
            <div className="journal-entry-header">
              <div className="journal-entry-meta">
                <strong className="journal-entry-title">
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>
                <span className="journal-entry-date">
                  {new Date(entry.created_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <button
                type="button"
                aria-expanded={expandedId === entry.id}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="journal-entry-toggle"
              >
                {expandedId === entry.id ? 'Show less' : 'Show full note'}
              </button>
            </div>
            {expandedId === entry.id ? (
              <p className="journal-entry-body journal-entry-body-expanded">
                {entry.text}
              </p>
            ) : (
              <p className="journal-entry-body journal-entry-body-clamped">
                {entry.text}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
