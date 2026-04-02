import { useState, useEffect } from 'react';
import './ActivityReview.css';

export function ActivityReview({
  activities,
  isLoading,
  onSave,
  onDiscard,
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedActivities, setEditedActivities] = useState(activities);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Sync external activities changes
  useEffect(() => {
    setEditedActivities(activities);
  }, [activities]);

  const handleEditStart = (index) => {
    setEditingIndex(index);
  };

  const handleEdit = (index, field, value) => {
    const updated = [...editedActivities];
    updated[index] = { ...updated[index], [field]: value };
    setEditedActivities(updated);
  };

  const handleDelete = (index) => {
    const updated = editedActivities.filter((_, i) => i !== index);
    setEditedActivities(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(editedActivities);
      // #region agent log
      fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'773e28'},body:JSON.stringify({sessionId:'773e28',location:'ActivityReview.jsx:handleSave',message:'onSave fulfilled',data:{},timestamp:Date.now(),runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      setSaveError(error.message || 'Failed to save activities.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="activity-review-loading">
        <p>Parsing your speech...</p>
        <div className="activity-review-loading-spinner">Loading...</div>
      </div>
    );
  }

  if (editedActivities.length === 0) {
    return (
      <div className="activity-review-empty">
        <p>No activities parsed. Try recording again or edit your transcript.</p>
        <button
          type="button"
          onClick={onDiscard}
          aria-label="Start over with a new recording"
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="activity-review">
      <h3 className="activity-review-title">Review Parsed Activities</h3>

      <div>
        {editedActivities.map((activity, index) => (
          <div
            key={index}
            className={`activity-item ${editingIndex === index ? 'editing' : ''}`}
          >
            <div className="activity-item-header">
              <div className="activity-item-content">
                {editingIndex === index ? (
                  <form className="activity-item-form" onSubmit={(e) => { e.preventDefault(); setEditingIndex(null); }}>
                    <div className="activity-item-form-group">
                      <label htmlFor={`activity-name-${index}`}>Activity name</label>
                      <input
                        id={`activity-name-${index}`}
                        type="text"
                        value={activity.activity}
                        onChange={(e) => handleEdit(index, 'activity', e.target.value)}
                        placeholder="Activity name"
                        aria-label="Activity name"
                      />
                    </div>

                    <div className="activity-item-form-row">
                      <div className="activity-item-form-group">
                        <label htmlFor={`duration-${index}`}>Duration (min)</label>
                        <input
                          id={`duration-${index}`}
                          type="number"
                          value={activity.duration_minutes}
                          onChange={(e) =>
                            handleEdit(index, 'duration_minutes', Number(e.target.value))
                          }
                          aria-label="Duration in minutes"
                        />
                      </div>
                      <div className="activity-item-form-group">
                        <label htmlFor={`start-time-${index}`}>Start time</label>
                        <input
                          id={`start-time-${index}`}
                          type="text"
                          value={activity.start_time_inferred}
                          onChange={(e) => handleEdit(index, 'start_time_inferred', e.target.value)}
                          placeholder="HH:MM AM/PM"
                          aria-label="Start time"
                        />
                      </div>
                    </div>

                    <div className="activity-item-form-group">
                      <label htmlFor={`category-${index}`}>Category (optional)</label>
                      <input
                        id={`category-${index}`}
                        type="text"
                        value={activity.category || ''}
                        onChange={(e) => handleEdit(index, 'category', e.target.value || undefined)}
                        placeholder="e.g., work, personal, exercise"
                        aria-label="Activity category"
                      />
                    </div>

                    <div className="activity-item-edit-actions">
                      <button
                        type="submit"
                        className="btn-save"
                        aria-label="Done editing this activity"
                      >
                        Done Editing
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="activity-item-name">{activity.activity}</div>
                    <div className="activity-item-meta">
                      <span className="activity-item-duration">{activity.duration_minutes}m</span>
                      <span className="activity-item-time">{activity.start_time_inferred}</span>
                      {activity.category && (
                        <span className="activity-item-category">{activity.category}</span>
                      )}
                    </div>
                    {activity.notes && (
                      <div className="activity-item-note">
                        Note: {activity.notes}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="activity-item-actions">
                {editingIndex !== index && (
                  <button
                    type="button"
                    onClick={() => handleEditStart(index)}
                    className="btn-edit"
                    aria-label={`Edit ${activity.activity}`}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="btn-delete"
                  aria-label={`Delete ${activity.activity}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {saveError && (
        <div className="activity-review-error" role="alert">
          Error: {saveError}
        </div>
      )}

      <div className="activity-review-controls">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || editedActivities.length === 0}
          className="btn-save-activities"
          aria-label={isSaving ? 'Saving activities' : 'Save activities to timeline'}
        >
          {isSaving ? 'Saving...' : 'Save to Timeline'}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="btn-discard"
          aria-label="Discard parsed activities and start over"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
