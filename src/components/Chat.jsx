import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import './Chat.css';

const Chat = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const chatHistoryRef = useRef(null);
  const [lastSendTime, setLastSendTime] = useState(0);

  const MIN_SEND_INTERVAL = 1000; // 1 second between sends

  // Load chat history from Supabase on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user) {
        setHistoryLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        setMessages(
          (data || []).map((msg) => ({
            id: msg.id,
            question: msg.question,
            response: msg.response,
            created_at: msg.created_at,
          }))
        );
      } catch (err) {
        console.error('Failed to load chat history:', err);
        setError('Failed to load chat history');
      } finally {
        setHistoryLoading(false);
      }
    };

    loadChatHistory();
  }, [user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, loading]);

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

    const userMessage = {
      id: Date.now().toString(),
      question: input,
      response: '', // Will be filled by API (Task 4.2)
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    setLastSendTime(now);

    try {
      // Get user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // Call backend API (Supabase Edge Function)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: userMessage.question,
          dateRange: { days: 30 }, // Default 30 days
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      // Update message with Claude's response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, response: data.response }
            : msg
        )
      );
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
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return <p className="chat-not-logged-in">Please log in to use chat.</p>;
  }

  return (
    <div className="chat-container">
      <div className="chat-history" ref={chatHistoryRef}>
        {historyLoading && <p className="chat-loading">Loading chat history...</p>}
        {!historyLoading && messages.length === 0 && (
          <p className="chat-empty">No messages yet. Ask a question to get started.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="chat-message">
            <div className="user-message">
              <strong>You:</strong> {msg.question}
            </div>
            {msg.response && (
              <div className="claude-message">
                <strong>Claude:</strong> {msg.response}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="loading-indicator">
            Claude is thinking...
          </div>
        )}
      </div>
      {error && (
        <div className="error-banner">
          Error: {error}
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
