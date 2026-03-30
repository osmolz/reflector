export interface CalendarEvent {
  id: string;
  gcp_event_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  calendar_id?: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface SyncCalendarRequest {
  dateMin: string;
  dateMax: string;
}

export interface SyncCalendarResponse {
  success: boolean;
  synced_count: number;
  message: string;
  error?: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  start_time: string;
  end_time: string;
  time_entry_id?: string;
}

export interface CreateCalendarEventResponse {
  success: boolean;
  event_id: string;
  message: string;
  error?: string;
}
