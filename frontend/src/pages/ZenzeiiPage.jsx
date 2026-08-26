import React, { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useZenzeiiChat } from '@/hooks/useZenzeiiChat';
import { getAiUsage } from '@/lib/api';

const garamond = '"EB Garamond", Georgia, serif';

export default function ZenzeiiPage() {
  const [aiUsage, setAiUsage] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleAiUsed = () => {
    setAiUsage((prev) => prev && prev.ai_messages_remaining !== null ? {
      ...prev,
      ai_messages_today: prev.ai_messages_today + 1,
      ai_messages_remaining: Math.max(0, prev.ai_messages_remaining - 1),
    } : prev);
  };

  const handleAiLimitReached = () => {
    setAiUsage((prev) => prev ? { ...prev, ai_messages_remaining: 0 } : prev);
  };

  const { messages, input, setInput, thinking, handleSend, handleKeyDown, limitReached } = useZenzeiiChat({
    onAiUsed: handleAiUsed,
    onAiLimitReached: handleAiLimitReached,
  });

  useEffect(() => {
    getAiUsage().then((res) => setAiUsage(res.data)).catch(() => {});
  }, []);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showLowRemainingHint =
    aiUsage?.subscription_tier === 'free' &&
    typeof aiUsage?.ai_messages_remaining === 'number' &&
    aiUsage.ai_messages_remaining > 0 &&
    aiUsage.ai_messages_remaining <= 2;

  return (
    <div className="bg-background" style={{ minHeight: '100vh' }}>
      <Navbar />

      <div
        className="flex flex-col mx-auto"
        style={{ height: 'calc(100vh - 4rem)', maxWidth: '820px' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid hsl(var(--border))',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: garamond,
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'hsl(var(--foreground))',
            letterSpacing: '0.06em',
          }}>
            Zenzeii 文
          </span>
          {showLowRemainingHint && (
            <span style={{
              fontFamily: garamond,
              fontSize: '0.8rem',
              color: 'hsl(var(--muted-foreground))',
            }}>
              {aiUsage.ai_messages_remaining} {aiUsage.ai_messages_remaining === 1 ? 'message' : 'messages'} left today
            </span>
          )}
        </div>

        {/* Messages */}
        <div
          className="flex-1"
          style={{
            overflowY: 'auto',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '75%',
                padding: '10px 16px',
                borderRadius: msg.role === 'user'
                  ? '14px 14px 2px 14px'
                  : '14px 14px 14px 2px',
                backgroundColor: msg.role === 'user'
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted))',
                color: msg.role === 'user'
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--foreground))',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                fontFamily: garamond,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
                {msg.isLimit && (
                  <a
                    href="/upgrade"
                    style={{
                      display: 'block',
                      marginTop: '10px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontFamily: garamond,
                    }}
                  >
                    Upgrade — €3.99/month
                  </a>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '10px 16px',
                borderRadius: '14px 14px 14px 2px',
                backgroundColor: 'hsl(var(--muted))',
                color: 'hsl(var(--muted-foreground))',
                fontSize: '0.9rem',
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
          padding: '16px 20px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          display: 'flex',
          gap: '10px',
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? 'Daily limit reached' : 'Ask Zenzeii…'}
            disabled={thinking || limitReached}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              fontFamily: garamond,
              fontSize: '16px',
              outline: 'none',
              opacity: limitReached ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={thinking || !input.trim() || limitReached}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              fontFamily: garamond,
              fontSize: '0.95rem',
              cursor: thinking || !input.trim() || limitReached ? 'not-allowed' : 'pointer',
              opacity: thinking || !input.trim() || limitReached ? 0.55 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
