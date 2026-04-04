export interface UserMemory {
  goals?: Array<{ goal: string; hours_per_week: number; priority: string; saved_at: string }>
  preferences?: Array<{ preference: string; saved_at: string }>
  facts?: Array<{ fact: string; context: string; saved_at: string }>
  updated_at?: string
}

export interface TimeEntry {
  id: string
  user_id: string
  activity_name: string
  category: string
  duration_minutes: number
  start_time: string
  created_at: string
}

/** Same shape as Log / parse API activities; used for timeline commit tool input. */
export interface ParsedTimelineActivity {
  activity: string
  duration_minutes: number
  start_time_inferred: string
  category?: string
  notes?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface SSEEvent {
  type:
    | 'status'
    | 'thinking'
    | 'tool_use'
    | 'text'
    | 'done'
    | 'error'
    | 'timeline_preview_pending'
  status?: 'thinking'
  text?: string
  tool?: string
  message?: string
  /** Present on `done` when extended thinking produced a one-line summary */
  thinkingSummary?: string
  /** Source excerpt passed to preview (when `type` is `timeline_preview_pending`) */
  source_text?: string
  /** Parsed activities for the in-app Save UI (when `type` is `timeline_preview_pending`) */
  activities?: ParsedTimelineActivity[]
}

export interface IntentMatch {
  handler: string
  params?: Record<string, unknown>
}

export interface ToolResult {
  status: 'ok' | 'no_data' | 'error'
  data?: unknown
  message?: string
}
