// agent-notes: { ctx: "Floating responsive AI chatbot assistant with quick-reply chips, auto-scroll, and modern SaaS bubble aesthetic", deps: ["src/services/chatService.js", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, RefreshCw, ChevronDown, User, Loader2 } from 'lucide-react';
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
      'Hello! 👋 I am your **SmartSympo AI Assistant**.\nHow can I help you navigate venues, check symposium schedules, or view announcements today?',
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* 1. Chat Drawer Window */}
      {isOpen && (
        <div className="w-[90vw] sm:w-[380px] h-[520px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden mb-3.5 animate-slideUp transition-all text-left">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 text-white shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">SmartSympo AI</h3>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                </div>
                <p className="text-[11px] text-indigo-100 font-medium">Virtual Symposium Concierge</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Reset conversation"
                className="p-2 rounded-xl text-indigo-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-indigo-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/70 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-3.5 leading-relaxed shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-1.5 font-mono ${
                      msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-500">
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-slate-600 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>AI assistant is typing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Chips */}
          <div className="p-2.5 bg-white border-t border-slate-200/70 overflow-x-auto flex gap-1.5 scrollbar-none">
            {QUICK_REPLIES.map((qr, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qr)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200/80 hover:border-indigo-200 shrink-0 cursor-pointer shadow-2xs"
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about events, venues, passes..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating Action Button */}
      <button
        onClick={toggleOpen}
        className="relative group p-4 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
        aria-label="Open AI Assistant"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
          </span>
        )}
      </button>
    </div>
  );
}
