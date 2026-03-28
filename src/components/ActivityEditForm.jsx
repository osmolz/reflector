import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Modal.css';

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

      onSave();
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

      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="modal" role="dialog" aria-labelledby="edit-activity-title">
        <div className="modal-header">
          <h2 className="modal-title" id="edit-activity-title">Edit Activity</h2>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-form-group">
            <label htmlFor="activity-name">Activity Name</label>
            <input
              id="activity-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              aria-label="Activity name"
            />
          </div>

          <div className="modal-form-group">
            <label htmlFor="activity-duration">Duration (minutes)</label>
            <input
              id="activity-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              min="1"
              disabled={loading}
              required
              aria-label="Duration in minutes"
            />
          </div>

          <div className="modal-form-group">
            <label htmlFor="activity-category">Category</label>
            <input
              id="activity-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., work, personal, sleep"
              disabled={loading}
              aria-label="Activity category"
            />
          </div>

          <div className="modal-form-group">
            <label htmlFor="activity-start-time">Start Time</label>
            <input
              id="activity-start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={loading}
              required
              aria-label="Activity start time"
            />
          </div>

          {error && (
            <div className="modal-error" role="alert">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              aria-label={loading ? 'Saving activity' : 'Save activity'}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="modal-danger-button"
            aria-label="Delete activity"
          >
            Delete Activity
          </button>
        </form>
      </div>
    </>
  );
}
