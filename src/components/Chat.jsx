import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { useChatPersistence } from '../hooks/useChatPersistence'
import './Chat.css'

const SIDEBAR_LS_KEY = 'chat-sidebar-open'

function formatSessionMeta(createdAt) {
  const d = new Date(createdAt)
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function IconPlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconSessions() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9a3 3 0 116 0 3 3 0 01-6 0zM12 15a3 3 0 013 3v1H3v-1a3 3 0 013-3h6z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 7a2.5 2.5 0 114 2.2M17 13.5h.5a2.5 2.5 0 012.5 2.5V17h-3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconGear() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Chat({ views, currentView, onViewChange, user: userProp, onSignOut }) {
  const storeUser = useAuthStore((s) => s.user)
  const user = userProp ?? storeUser
  const { saveUserMessage, saveAssistantMessage } = useChatPersistence()

  const [layoutReady, setLayoutReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [creatingSession, setCreatingSession] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const chatHistoryRef = useRef(null)
  const isStreamingRef = useRef(false)
  const searchFieldRef = useRef(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_LS_KEY)
      if (raw !== null) {
        setSidebarOpen(JSON.parse(raw))
      } else {
        setSidebarOpen(typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)
      }
    } catch {
      setSidebarOpen(true)
    }
    setLayoutReady(true)
  }, [])

  useEffect(() => {
    if (!layoutReady) return
    try {
      localStorage.setItem(SIDEBAR_LS_KEY, JSON.stringify(sidebarOpen))
    } catch {
      /* ignore */
    }
  }, [sidebarOpen, layoutReady])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!searchOpen) return
    const id = requestAnimationFrame(() => searchFieldRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [searchOpen])

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
          .limit(40)

        if (fetchError) throw fetchError

        setSessions(data || [])
        if (data && data.length > 0) {
          setSessionId((prev) => {
            if (prev && data.some((s) => s.id === prev)) return prev
            return data[0].id
          })
        }
      } catch (err) {
        console.error('[chat] Failed to load sessions:', err)
        setError('Failed to load sessions')
      } finally {
        setSessionLoading(false)
      }
    }

    loadSessions()
  }, [user?.id])

  useEffect(() => {
    const loadMessages = async () => {
      if (isStreamingRef.current) return
      if (!user?.id || !sessionId) {
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
  }, [user?.id, sessionId])

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
    }
  }, [messages, loading])

  const filteredSessions = useMemo(() => {
    if (!debouncedSearch) return sessions
    const q = debouncedSearch.toLowerCase()
    return sessions.filter((s) => (s.title || 'Untitled').toLowerCase().includes(q))
  }, [sessions, debouncedSearch])

  const openSearch = useCallback(() => {
    setSidebarOpen(false)
    setSearchOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchInput('')
    setDebouncedSearch('')
  }, [])

  const toggleSessions = useCallback(() => {
    if (searchOpen) closeSearch()
    setSidebarOpen((o) => !o)
  }, [searchOpen, closeSearch])

  const createNewSession = async () => {
    if (!user || creatingSession) return
    setCreatingSession(true)
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
      if (window.matchMedia('(max-width: 767px)').matches) {
        setSidebarOpen(false)
      }
    } catch (err) {
      console.error('[chat] Failed to create session:', err)
      setError('Failed to create new chat')
    } finally {
      setCreatingSession(false)
    }
  }

  const switchSession = (sid) => {
    setSessionId(sid)
    setError(null)
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false)
      setSearchOpen(false)
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
      await saveUserMessage(user.id, sessionId, userMessage.content)
    } catch (err) {
      console.error('[chat] Failed to persist user message:', err)
      setError('Failed to save your message. Please try again.')
      setLoading(false)
      return
    }

    let streamingId = null

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('App misconfigured: missing Supabase URL or anon key')
      }

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

      setMessages((prev) => [...prev, placeholder])

      const updateStreaming = (updater) => {
        setMessages((prev) => prev.map((m) => (m.id === streamingId ? updater(m) : m)))
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
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
        isStreamingRef.current = true
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
                setMessages((prev) => {
                  const updatedMessages = prev.map((m) =>
                    m.id === streamingId ? { ...m, isStreaming: false } : m
                  )
                  const completedMessage = updatedMessages.find((m) => m.id === streamingId)
                  if (completedMessage) {
                    saveAssistantMessage(user.id, sessionId, completedMessage.content).catch((err) => {
                      console.error('[chat] Failed to persist assistant message:', err)
                      setError('Message sent but failed to save. Check your connection.')
                    })
                  }
                  return updatedMessages
                })
              } else if (event.type === 'error') {
                setError(event.message || 'Stream error')
              }
            } catch (parseErr) {
              console.error('[chat] Failed to parse SSE event:', parseErr)
            }
          }
        }
      } else {
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
      if (streamingId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== streamingId))
      }
    } finally {
      isStreamingRef.current = false
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!user) {
    return <p className="chat-not-logged-in">Please log in to use chat.</p>
  }

  if (!layoutReady) {
    return null
  }

  if (sessionLoading) {
    return (
      <div className="chat-viewport chat-container">
        <p className="chat-loading">Loading chats…</p>
      </div>
    )
  }

  const showSessionsPanel = sidebarOpen && !searchOpen
  const showSearchPanel = searchOpen

  const sessionListContent = (onPick) => (
    <>
      <div className="chat-panel-header">
        <span className="chat-panel-label">Account</span>
      </div>
      <div className="chat-panel-actions">
        <button
          type="button"
          className="chat-panel-new-chat session-new-btn"
          onClick={createNewSession}
          disabled={creatingSession}
        >
          {creatingSession ? 'Starting…' : 'New chat'}
        </button>
      </div>
      <div className="chat-panel-list" role="list">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            role="listitem"
            className={`chat-session-row session-chip${sessionId === session.id ? ' chat-session-row--active active' : ''}`}
            onClick={() => onPick(session.id)}
          >
            <span className="chat-session-row-title">
              {session.title ? session.title.substring(0, 48) : 'Untitled'}
            </span>
            <span className="chat-session-row-meta">{formatSessionMeta(session.created_at)}</span>
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div className="chat-viewport chat-container">
      <h1 className="sr-only">Chat</h1>
      <main className="chat-main" role="main">
        <div className="chat-layout">
          {/* Row 1 — primary nav */}
          <header className="chat-nav-band">
            <div className="chat-nav-inner">
              <nav className="chat-nav-links" aria-label="Primary navigation">
                <button
                  type="button"
                  className={`chat-nav-link${currentView === views.chat ? ' chat-nav-link--active' : ''}`}
                  onClick={() => onViewChange(views.chat)}
                  aria-current={currentView === views.chat ? 'page' : undefined}
                >
                  Chat
                </button>
                <button
                  type="button"
                  className={`chat-nav-link${currentView === views.logJournal ? ' chat-nav-link--active' : ''}`}
                  onClick={() => onViewChange(views.logJournal)}
                  aria-current={currentView === views.logJournal ? 'page' : undefined}
                >
                  Log
                </button>
                <button
                  type="button"
                  className={`chat-nav-link${currentView === views.timeline ? ' chat-nav-link--active' : ''}`}
                  onClick={() => onViewChange(views.timeline)}
                  aria-current={currentView === views.timeline ? 'page' : undefined}
                >
                  Timeline
                </button>
              </nav>
              <div className="chat-nav-right">
                <span className="chat-nav-email" title={user.email}>
                  {user.email}
                </span>
                <details className="chat-nav-account">
                  <summary className="chat-nav-icon-btn" aria-label="Account menu">
                    <IconGear />
                  </summary>
                  <div className="chat-nav-account-panel">
                    <button type="button" className="chat-nav-account-action" onClick={() => onSignOut?.()}>
                      Sign out
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </header>

          {/* Row 2 — rail + optional panels + main */}
          <div className="chat-row2">
            {showSessionsPanel && (
              <button
                type="button"
                className="chat-sidebar-backdrop"
                aria-label="Close sessions"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            {showSearchPanel && (
              <button
                type="button"
                className="chat-search-backdrop"
                aria-label="Close search"
                onClick={closeSearch}
              />
            )}

            <aside className="chat-rail" aria-label="Chat tools">
              <button
                type="button"
                className="chat-rail-btn session-new-btn"
                onClick={createNewSession}
                disabled={creatingSession}
                aria-label="New chat"
                title="New chat"
              >
                <IconPlus />
              </button>
              <button
                type="button"
                className="chat-rail-btn"
                onClick={openSearch}
                aria-label="Search conversations"
                title="Search conversations"
              >
                <IconSearch />
              </button>
              <button
                type="button"
                className={`chat-rail-btn${sidebarOpen && !searchOpen ? ' chat-rail-btn--active' : ''}`}
                onClick={toggleSessions}
                aria-label="Sessions"
                title="Sessions"
                aria-pressed={sidebarOpen && !searchOpen}
              >
                <IconSessions />
              </button>
            </aside>

            {/* Sessions column / sheet */}
            {showSessionsPanel && (
              <aside className="chat-sidebar" aria-label="Conversations">
                {sessionListContent(switchSession)}
              </aside>
            )}

            {/* Search column / sheet */}
            {showSearchPanel && (
              <aside className="chat-search-panel" aria-label="Search conversations">
                <div className="chat-search-header">
                  <div className="chat-search-field-wrap">
                    <span className="chat-search-icon" aria-hidden="true">
                      <IconSearch />
                    </span>
                    <input
                      ref={searchFieldRef}
                      type="search"
                      className="chat-search-field"
                      placeholder="Search conversations…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <button type="button" className="chat-search-close" onClick={closeSearch} aria-label="Close search">
                    ✕
                  </button>
                </div>
                <div className="chat-search-body">
                  {!debouncedSearch && (
                    <p className="chat-search-empty">Start typing to filter conversations.</p>
                  )}
                  {debouncedSearch && filteredSessions.length === 0 && (
                    <p className="chat-search-empty">No conversations found.</p>
                  )}
                  {debouncedSearch && filteredSessions.length > 0 && (
                    <div className="chat-search-results" role="list">
                      {filteredSessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          role="listitem"
                          className="chat-search-result-row"
                          onClick={() => {
                            switchSession(session.id)
                            closeSearch()
                          }}
                        >
                          <span className="chat-search-result-title">
                            {session.title || 'Untitled'}
                          </span>
                          <span className="chat-search-result-preview">
                            {formatSessionMeta(session.created_at)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* Transcript + composer */}
            <div className="chat-main-col">
              {error && (
                <div className="chat-inline-error" role="alert">
                  <span>{error}</span>
                  <button type="button" className="chat-inline-error-dismiss" onClick={() => setError(null)}>
                    Dismiss
                  </button>
                </div>
              )}

              <div className="chat-transcript-scroll" ref={chatHistoryRef}>
                <div className="chat-transcript-inner">
                  {messages.length === 0 && !loading && (
                    <p className="chat-empty">No messages yet. Ask about your time or your day.</p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`chat-message chat-message--${msg.role}${
                        msg.isStreaming ? ' chat-message--streaming' : ''
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className={`chat-bubble chat-bubble--assistant claude-message`}>
                          {msg.thinking && (
                            <div className="chat-thinking">
                              <em>Thinking: {msg.thinking}</em>
                            </div>
                          )}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="chat-tools">
                              {msg.toolCalls.map((tc, idx) => (
                                <div key={idx} className="chat-tool-line">
                                  {tc.tool}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="chat-message-body chat-prose">
                            {msg.content}
                            {msg.isStreaming && <span className="chat-stream-cursor" aria-hidden="true" />}
                          </div>
                        </div>
                      ) : (
                        <div className={`chat-bubble chat-bubble--user user-message`}>
                          <div className="chat-message-body">{msg.content}</div>
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && <div className="chat-loading-inline">Coach is thinking…</div>}
                </div>
              </div>

              <div className="chat-composer-wrap">
                <div className="chat-composer-inner">
                  <form className="chat-composer-form" onSubmit={(e) => { e.preventDefault(); handleSend() }}>
                    <div className="chat-composer-box">
                      <textarea
                        className="chat-composer-input chat-input"
                        placeholder="Ask about your time…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        name="message"
                        rows={1}
                        autoComplete="off"
                      />
                      <span className="chat-model-pill" aria-hidden="true">
                        Coach
                      </span>
                      <button
                        type="submit"
                        className="chat-composer-send chat-send-button"
                        disabled={loading || !input.trim()}
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
