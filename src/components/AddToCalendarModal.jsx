import { useState } from 'react';
import './Modal.css';
import './AddToCalendarModal.css';

/**
 * Modal component to create a calendar event from an existing time entry
 *
 * Props:
 *   isOpen (bool): Whether the modal is visible
 *   timeEntry (object): Time entry object with id, title, startTime, endTime
 *   onClose (function): Callback when modal should close
 *   onSuccess (function): Callback when event is successfully created
 */
export function AddToCalendarModal({ isOpen, timeEntry, onClose, onSuccess }) {
  const [title, setTitle] = useState(timeEntry?.activity_name || '');
  const [startTime, setStartTime] = useState(
    timeEntry?.start_time ? timeEntry.start_time.slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    timeEntry && timeEntry.start_time && timeEntry.duration_minutes
      ? new Date(
          new Date(timeEntry.start_time).getTime() +
            timeEntry.duration_minutes * 60 * 1000
        )
          .toISOString()
          .slice(0, 16)
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !timeEntry) {
    return null;
  }

  /**
   * Calculate duration in minutes based on start and end times
   */
  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    return Math.max(0, Math.round(durationMs / (60 * 1000)));
  };

  const duration = calculateDuration();

  /**
   * Handle adding the event to Google Calendar
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (duration <= 0) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/functions/v1/create-calendar-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          timeEntryId: timeEntry.id,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create calendar event: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create calendar event');
      }

      setSuccess(true);

      // Call onSuccess callback after brief delay to show success message
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create calendar event');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTitle(timeEntry?.activity_name || '');
      setStartTime(timeEntry?.start_time ? timeEntry.start_time.slice(0, 16) : '');
      setEndTime(
        timeEntry && timeEntry.start_time && timeEntry.duration_minutes
          ? new Date(
              new Date(timeEntry.start_time).getTime() +
                timeEntry.duration_minutes * 60 * 1000
            )
              .toISOString()
              .slice(0, 16)
          : ''
      );
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <>
      <div
        className="modal-backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className="modal add-to-calendar-modal"
        role="dialog"
        aria-labelledby="add-to-calendar-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="add-to-calendar-title">
            Add to Calendar
          </h2>
        </div>

        {success ? (
          <div className="add-to-calendar-success" role="status">
            <p className="success-message">Event added to Google Calendar</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-form-group">
              <label htmlFor="event-title">Event Title</label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                required
                aria-label="Event title"
              />
            </div>

            <div className="modal-form-group">
              <label htmlFor="event-start">Start Time</label>
              <input
                id="event-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={loading}
                required
                aria-label="Event start time"
              />
            </div>

            <div className="modal-form-group">
              <label htmlFor="event-end">End Time</label>
              <input
                id="event-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={loading}
                required
                aria-label="Event end time"
              />
            </div>

            <div className="modal-form-group">
              <label htmlFor="event-duration">Duration</label>
              <div className="duration-display" id="event-duration">
                {duration} minute{duration !== 1 ? 's' : ''}
              </div>
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
                aria-label={
                  loading ? 'Adding event to calendar' : 'Add to Google Calendar'
                }
              >
                {loading ? 'Adding...' : 'Add to Calendar'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn-secondary"
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
