// agent-notes: { ctx: "Floating responsive AI chatbot component with quick-reply chips and auto-scroll", deps: ["src/services/chatService.js"], state: active, last: "sato@2026-07-28" }

import { useState, useRef, useEffect } from 'react';
import { Bot, MessageSquare, X, Send, Sparkles, RefreshCw, ChevronDown, User } from 'lucide-react';
import { sendMessageToAI } from '../services/chatService';

const QUICK_REPLIES = [
  '📍 Where is Hall A?',
  "📅 Today's Event Schedule",
  '📢 Show Live Alerts',
  '🎟️ How to check in with QR?',
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    content:
      'Hello! 👋 I am your **SmartSympo AI Assistant**.\nHow can I help you navigate venues, check schedules, or view announcements today?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const responseText = await sendMessageToAI(text, history);

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '⚠️ Sorry, I encountered an issue retrieving that response. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasUnread(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[92vw] sm:w-[380px] h-[520px] max-h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 text-slate-900">
          {/* Header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  SmartSympo AI
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500">Event Assistant & Router</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Reset Chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={toggleOpen}
                title="Close Chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-700" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-2xs font-normal'
                      : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>
                  <span
                    className={`block text-[10px] mt-1 text-right ${
                      msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-700" />
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick-reply Chips */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto flex gap-1.5 scrollbar-none">
            {QUICK_REPLIES.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(reply)}
                disabled={isLoading}
                className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 transition-colors shrink-0 disabled:opacity-50 font-medium cursor-pointer shadow-2xs"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask AI Assistant..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={toggleOpen}
        aria-label="Toggle Chatbot"
        className="group relative w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
        ) : (
          <>
            <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 text-[9px] font-bold text-white items-center justify-center">
                  1
                </span>
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
