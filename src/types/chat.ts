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
