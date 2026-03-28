/**
 * Timeline utilities for gap calculation and activity management
 */

/**
 * Calculate gaps in a timeline of activities
 * Only flags gaps >= 15 minutes
 *
 * @param {Array} activities - Array of activities, sorted by start_time
 * @returns {Array} Array of gap objects
 */
export function calculateGaps(activities) {
  const gaps = [];

  if (activities.length < 2) return gaps;

  // Sort activities by start_time
  const sorted = [...activities].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentEnd = new Date(current.start_time).getTime() + current.duration_minutes * 60 * 1000;
    const nextStart = new Date(next.start_time).getTime();

    if (nextStart > currentEnd) {
      const gapMilliseconds = nextStart - currentEnd;
      const gapMinutes = gapMilliseconds / (60 * 1000);

      // Only flag gaps >= 15 minutes
      if (gapMinutes >= 15) {
        gaps.push({
          startTime: new Date(currentEnd),
          endTime: new Date(nextStart),
          durationMinutes: Math.round(gapMinutes),
        });
      }
    }
  }

  return gaps;
}

/**
 * Format time for display (HH:MM AM/PM)
 */
export function formatTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date for display (e.g., "Monday, March 28")
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get end time of an activity
 */
export function getActivityEndTime(activity) {
  const startTime = new Date(activity.start_time);
  const endTime = new Date(startTime.getTime() + activity.duration_minutes * 60 * 1000);
  return endTime;
}

/**
 * Sort activities chronologically
 */
export function sortActivities(activities) {
  return [...activities].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
}

/**
 * Group activities by date
 */
export function groupActivitiesByDate(activities) {
  const groups = new Map();

  activities.forEach((activity) => {
    const date = new Date(activity.start_time);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey).push(activity);
  });

  // Sort each group chronologically
  groups.forEach((activities) => {
    activities.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  });

  return groups;
}
