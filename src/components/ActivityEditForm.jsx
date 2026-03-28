import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function ActivityEditForm({ activity, onClose, onSave }) {
  const [name, setName] = useState(activity.activity_name);
  const [duration, setDuration] = useState(activity.duration_minutes);
  const [category, setCategory] = useState(activity.category || '');
  const [startTime, setStartTime] = useState(activity.start_time.slice(0, 16)); // datetime-local format
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || duration <= 0) {
      setError('Name is required and duration must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({
          activity_name: name.trim(),
          duration_minutes: parseInt(String(duration), 10),
          category: category.trim() || null,
          start_time: new Date(startTime).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activity.id);

      if (updateError) throw updateError;

      onSave(); // Notify parent to refresh timeline
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update activity');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    setLoading(true);
    setError('');

    try {
      const { error: deleteError } = await supabase.from('time_entries').delete().eq('id', activity.id);

      if (deleteError) throw deleteError;

      onSave(); // Refresh timeline
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          minWidth: '300px',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Edit Activity</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Activity Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Duration (minutes):
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              min="1"
              disabled={loading}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Category:</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., work, personal, sleep"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Start Time:</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={loading}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                fontSize: '1rem',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                color: '#d00',
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#ffe6e6',
                borderRadius: '4px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: '1px solid #0066cc',
                background: '#0066cc',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                fontFamily: 'inherit',
                fontSize: '1rem',
              }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                background: '#f5f5f5',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                fontFamily: 'inherit',
                fontSize: '1rem',
              }}
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid #d00',
              background: '#ffe6e6',
              color: '#d00',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              fontFamily: 'inherit',
              fontSize: '1rem',
            }}
          >
            Delete Activity
          </button>
        </form>
      </div>
    </>
  );
}
