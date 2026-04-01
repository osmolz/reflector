import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'
import type { UserMemory, ChatMessage } from './types.ts'

const CONTEXT_WINDOW_SIZE = 20

export async function loadConversationContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string | null,
): Promise<{ messages: ChatMessage[]; userMemory: UserMemory | null }> {
  // Load last 20 messages (DESC), reverse to chronological
  let query = supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(CONTEXT_WINDOW_SIZE)

  if (sessionId) {
    query = query.eq('session_id', sessionId)
  }

  const { data: recentMessages } = await query

  // Load user memory
  const { data: userMemory } = await supabase
    .from('user_memory')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // Reverse DESC query to chronological order
  const messages: ChatMessage[] = (recentMessages ?? [])
    .reverse()
    .map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  return {
    messages,
    userMemory: userMemory as UserMemory | null,
  }
}

export async function saveMessage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  sessionId: string | null,
  thinkingSummary?: string | null,
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    role,
    content,
    created_at: new Date().toISOString(),
  }

  if (sessionId) {
    row.session_id = sessionId
  }

  if (role === 'assistant' && thinkingSummary && thinkingSummary.trim()) {
    row.thinking_summary = thinkingSummary.trim()
  }

  const { error } = await supabase.from('chat_messages').insert(row)

  if (error) {
    console.error('[chat] Failed to save message:', error.message)
    // NOT thrown — fire-and-forget pattern
  }
}

function truncateUtf8(str: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(str)
  if (encoded.length <= maxBytes) return str
  return new TextDecoder().decode(encoded.slice(0, maxBytes - 1)) + '…'
}

export async function maybeSetSessionTitle(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  firstMessage: string,
): Promise<void> {
  const title = truncateUtf8(firstMessage, 60)

  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId)
    .is('title', null) // Only set if currently null

  if (error) {
    console.error('[chat] Failed to set session title:', error.message)
  }
}

export async function createSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, created_at: new Date().toISOString() })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

export async function updateUserMemory(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  memoryType: 'goal' | 'preference' | 'fact',
  content: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('user_memory')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const memory = existing || { user_id: userId, goals: [], preferences: [], facts: [] }

  const entry = {
    [memoryType === 'goal' ? 'goal' : memoryType === 'preference' ? 'preference' : 'fact']: content,
    saved_at: new Date().toISOString(),
  }

  if (memoryType === 'goal') {
    memory.goals = [...(memory.goals ?? []), entry]
  } else if (memoryType === 'preference') {
    memory.preferences = [...(memory.preferences ?? []), entry]
  } else {
    memory.facts = [...(memory.facts ?? []), entry]
  }

  memory.updated_at = new Date().toISOString()

  const { error } = await supabase.from('user_memory').upsert(memory)

  if (error) {
    console.error('[chat] Failed to update user memory:', error.message)
  }
}
