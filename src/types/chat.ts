export interface ChatMessage {
  id: string;
  question: string;
  response: string;
  created_at: string;
}

export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

export interface TimeEntry {
  id: string;
  user_id?: string;
  activity_name: string;
  duration_minutes: number;
  category: string;
  start_time: string;
  check_in_id?: string | null;
  created_at: string;
  updated_at: string;
}
