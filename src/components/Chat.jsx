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

    // [1] Add user message
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    /** Set only after placeholder is created — catch must not reference before assignment */
    let streamingId = null

    try {
      const { data: refreshData } = await supabase.auth.refreshSession()
      let session = refreshData.session
      if (!session?.access_token) {
        const { data: existing } = await supabase.auth.getSession()
        session = existing.session
      }
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('App misconfigured: missing Supabase URL or anon key')
      }

      // [2] Create placeholder with unique ID for streaming
      streamingId = new Date(Date.now() + 1).toISOString()
      const placeholder = {
        id: streamingId,
        role: 'assistant',
        content: '',
        created_at: streamingId,
        thinking: '',
        toolCalls: [],
        isStreaming: true,
      }

      // Add placeholder to messages
      setMessages((prev) => [...prev, placeholder])

      // [3] Define updater that targets ONLY this message
      const updateStreaming = (updater) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === streamingId ? updater(m) : m))
        )
      }

      // [4] Fetch with SSE
      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
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

      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('text/event-stream')) {
        // [5] Parse SSE stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue

            try {
              const event = JSON.parse(line.slice(6))

              // [6] Update placeholder (NOT append)
              if (event.type === 'thinking') {
                updateStreaming((m) => ({
                  ...m,
                  thinking: (m.thinking || '') + event.text,
                }))
              } else if (event.type === 'tool_use') {
                updateStreaming((m) => ({
                  ...m,
                  toolCalls: [...(m.toolCalls || []), { tool: event.tool }],
                }))
              } else if (event.type === 'text') {
                updateStreaming((m) => ({
                  ...m,
                  content: (m.content || '') + event.text,
                }))
              } else if (event.type === 'done') {
                updateStreaming((m) => ({ ...m, isStreaming: false }))
              } else if (event.type === 'error') {
                setError(event.message || 'Stream error')
              }
            } catch (parseErr) {
              console.error('[chat] Failed to parse SSE event:', parseErr)
            }
          }
        }
      } else {
        // Fallback for fast-path JSON response
        const data = await response.json()
        if (data.type === 'fast_path' && data.result.status === 'ok') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? {
                    ...m,
                    content: JSON.stringify(data.result.data || data.result.message),
                    isStreaming: false,
                  }
                : m
            )
          )
        }
      }
    } catch (err) {
      let errorMsg = 'Unknown error'
      if (err instanceof Error) {
        if (err.message.includes('Unauthorized')) {
          errorMsg = 'Session expired. Please log in again.'
        } else if (err.message.includes('Failed to get response')) {
          errorMsg = 'The coach took too long to respond. Try again.'
        } else if (err.message.includes('fetch')) {
          errorMsg = 'Network error. Check your connection.'
        } else {
          errorMsg = err.message
        }
      }
      setError(errorMsg)
      // Remove the placeholder on error (only if we added one)
      if (streamingId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== streamingId))
      }
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
              <strong>{msg.role === 'user' ? 'You' : 'Coach'}:</strong>
              {msg.thinking && (
                <div className="message-thinking">
                  <em>Thinking: {msg.thinking}</em>
                </div>
              )}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="message-tools">
                  {msg.toolCalls.map((tc, idx) => (
                    <span key={idx} className="tool-badge">
                      {tc.tool}
                    </span>
                  ))}
                </div>
              )}
              <div>{msg.content}</div>
              {msg.isStreaming && <span className="streaming-indicator">●</span>}
            </div>
          </div>
        ))}
        {loading && <div className="loading-indicator">Coach is thinking...</div>}
      </div>

      {error && (
        <div className="error-banner">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)} className="error-dismiss">
            ✕
          </button>
        </div>
      )}

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
