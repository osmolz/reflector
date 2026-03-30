import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import './Chat.css'

const Chat = () => {
  const { user } = useAuthStore()

  // Session state
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  // Message state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const chatHistoryRef = useRef(null)

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!user) {
        setSessionLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (fetchError) throw fetchError

        setSessions(data || [])

        // Set active session to most recent
        if (data && data.length > 0) {
          setSessionId(data[0].id)
        }
      } catch (err) {
        console.error('[chat] Failed to load sessions:', err)
        setError('Failed to load sessions')
      } finally {
        setSessionLoading(false)
      }
    }

    loadSessions()
  }, [user])

  // Load messages when session changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!user || !sessionId) {
        setMessages([])
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError

        setMessages(
          (data || []).map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
            isStreaming: false,
          }))
        )
      } catch (err) {
        console.error('[chat] Failed to load messages:', err)
        setError('Failed to load messages')
      }
    }

    loadMessages()
  }, [user, sessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
    }
  }, [messages, loading])

  const createNewSession = async () => {
    if (!user) return

    try {
      const { data, error: createError } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, created_at: new Date().toISOString() })
        .select()
        .single()

      if (createError) throw createError

      setSessions((prev) => [data, ...prev])
      setSessionId(data.id)
      setMessages([])
      setError(null)
    } catch (err) {
      console.error('[chat] Failed to create session:', err)
      setError('Failed to create new chat')
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !user || !sessionId) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
      isStreaming: false,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.session) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()

      if (data.type === 'fast_path') {
        // Fast-path response
        const assistantMessage = {
          id: 'msg-' + Date.now(),
          role: 'assistant',
          content: JSON.stringify(data.result.data || data.result.message),
          created_at: new Date().toISOString(),
          isStreaming: false,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        // Full loop response (will be handled in Part 2)
        console.log('Full loop response:', data)
      }
    } catch (err) {
      let errorMsg = 'Unknown error'
      if (err instanceof Error) {
        errorMsg = err.message
      }
      setError(errorMsg)
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const switchSession = (sid) => {
    setSessionId(sid)
    setError(null)
  }

  if (!user) {
    return <p className="chat-not-logged-in">Please log in to use chat.</p>
  }

  if (sessionLoading) {
    return <p className="chat-loading">Loading chats...</p>
  }

  return (
    <div className="chat-container">
      <div className="session-strip">
        <button className="session-new-btn" onClick={createNewSession} title="Start a new conversation">
          + New
        </button>
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={session.id}
              className={`session-chip ${sessionId === session.id ? 'active' : ''}`}
              onClick={() => switchSession(session.id)}
              title={session.title || 'New Chat'}
            >
              {session.title ? session.title.substring(0, 30) : 'New Chat'}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-history" ref={chatHistoryRef}>
        {messages.length === 0 && !loading && (
          <p className="chat-empty">No messages yet. Ask a question to get started.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className={msg.role === 'user' ? 'user-message' : 'claude-message'}>
              <strong>{msg.role === 'user' ? 'You' : 'Coach'}:</strong> {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="loading-indicator">Coach is thinking...</div>}
      </div>

      {error && <div className="error-banner">Error: {error}</div>}

      <div className="chat-input-container">
        <input
          type="text"
          placeholder="Ask about your time..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="chat-input"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="chat-send-button">
          Send
        </button>
      </div>
    </div>
  )
}

export default Chat
