// @ts-nocheck
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { useChatPersistence } from '../hooks/useChatPersistence'
import { readActiveChatSessionId, writeActiveChatSessionId } from '../lib/chatSessionStorage'
import { AppHeader } from './AppHeader'
import { ChatInputBar } from './chat/ChatInputBar'
import { ChatWelcomePanel } from './chat/ChatWelcomePanel'
import { getDisplayName, writeRecentWelcomeTopicHint } from './chat/chatWelcome'
import './Chat.css'

const SIDEBAR_LS_KEY = 'chat-sidebar-open'
const CHAT_MODEL_LS_KEY = 'chat-model'

/** Balanced = current default (Opus); Fast = Haiku. IDs must match edge whitelist. */
const CHAT_MODEL_BY_TIER = {
  balanced: 'claude-opus-4-6',
  fast: 'claude-haiku-4-5-20251001',
}

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

/** Split coach plain text on blank lines for readable paragraphs in the UI. */
function assistantParagraphs(content) {
  if (content == null || !String(content).trim()) return []
  return String(content)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function AssistantMessageProse({ content, isStreaming }) {
  const paras = assistantParagraphs(content)
  if (paras.length === 0) {
    return isStreaming ? <span className="chat-stream-cursor" aria-hidden="true" /> : null
  }
  return paras.map((para, idx) => (
    <p key={idx}>
      {para}
      {isStreaming && idx === paras.length - 1 ? (
        <span className="chat-stream-cursor" aria-hidden="true" />
      ) : null}
    </p>
  ))
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
        d="M4 6.75A2.75 2.75 0 016.75 4h10.5A2.75 2.75 0 0120 6.75v6.5A2.75 2.75 0 0117.25 16H11l-3.9 3.25c-.8.67-1.95.1-1.95-.95V16h-.4A2.75 2.75 0 012 13.25v-6.5A2.75 2.75 0 014.75 4H5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 9.5h8M8 12.5h5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Chat({ views, currentView, onViewChange, user: userProp, onSignOut }) {
  const storeUser = useAuthStore((s) => s.user)
  const user = userProp ?? storeUser
  const { saveUserMessage } = useChatPersistence()

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
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState(null)
  const [modelTier, setModelTier] = useState('balanced')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const chatHistoryRef = useRef(null)
  const isStreamingRef = useRef(false)
  const searchFieldRef = useRef(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const applyNewSession = useCallback((data) => {
    setSessions((prev) => [data, ...prev])
    setSessionId(data.id)
    setMessages([])
    setError(null)
    if (user?.id) writeActiveChatSessionId(user.id, data.id)
  }, [user?.id])

  const insertChatSessionRow = useCallback(async () => {
    if (!user?.id) throw new Error('Not signed in')
    const { data, error: createError } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, created_at: new Date().toISOString() })
      .select()
      .single()
    if (createError) throw createError
    return data
  }, [user?.id])

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
    try {
      const raw = localStorage.getItem(CHAT_MODEL_LS_KEY)
      if (raw === 'fast' || raw === 'balanced') {
        setModelTier(raw)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_MODEL_LS_KEY, modelTier)
    } catch {
      /* ignore */
    }
  }, [modelTier])

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
    let cancelled = false

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
        if (cancelled) return

        const list = data || []
        setSessions(list)

        const stored = readActiveChatSessionId(user.id)
        const storedValid = stored && list.some((s) => s.id === stored)

        if (storedValid) {
          if (!cancelled) setSessionId(stored)
        } else {
          const row = await insertChatSessionRow()
          if (cancelled) return
          applyNewSession(row)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[chat] Failed to load sessions:', err)
          setError('Failed to load sessions')
        }
      } finally {
        if (!cancelled) setSessionLoading(false)
      }
    }

    loadSessions()
    return () => {
      cancelled = true
    }
  }, [user?.id, insertChatSessionRow, applyNewSession])

  useEffect(() => {
    const loadMessages = async () => {
      if (isStreamingRef.current) return
      if (!user?.id || !sessionId) {
        setMessages([])
        setHistoryLoading(false)
        return
      }

      setMessages([])
      setHistoryLoading(true)
      try {
        // #region agent log
        fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0547ca' },
          body: JSON.stringify({
            sessionId: '0547ca',
            location: 'Chat.jsx:loadMessages',
            message: 'chat_messages select start',
            data: {
              hypothesisId: 'H-A',
              selectColumns: 'id, role, content, created_at, thinking_summary',
              hasSession: Boolean(sessionId),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion
        let rows = []
        let fetchError = null

        const runSelect = (columns) =>
          supabase
            .from('chat_messages')
            .select(columns)
            .eq('user_id', user.id)
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })

        const firstAttempt = await runSelect('id, role, content, created_at, thinking_summary')
        rows = firstAttempt.data || []
        fetchError = firstAttempt.error

        const missingThinkingSummary =
          fetchError?.code === '42703' &&
          String(fetchError?.message || '').toLowerCase().includes('thinking_summary')

        if (missingThinkingSummary) {
          const fallbackAttempt = await runSelect('id, role, content, created_at')
          rows = fallbackAttempt.data || []
          fetchError = fallbackAttempt.error
        }

        if (fetchError) {
          // #region agent log
          fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0547ca' },
            body: JSON.stringify({
              sessionId: '0547ca',
              location: 'Chat.jsx:loadMessages',
              message: 'chat_messages select error',
              data: {
                hypothesisId: 'H-A',
                code: fetchError.code,
                message: fetchError.message,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {})
          // #endregion
          throw fetchError
        }

        // #region agent log
        fetch('http://127.0.0.1:7272/ingest/9a054363-0560-4f2a-a7fd-71d649a23059', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '0547ca' },
          body: JSON.stringify({
            sessionId: '0547ca',
            location: 'Chat.jsx:loadMessages',
            message: 'chat_messages select ok',
            data: {
              hypothesisId: 'H-B',
              rowCount: rows.length,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
        // #endregion

        setMessages(
          rows.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
            thinkingSummary: msg.thinking_summary ?? null,
            isStreaming: false,
          }))
        )
      } catch (err) {
        console.error('[chat] Failed to load messages:', err)
        setError('Failed to load messages')
      } finally {
        setHistoryLoading(false)
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

  const displayName = useMemo(() => getDisplayName(user), [user])
  const loadingSessions = sessionLoading
  const loadingMessages = historyLoading
  const showChatWelcome = !loadingSessions && !loadingMessages && messages.length === 0

  const handleSelectWelcomePrompt = useCallback((text: string) => {
    setInput(text)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

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
      const data = await insertChatSessionRow()
      applyNewSession(data)
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
    if (user?.id) writeActiveChatSessionId(user.id, sid)
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarOpen(false)
      setSearchOpen(false)
    }
  }

  const sendMessage = async (overrideText) => {
    const fromComposer = overrideText === undefined
    const text = (fromComposer ? input : String(overrideText)).trim()
    const composedText = text || (imagePreview ? '[Image attached]' : '')
    if (!composedText || !user || !sessionId) return

    writeRecentWelcomeTopicHint(composedText)

    if (fromComposer) setInput('')
    setComposerError(null)

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: composedText,
      created_at: new Date().toISOString(),
      isStreaming: false,
    }

    setMessages((prev) => [...prev, userMessage])
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
        thinkingSummary: null,
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
          model: CHAT_MODEL_BY_TIER[modelTier] ?? CHAT_MODEL_BY_TIER.balanced,
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
                // Tool names not shown in transcript
              } else if (event.type === 'text') {
                updateStreaming((m) => ({
                  ...m,
                  content: (m.content || '') + event.text,
                }))
              } else if (event.type === 'done') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId
                      ? {
                          ...m,
                          isStreaming: false,
                          thinking: '',
                          thinkingSummary: event.thinkingSummary ?? m.thinkingSummary ?? null,
                        }
                      : m
                  )
                )
                // Assistant row (including thinking_summary) is persisted by the chat edge function
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
      setImagePreview(null)
    }
  }

  const handleAttachClick = () => fileInputRef.current?.click()

  const handleImageFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setComposerError('Only image files are supported.')
      return
    }
    const nextPreview = URL.createObjectURL(file)
    setComposerError(null)
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return nextPreview
    })
    e.target.value = ''
  }

  const resetImage = () => {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const welcomeDisabled = !sessionId || loading || historyLoading || creatingSession

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
          <AppHeader
            views={views}
            currentView={currentView}
            onViewChange={onViewChange}
            onSignOut={onSignOut}
          />

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
                    <IconClose />
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
            <div className="chat-main-col flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-base">
              {error && (
                <div className="chat-inline-error" role="alert">
                  <span>{error}</span>
                  <button type="button" className="chat-inline-error-dismiss" onClick={() => setError(null)}>
                    Dismiss
                  </button>
                </div>
              )}

              <div className="chat-transcript-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6" ref={chatHistoryRef}>
                <div className="chat-transcript-inner mx-auto max-w-2xl">
                  {historyLoading && messages.length === 0 && (
                    <p className="chat-transcript-loading" role="status" aria-live="polite">
                      Loading messages…
                    </p>
                  )}
                  {!historyLoading && messages.length === 0 && !loading && (
                    showChatWelcome && (
                      <ChatWelcomePanel
                        displayName={displayName}
                        onSelectPrompt={handleSelectWelcomePrompt}
                        disabled={welcomeDisabled}
                        inputRef={textareaRef}
                      />
                    )
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
                          <div className="chat-message-body chat-prose">
                            {msg.thinkingSummary ? (
                              <p className="chat-thinking-summary">{msg.thinkingSummary}</p>
                            ) : null}
                            {msg.isStreaming && msg.thinking ? (
                              <div className="chat-thinking-live" aria-label="Coach reasoning">
                                <span className="chat-thinking-live-label">Thinking</span>
                                <div className="chat-thinking-live-body">{msg.thinking}</div>
                              </div>
                            ) : null}
                            <AssistantMessageProse content={msg.content} isStreaming={msg.isStreaming} />
                          </div>
                        </div>
                      ) : (
                        <div className={`chat-bubble chat-bubble--user user-message`}>
                          <div className="chat-message-body">{msg.content}</div>
                        </div>
                      )}
                    </div>
                  ))}
                  <span className="sr-only" aria-live="polite">
                    {loading ? 'Coach is replying.' : ''}
                  </span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
              <ChatInputBar
                input={input}
                onInputChange={setInput}
                onSendMessage={sendMessage}
                disabled={loading || historyLoading || creatingSession || !sessionId}
                placeholder="Ask Prohairesis about your time, priorities, or values..."
                currentModel={modelTier}
                onModelChange={setModelTier}
                imagePreview={imagePreview}
                onAttachClick={handleAttachClick}
                onImageRemove={resetImage}
                error={composerError}
                composerTextareaRef={textareaRef}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
