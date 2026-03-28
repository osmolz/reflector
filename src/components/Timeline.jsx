import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ActivityEditForm } from './ActivityEditForm';
import { calculateGaps, formatTime, sortActivities } from '../utils/timelineUtils';
import './Timeline.css';

// Format a date string into a day-name and date string
function formatDayLabel(dateStr) {
  const d = new Date(dateStr);
  const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });
  const datePart = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return { dayName, datePart };
}

// Group activities by calendar date (YYYY-MM-DD local)
function groupByDay(activities) {
  const groups = {};
  for (const activity of activities) {
    const d = new Date(activity.start_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(activity);
  }
  return groups;
}

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
    fetchActivities();
  };

  if (!user) {
    return (
      <div className="timeline-wrapper">
        <p className="timeline-empty-message">Please log in to view your timeline.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="timeline-wrapper">
        <p className="timeline-loading">Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timeline-wrapper">
        <div className="timeline-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="timeline-wrapper">
        <div className="timeline-header">
          <h1 className="timeline-page-title">Timeline</h1>
        </div>
        <div className="timeline-empty">
          <p className="timeline-empty-message">
            No activities yet. Record a voice check-in to get started.
          </p>
        </div>
      </div>
    );
  }

  const dayGroups = groupByDay(activities);
  const dayKeys = Object.keys(dayGroups).sort();

  return (
    <div className="timeline-wrapper">
      <div className="timeline-header">
        <h1 className="timeline-page-title">Timeline</h1>
        <p className="timeline-count">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
        </p>
      </div>

      {/* Days */}
      {dayKeys.map((dayKey) => {
        const dayActivities = dayGroups[dayKey];
        const { dayName, datePart } = formatDayLabel(dayActivities[0].start_time);

        return (
          <div key={dayKey} className="timeline-day">
            <div className="timeline-day-header">
              <span className="timeline-day-name">{dayName}</span>
              <span className="timeline-day-date">{datePart}</span>
            </div>

            <ul className="timeline-list" role="list">
              {dayActivities.map((activity, index) => {
                // Find gap after this activity
                const activityEnd =
                  new Date(activity.start_time).getTime() +
                  activity.duration_minutes * 60 * 1000;

                const gap = gaps.find((g) => {
                  return Math.abs(g.startTime.getTime() - activityEnd) < 60 * 1000;
                });

                return (
                  <li key={activity.id}>
                    <div
                      className="timeline-item"
                      onClick={() => setEditingActivity(activity)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setEditingActivity(activity);
                        }
                      }}
                      aria-label={`Edit ${activity.activity_name}`}
                    >
                      <span className="timeline-indicator" aria-hidden="true" />
                      <span className="timeline-time">
                        {formatTime(activity.start_time)}
                      </span>
                      <div className="timeline-content">
                        <div className="timeline-activity-name">
                          {activity.activity_name}
                        </div>
                        <div className="timeline-meta">
                          <span className="timeline-duration">
                            {activity.duration_minutes}m
                          </span>
                          {activity.category && (
                            <span className="timeline-category">
                              {activity.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="timeline-edit-hint" aria-hidden="true">
                        edit
                      </span>
                    </div>

                    {/* Gap indicator */}
                    {gap && index < dayActivities.length - 1 && (
                      <div className="timeline-gap" role="note" aria-label={`${gap.durationMinutes} minute gap`}>
                        <span className="timeline-gap-label">Gap</span>
                        <span className="timeline-gap-duration">{gap.durationMinutes}m unaccounted</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {/* Gaps summary */}
      {gaps.length > 0 && (
        <div className="timeline-gaps-summary">
          <p className="timeline-gaps-title">
            {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'} detected
          </p>
          <ul className="timeline-gaps-list" role="list">
            {gaps.map((gap, idx) => (
              <li key={idx} className="timeline-gap-row">
                {formatTime(gap.startTime)} – {formatTime(gap.endTime)} ({gap.durationMinutes}m)
              </li>
            ))}
          </ul>
        </div>
      )}

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
