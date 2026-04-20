'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { aiApi } from '@/lib/api';
import useAuthStore from '@/store/authStore';
import { Send, Sparkles, Bot, User, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }

const SUGGESTIONS = [
  'Suggest a dress for a wedding reception',
  'What fabric is best for summer in India?',
  'I need a saree for a formal event under ₹3000',
  'What are trending colours this season?',
  'Help me choose between silk and georgette',
];

export default function ChatbotPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Namaste! 👗 I'm your AI Fashion Assistant. I can help you with:\n\n• Outfit recommendations for any occasion\n• Fabric and colour advice\n• Style tips for Indian fashion\n• Finding the perfect boutique products\n\nWhat are you looking for today?`, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await aiApi.chat({
        message: msg,
        session_id: sessionId,
        history: history.slice(-10)
      });

      const aiMsg: Message = { role: 'assistant', content: res.data.message, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to get response. Please try again.';
      toast.error(errMsg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again!',
        timestamp: new Date()
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! How can I help you with your fashion needs today? 👗",
      timestamp: new Date()
    }]);
  };

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b mb-4 shrink-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold">AI Fashion Assistant</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              Powered by Gemini AI
            </p>
          </div>
          <button onClick={clearChat} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground" title="Clear chat">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                  : 'bg-primary'
              }`}>
                {msg.role === 'assistant'
                  ? <Bot className="h-4 w-4 text-white" />
                  : <User className="h-4 w-4 text-primary-foreground" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  <p className="leading-relaxed">{formatMessage(msg.content)}</p>
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="chat-bubble-ai">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="shrink-0 mb-3">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs rounded-full border px-3 py-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t pt-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask me about fashion, fabrics, styles..."
              className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
            <Wand2 className="h-3 w-3" /> AI responses consume 1 credit per message
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
