import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ActivityEditForm } from './ActivityEditForm';
import { calculateGaps, formatTime, sortActivities } from '../utils/timelineUtils';

export function Timeline({ refreshKey = 0 }) {
  const user = useAuthStore((state) => state.user);
  const [activities, setActivities] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingActivity, setEditingActivity] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, [refreshKey, user]);

  const fetchActivities = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('time_entries')
        .select('id, activity_name, duration_minutes, category, start_time, check_in_id, created_at, updated_at')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      const sortedActivities = sortActivities(data || []);
      setActivities(sortedActivities);

      // Calculate gaps
      const calculatedGaps = calculateGaps(sortedActivities);
      setGaps(calculatedGaps);
    } catch (err) {
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleActivitySaved = () => {
    setEditingActivity(null);
    fetchActivities(); // Refresh timeline
  };

  if (!user) {
    return <div style={{ padding: '2rem', color: '#666' }}>Please log in to view timeline</div>;
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: '#666' }}>Loading timeline...</div>;
  }

  if (error) {
    return (
      <div
        style={{
          padding: '2rem',
          color: '#d00',
          background: '#ffe6e6',
          borderRadius: '4px',
          margin: '1rem',
        }}
      >
        Error: {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div style={{ padding: '2rem', color: '#666', fontStyle: 'italic' }}>
        No activities yet. Record a voice check-in to get started!
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Timeline</h1>

      <div style={{ marginTop: '2rem' }}>
        {activities.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>
              {activities.length} activities
            </h2>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {activities.map((activity, index) => (
            <div key={activity.id}>
              {/* Activity */}
              <div
                onClick={() => setEditingActivity(activity)}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  background: '#fafafa',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.borderColor = '#0066cc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fafafa';
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                      {activity.activity_name}
                    </strong>
                    <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      {formatTime(activity.start_time)} – {activity.duration_minutes}m
                      {activity.category && ` • ${activity.category}`}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#999' }}>
                      {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ color: '#0066cc', fontSize: '0.85rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                    Click to edit
                  </div>
                </div>
              </div>

              {/* Gap (if exists after this activity) */}
              {index < activities.length - 1 && gaps.some((gap) => {
                const activityEnd = new Date(activity.start_time).getTime() + activity.duration_minutes * 60 * 1000;
                return Math.abs(gap.startTime.getTime() - activityEnd) < 1000; // Same gap
              }) && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    margin: '0.5rem 0',
                    background: '#fff9e6',
                    border: '1px solid #ffe680',
                    borderRadius: '4px',
                    color: '#995500',
                    fontSize: '0.9rem',
                  }}
                >
                  ⚠️ Gap: {gaps.find((gap) => {
                    const activityEnd = new Date(activity.start_time).getTime() + activity.duration_minutes * 60 * 1000;
                    return Math.abs(gap.startTime.getTime() - activityEnd) < 1000;
                  })?.durationMinutes || 0}m
                </div>
              )}
            </div>
          ))}
        </div>

        {gaps.length > 0 && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
              {gaps.length} gap{gaps.length !== 1 ? 's' : ''} detected
            </strong>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {gaps.map((gap, idx) => (
                <div key={idx} style={{ marginBottom: '0.25rem' }}>
                  {formatTime(gap.startTime)} – {formatTime(gap.endTime)} ({gap.durationMinutes}m)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingActivity && (
        <ActivityEditForm
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={handleActivitySaved}
        />
      )}
    </div>
  );
}
