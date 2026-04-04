import { useState } from 'react';
import { getDateRangeForPreset } from '../utils/calendarUtils';
import './Modal.css';
import './SyncCalendarModal.css';

export function SyncCalendarModal({ isOpen, onClose, onSyncComplete }) {
  const [preset, setPreset] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize dates based on selected preset
  const handlePresetChange = (selectedPreset) => {
    setPreset(selectedPreset);
    setError('');
    setSuccess('');

    if (selectedPreset !== 'custom') {
      const { start, end } = getDateRangeForPreset(selectedPreset);
      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(end));
    }
  };

  // Format Date object to input[type="date"] format (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert input date to ISO string (full datetime)
  const dateToISOString = (dateStr) => {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  };

  const handleSync = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/functions/v1/sync-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateToISOString(startDate),
          endDate: dateToISOString(endDate),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to sync calendar');
      }

      setSuccess(`Synced ${data.eventsCount} event${data.eventsCount !== 1 ? 's' : ''}`);

      // Call completion callback if provided
      if (onSyncComplete) {
        onSyncComplete(data);
      }

      // Close modal after showing success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to sync calendar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="modal sync-calendar-modal"
        role="dialog"
        aria-labelledby="sync-calendar-title"
        aria-describedby="sync-calendar-description"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="sync-calendar-title">
            Sync Google Calendar
          </h2>
        </div>

        <div className="modal-content" id="sync-calendar-description">
          <p className="sync-modal-description">
            Select a date range to import events from your Google Calendar.
          </p>

          {/* Preset options */}
          <div className="sync-modal-presets">
            <div className="sync-preset-group">
              <label htmlFor="preset-today" className="sync-preset-label">
                <input
                  id="preset-today"
                  type="radio"
                  name="preset"
                  value="today"
                  checked={preset === 'today'}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  disabled={loading}
                  aria-label="Sync today's events"
                />
                Today
              </label>
            </div>

            <div className="sync-preset-group">
              <label htmlFor="preset-week" className="sync-preset-label">
                <input
                  id="preset-week"
                  type="radio"
                  name="preset"
                  value="week"
                  checked={preset === 'week'}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  disabled={loading}
                  aria-label="Sync this week's events"
                />
                This Week
              </label>
            </div>

            <div className="sync-preset-group">
              <label htmlFor="preset-custom" className="sync-preset-label">
                <input
                  id="preset-custom"
                  type="radio"
                  name="preset"
                  value="custom"
                  checked={preset === 'custom'}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  disabled={loading}
                  aria-label="Sync custom date range"
                />
                Custom Range
              </label>
            </div>
          </div>

          {/* Custom date range inputs */}
          {preset === 'custom' && (
            <div className="sync-modal-custom-dates">
              <div className="modal-form-group">
                <label htmlFor="start-date">Start Date</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setError('');
                    setSuccess('');
                  }}
                  disabled={loading}
                  aria-label="Start date"
                />
              </div>

              <div className="modal-form-group">
                <label htmlFor="end-date">End Date</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError('');
                    setSuccess('');
                  }}
                  disabled={loading}
                  aria-label="End date"
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="modal-error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="sync-modal-success" role="status" aria-live="polite">
              {success}
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="sync-modal-spinner" aria-hidden="true">
              <div className="spinner-ring"></div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="modal-actions">
          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className="btn-primary"
            aria-label={loading ? 'Syncing calendar events' : 'Sync calendar events'}
          >
            {loading ? 'Syncing...' : 'Sync'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary"
            aria-label="Close sync modal"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
