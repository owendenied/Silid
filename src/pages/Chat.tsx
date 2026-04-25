import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { askGemini } from '../lib/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const Chat = () => {
  const { user } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: user?.role === 'teacher' 
        ? "Magandang araw, Guro! Ako si Guro Bot. Paano kita matutulungan sa iyong lesson plan o classroom management ngayon?"
        : "Kumusta! Ako si Guro Bot, ang iyong AI study buddy. May kailangan ka bang tulong sa iyong mga aralin?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const result = await askGemini(currentInput);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Pasensya na, nagkaroon ng error sa pagkonekta sa AI. Pakisubukang muli.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-silid-teal to-blue-700 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg">Guro Bot</h2>
            <p className="text-xs text-blue-100 flex items-center gap-1">
              <Sparkles size={12} /> AI Assistant
            </p>
          </div>
        </div>
        <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-silid-yellow text-white' : 'bg-silid-teal text-white'
              }`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={`p-3 rounded-2xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-silid-teal text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <span className={`text-[10px] mt-1 block opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-silid-teal text-white flex items-center justify-center animate-pulse">
                <Bot size={18} />
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="I-type ang iyong tanong dito..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-silid-teal/20 focus:border-silid-teal outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-silid-teal text-white p-2 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200"
          >
            <Send size={24} />
          </button>
        </div>
      </form>
    </div>
  );
};
