import { useState, useEffect } from 'react';

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
    } catch (error) {
      setSaveError(error.message || 'Failed to save activities.');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Parsing your speech...</p>
        <div style={{ marginTop: '10px', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (editedActivities.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <p>No activities parsed. Try recording again or edit your transcript.</p>
        <button
          onClick={onDiscard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3>Review Parsed Activities</h3>
      <div style={{ marginTop: '20px' }}>
        {editedActivities.map((activity, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '10px',
              backgroundColor: editingIndex === index ? '#f0f0f0' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                {editingIndex === index ? (
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Activity name:</label>
                      <input
                        type="text"
                        value={activity.activity}
                        onChange={(e) => handleEdit(index, 'activity', e.target.value)}
                        style={{
                          padding: '6px',
                          fontSize: '14px',
                          width: '100%',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="Activity name"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Duration (min):</label>
                        <input
                          type="number"
                          value={activity.duration_minutes}
                          onChange={(e) =>
                            handleEdit(index, 'duration_minutes', Number(e.target.value))
                          }
                          style={{
                            padding: '6px',
                            fontSize: '14px',
                            width: '100%',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Start time:</label>
                        <input
                          type="text"
                          value={activity.start_time_inferred}
                          onChange={(e) => handleEdit(index, 'start_time_inferred', e.target.value)}
                          style={{
                            padding: '6px',
                            fontSize: '14px',
                            width: '100%',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                          }}
                          placeholder="HH:MM AM/PM"
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Category (optional):</label>
                      <input
                        type="text"
                        value={activity.category || ''}
                        onChange={(e) => handleEdit(index, 'category', e.target.value || undefined)}
                        style={{
                          padding: '6px',
                          fontSize: '14px',
                          width: '100%',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="e.g., work, personal, exercise"
                      />
                    </div>
                    <button
                      onClick={() => setEditingIndex(null)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Done Editing
                    </button>
                  </div>
                ) : (
                  <div>
                    <strong style={{ fontSize: '16px' }}>{activity.activity}</strong>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                      {activity.duration_minutes} min • {activity.start_time_inferred}
                      {activity.category && ` • ${activity.category}`}
                    </div>
                    {activity.notes && (
                      <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px' }}>
                        Note: {activity.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {editingIndex !== index && (
                  <button
                    onClick={() => handleEditStart(index)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDelete(index)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {saveError && (
        <div style={{ color: '#c0392b', marginTop: '10px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
          Error: {saveError}
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || editedActivities.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: isSaving ? '#95a5a6' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isSaving ? 'Saving...' : 'Save to Timeline'}
        </button>
        <button
          onClick={onDiscard}
          style={{
            padding: '10px 20px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Discard & Start Over
        </button>
      </div>
    </div>
  );
}
