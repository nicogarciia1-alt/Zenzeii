import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Good day. I am Zenzeii, your literary companion. Ask me anything about the text you are reading.',
};

export function useZenzeiiChat({ bookTitle = '', currentSentence = '', onAiUsed, onAiLimitReached } = {}) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const handleSend = useCallback(async () => {
    const message = input.trim();
    if (!message || thinking) return;

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
      onAiUsed?.();
    } catch (err) {
      if (err.response?.status === 429) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: "You've reached today's limit for our conversation. I'll be here again tomorrow — or you can continue now with Premium.",
          isLimit: true,
        }]);
        onAiLimitReached?.();
      } else {
        const errMsg = err.response?.status === 503
          ? 'AI chat is not configured on this server.'
          : 'I encountered a difficulty. Please try again.';
        setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
      }
    } finally {
      setThinking(false);
    }
  }, [input, thinking, messages, bookTitle, currentSentence, onAiUsed, onAiLimitReached]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const limitReached = messages.some((m) => m.isLimit);

  return { messages, input, setInput, thinking, handleSend, handleKeyDown, limitReached };
}
