import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import './Chat.css';

const Chat = () => {
  const { user } = useAuthStore();

  // Session state
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Message state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatHistoryRef = useRef(null);
  const [lastSendTime, setLastSendTime] = useState(0);

  const MIN_SEND_INTERVAL = 1000; // 1 second between sends

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!user) {
        setSessionLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;

        setSessions(data || []);

        // Set active session to most recent, or null if none exist
        if (data && data.length > 0) {
          setSessionId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
        setError('Failed to load sessions');
      } finally {
        setSessionLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  // Load messages when session changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!user || !sessionId) {
        setMessages([]);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select('id, role, content, question, response, created_at')
          .eq('user_id', user.id)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        // Convert to unified message format
        const formattedMessages = (data || []).map((msg) => ({
          id: msg.id,
          role: msg.role || (msg.question ? 'user' : 'assistant'),
          content: msg.content || msg.question || msg.response || '',
          created_at: msg.created_at,
        }));

        setMessages(formattedMessages);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load messages');
      }
    };

    loadMessages();
  }, [user, sessionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Create a new session
  const createNewSession = async () => {
    try {
      const { data, error: createError } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) throw createError;

      setSessions((prev) => [data, ...prev]);
      setSessionId(data.id);
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create new chat');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user) {
      return;
    }

    // Validate input length
    if (input.length > 500) {
      setError('Question is too long (max 500 characters)');
      return;
    }

    const now = Date.now();
    if (now - lastSendTime < MIN_SEND_INTERVAL) {
      setError('Please wait before sending another message');
      return;
    }

    // If no session, create one first
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const { data, error: createError } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;

        setSessions((prev) => [data, ...prev]);
        activeSessionId = data.id;
        setSessionId(data.id);
      } catch (err) {
        console.error('Failed to create session:', err);
        setError('Failed to create new chat');
        return;
      }
    }

    // Optimistically add user message to state
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    setLastSendTime(now);

    // Optimistically update session title with first 60 chars of question
    // This avoids race condition where DB update hasn't replicated yet
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, title: input.substring(0, 60) }
          : s
      )
    );

    try {
      // Get user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: userMessage.content,
          sessionId: activeSessionId,
          dateRange: { days: 30 },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Handle streaming response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        await handleStreamingResponse(userMessage, response);
      } else {
        const data = await response.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, role: 'assistant', content: data.response }
              : msg
          )
        );
      }
    } catch (err) {
      let errorMsg = 'Unknown error';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMsg = 'Request timed out. Please try again.';
        } else if (err.message === 'Not authenticated') {
          errorMsg = 'Please log in to use chat.';
        } else if (err.message.includes('No time entries')) {
          errorMsg = 'No time entries found for this period. Start logging activities to enable analytics.';
        } else if (err.message.includes('rate limit')) {
          errorMsg = 'API rate limit exceeded. Please wait a moment and try again.';
        } else if (err.message.includes('API')) {
          errorMsg = 'Claude API is temporarily unavailable. Please try again later.';
        } else {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
      // Remove the pending message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== userMessage.id)
      );
    } finally {
      setLoading(false);
      // DON'T reload sessions here - it overwrites the optimistic title update!
      // The edge function will update the DB title, but by the time reloadSessions runs,
      // there may be replication lag. Instead we keep the optimistic update we already made.

      // Reload messages to verify persistence (confirms DB save completed)
      // Use activeSessionId to ensure we reload messages for the session that received the message
      // (not the session the user may have switched to during send)
      if (activeSessionId) {
        const { data } = await supabase
          .from('chat_messages')
          .select('id, role, content, question, response, created_at')
          .eq('user_id', user.id)
          .eq('session_id', activeSessionId)
          .order('created_at', { ascending: true });

        if (data) {
          setMessages(
            data.map((msg) => ({
              id: msg.id,
              role: msg.role || (msg.question ? 'user' : 'assistant'),
              content: msg.content || msg.question || msg.response || '',
              created_at: msg.created_at,
            }))
          );
        }
      }
    }
  };

  const handleStreamingResponse = async (userMessage, response) => {
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));

              // Handle content_block_delta events (streaming text)
              if (eventData.type === 'content_block_delta' && eventData.delta?.type === 'text_delta') {
                const text = eventData.delta.text;
                accumulatedText += text;

                // Force synchronous update to prevent React batching (allows true character-by-character streaming)
                flushSync(() => {
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id.startsWith('streaming-')) {
                      // Update existing streaming message
                      return prev.map((msg, idx) =>
                        idx === prev.length - 1
                          ? { ...msg, content: accumulatedText }
                          : msg
                      );
                    } else {
                      // Add new assistant message
                      return [
                        ...prev,
                        {
                          id: 'streaming-' + Date.now(),
                          role: 'assistant',
                          content: accumulatedText,
                          created_at: new Date().toISOString(),
                        },
                      ];
                    }
                  });
                });

                // Force browser to render before processing next event
                // Prevents multiple events from being batched and appearing all at once
                // Use 5ms to ensure browser has time to actually paint between events
                await new Promise((resolve) => setTimeout(resolve, 5));
              }

              // Handle message_stop (stream complete)
              if (eventData.type === 'message_stop') {
                break;
              }
            } catch (parseErr) {
              // Silently skip unparseable events
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const switchSession = (sid) => {
    setSessionId(sid);
    setError(null);
  };

  const getSessionTitle = (session) => {
    if (!session.title) {
      return 'New Chat';
    }
    // Truncate title if too long
    return session.title.length > 30 ? session.title.substring(0, 30) + '…' : session.title;
  };

  // Reload sessions (useful after sending message to refresh titles)
  const reloadSessions = async () => {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to reload sessions:', err);
    }
  };

  if (!user) {
    return <p className="chat-not-logged-in">Please log in to use chat.</p>;
  }

  if (sessionLoading) {
    return <p className="chat-loading">Loading chats...</p>;
  }

  return (
    <div className="chat-container">
      {/* Session strip */}
      <div className="session-strip">
        <button
          className="session-new-btn"
          onClick={createNewSession}
          title="Start a new conversation"
        >
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
              {getSessionTitle(session)}
            </button>
          ))}
        </div>
      </div>

      {/* Chat history */}
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.length === 0 && !loading && (
          <p className="chat-empty">No messages yet. Ask a question to get started.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className={msg.role === 'user' ? 'user-message' : 'claude-message'}>
              {msg.role === 'user' ? (
                <>
                  <strong>You:</strong> {msg.content}
                </>
              ) : (
                <>
                  <strong>Claude:</strong> {msg.content}
                </>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="loading-indicator">
            Claude is thinking...
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          Error: {error}
        </div>
      )}

      {/* Input section */}
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
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="chat-send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
