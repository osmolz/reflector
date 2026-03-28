import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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
    return <div style={{ padding: '1rem', color: '#666' }}>Please log in to view journal entries</div>;
  }

  if (loading) {
    return <div style={{ padding: '1rem', color: '#666' }}>Loading journal...</div>;
  }

  if (error) {
    return (
      <div
        style={{
          padding: '1rem',
          color: '#d00',
          background: '#ffe6e6',
          borderRadius: '4px',
          marginTop: '1rem',
        }}
      >
        Error: {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: '1rem', color: '#666', fontStyle: 'italic' }}>
        No journal entries yet. Start writing!
      </div>
    );
  }

  return (
    <div>
      <h2>Journal History</h2>
      <div style={{ marginTop: '1rem' }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              border: '1px solid #ddd',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              background: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  {new Date(entry.created_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0066cc',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  padding: '0.25rem 0.5rem',
                }}
              >
                {expandedId === entry.id ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expandedId === entry.id ? (
              <p
                style={{
                  marginTop: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: '1.5',
                }}
              >
                {entry.text}
              </p>
            ) : (
              <p
                style={{
                  marginTop: '0.5rem',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {entry.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
