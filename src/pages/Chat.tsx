import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { askGemini } from '../lib/ai';
import { useT } from '../lib/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const Chat = () => {
  const { user } = useAppStore();
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: user?.role === 'teacher' 
        ? "Hello, Teacher! 👋 I'm Guro Bot, your AI teaching assistant. I can help you with lesson plans, classroom activities, rubric creation, and teaching strategies. What do you need today?"
        : "Hi there! 👋 I'm Guro Bot, your AI study buddy! I can help you understand your lessons, quiz you on topics, or explain tricky concepts. Ano ang kailangan mo? (What do you need?)",
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
        content: "Pasensya na — may error sa AI. Subukan ulit mamaya! (Sorry, there was an AI error. Try again later!)",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = user?.role === 'teacher' 
    ? [
        'Create a lesson plan about Philippine history',
        'Suggest an ice breaker activity',
        'Help me make a rubric for essays',
      ]
    : [
        'Explain photosynthesis simply',
        'Quiz me on Philippine history',
        'Help me with math word problems',
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto bg-white rounded-2xl shadow-elevated overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-coral text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-extrabold text-lg font-display">Guro Bot</h2>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <Sparkles size={12} /> AI Tutor Assistant — Silid Classroom
            </p>
          </div>
        </div>
        <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-smooth">
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--background)]">
        {messages.map((msg, idx) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-gradient-gold text-white' : 'bg-gradient-coral text-white'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3.5 rounded-2xl shadow-soft ${
                msg.role === 'user' 
                  ? 'bg-gradient-teal text-white rounded-tr-md' 
                  : 'bg-white text-gray-800 rounded-tl-md border border-gray-100'
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <span className={`text-[10px] mt-1.5 block opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Quick Suggestions (show only when few messages) */}
        {messages.length <= 1 && !isLoading && (
          <div className="flex flex-wrap gap-2 justify-center pt-4">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:border-[var(--color-silid-coral)] hover:text-[var(--color-silid-coral)] transition-smooth btn-press shadow-soft"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start animate-fade-up">
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-xl bg-gradient-coral text-white flex items-center justify-center animate-pulse">
                <Bot size={16} />
              </div>
              <div className="bg-white p-3.5 rounded-2xl rounded-tl-md border border-gray-100 shadow-soft">
                <div className="flex gap-1.5">
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
            placeholder={t('loading') === 'Nagloload...' ? 'I-type ang iyong tanong dito...' : 'Type your question here...'}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-silid-coral)]/20 focus:border-[var(--color-silid-coral)] outline-none transition-smooth bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-coral text-white p-2.5 rounded-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-smooth shadow-glow-coral btn-press"
          >
            <Send size={22} />
          </button>
        </div>
      </form>
    </div>
  );
};
