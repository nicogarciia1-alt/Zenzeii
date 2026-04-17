import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://zenzeii-production.up.railway.app/api';

const ZenzeiiChat = ({ bookTitle, currentSentence, isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Good day. I am Zenzeii, your literary companion. Ask me anything about the text you are reading.',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Inject EB Garamond font once
  useEffect(() => {
    if (!document.getElementById('eb-garamond-font')) {
      const link = document.createElement('link');
      link.id = 'eb-garamond-font';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || thinking) return;

    // messages in this closure is the state before the new user message
    const historyToSend = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setThinking(true);

    try {
      const res = await axios.post(`${API_BASE}/ai/chat`, {
        message,
        book_title: bookTitle || '',
        current_sentence: currentSentence || '',
        chat_history: historyToSend,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      const errMsg =
        err.response?.status === 503
          ? 'AI chat is not configured on this server.'
          : 'I encountered a difficulty. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const isMobile = window.innerWidth <= 768;

  const panelStyle = isMobile ? {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'hsl(var(--background))',
    fontFamily: '"EB Garamond", Georgia, serif',
    overflow: 'hidden',
    transform: 'translateX(0)',
    transition: 'transform 0.3s ease',
  } : {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    width: '360px',
    height: '480px',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    fontFamily: '"EB Garamond", Georgia, serif',
    overflow: 'hidden',
  };

  const garamond = '"EB Garamond", Georgia, serif';

  return (
    <div style={panelStyle} onClick={(e) => e.stopPropagation()}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid hsl(var(--border))',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: garamond,
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'hsl(var(--foreground))',
          letterSpacing: '0.06em',
        }}>
          Zenzeii 文
        </span>
        <button
          onClick={onClose}
          aria-label="Close chat"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))',
            fontSize: '1rem',
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '82%',
              padding: '8px 12px',
              borderRadius: msg.role === 'user'
                ? '12px 12px 2px 12px'
                : '12px 12px 12px 2px',
              backgroundColor: msg.role === 'user'
                ? 'hsl(var(--primary))'
                : 'hsl(var(--muted))',
              color: msg.role === 'user'
                ? 'hsl(var(--primary-foreground))'
                : 'hsl(var(--foreground))',
              fontSize: '0.9rem',
              lineHeight: 1.55,
              fontFamily: garamond,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: '12px 12px 12px 2px',
              backgroundColor: 'hsl(var(--muted))',
              color: 'hsl(var(--muted-foreground))',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              fontFamily: garamond,
            }}>
              Zenzeii is thinking…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid hsl(var(--border))',
        padding: '12px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'flex',
        gap: '8px',
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Zenzeii…"
          disabled={thinking}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            fontFamily: garamond,
            fontSize: '16px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={thinking || !input.trim()}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            fontFamily: garamond,
            fontSize: '0.9rem',
            cursor: thinking || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: thinking || !input.trim() ? 0.55 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          Send
        </button>
      </div>

    </div>
  );
};

export default ZenzeiiChat;
