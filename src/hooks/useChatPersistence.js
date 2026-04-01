import { supabase } from '../lib/supabase'

export function useChatPersistence() {
  const saveUserMessage = async (userId, sessionId, content) => {
    if (userId == null || sessionId == null || content == null) {
      throw new Error('Missing required parameters: userId, sessionId, content')
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role: 'user',
          content: content,
          created_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (err) {
      console.error('[persistence] Failed to save user message:', err)
      throw err
    }
  }

  const saveAssistantMessage = async (userId, sessionId, content, thinkingSummary = null) => {
    if (userId == null || sessionId == null || content == null) {
      throw new Error('Missing required parameters: userId, sessionId, content')
    }

    try {
      const row = {
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: content,
        created_at: new Date().toISOString(),
      }
      if (thinkingSummary && String(thinkingSummary).trim()) {
        row.thinking_summary = String(thinkingSummary).trim()
      }
      const { error } = await supabase.from('chat_messages').insert(row)

      if (error) throw error
    } catch (err) {
      console.error('[persistence] Failed to save assistant message:', err)
      throw err
    }
  }

  return {
    saveUserMessage,
    saveAssistantMessage,
  }
}
