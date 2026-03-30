import { TimeEntry } from '../types/chat';

export interface CalendarEvent {
  id: string;
  gcp_event_id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  calendar_id: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface MergedEvent {
  id: string;
  type: 'time_entry' | 'calendar_event';
  title: string;
  start_time: Date;
  end_time: Date;
  duration_minutes?: number;
  category?: string;
  gcp_event_id?: string;
}

// Merge time entries and calendar events into a single sorted list
export function mergeEvents(
  timeEntries: TimeEntry[],
  calendarEvents: CalendarEvent[]
): MergedEvent[] {
  const merged: MergedEvent[] = [];

  // Add time entries
  timeEntries.forEach((entry) => {
    merged.push({
      id: entry.id,
      type: 'time_entry',
      title: entry.activity_name,
      start_time: new Date(entry.start_time),
      end_time: new Date(new Date(entry.start_time).getTime() + entry.duration_minutes * 60 * 1000),
      duration_minutes: entry.duration_minutes,
      category: entry.category,
    });
  });

  // Add calendar events
  calendarEvents.forEach((event) => {
    merged.push({
      id: event.id,
      type: 'calendar_event',
      title: event.title,
      start_time: new Date(event.start_time),
      end_time: new Date(event.end_time),
      gcp_event_id: event.gcp_event_id,
    });
  });

  // Sort by start time
  return merged.sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
}

// Check if two events overlap
export function eventsOverlap(event1: MergedEvent, event2: MergedEvent): boolean {
  return event1.start_time < event2.end_time && event1.end_time > event2.start_time;
}

// Format date range for API (ISO 8601)
export function formatDateRange(startDate: Date, endDate: Date): { dateMin: string; dateMax: string } {
  return {
    dateMin: startDate.toISOString(),
    dateMax: endDate.toISOString(),
  };
}

// Get date range for preset options
export function getDateRangeForPreset(preset: 'today' | 'week' | Date): { start: Date; end: Date } {
  const now = new Date();

  if (preset === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Custom date
  const start = new Date(preset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(preset);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
