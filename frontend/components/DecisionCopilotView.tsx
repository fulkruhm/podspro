
import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, sendMessageStream, startChat } from '../services/geminiService';
import { createAuditLogEvent } from '../services/auditService';
import { ChatMessage } from '../types';

interface DecisionCopilotViewProps {
  initialQuery?: string | null;
  clearInitialQuery: () => void;
  onClose: () => void;
}

const DecisionCopilotView: React.FC<DecisionCopilotViewProps> = ({
  initialQuery,
  clearInitialQuery,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I'm the PODS AI Assistant. How can I help you optimize your supply chain today? I can analyze your inventory, predict freight rates, or help with multi-SKU optimization.", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const chatSessionRef = useRef<string | null>(null);
  const hasProcessedQuery = useRef(false);

  // Define handleSend first so it can be called by other effects
  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || input;
    if (!textToSend.trim() || !chatSessionRef.current || isLoading) return;

    void createAuditLogEvent({
      action: 'ASSISTANT_MESSAGE_SEND',
      details: `Submitted assistant prompt: ${textToSend.slice(0, 240)}`,
      category: 'system',
      severity: 'info',
    });

    const userMessage: ChatMessage = { role: 'user', content: textToSend, timestamp: Date.now() };
    const aiMessageTimestamp = Date.now() + Math.random();
    setMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, { role: 'model', content: '', timestamp: aiMessageTimestamp }]);
    if (!customMessage) setInput('');
    setIsLoading(true);

    try {
      await sendMessageStream(chatSessionRef.current, textToSend, (chunk) => {
        setMessages(prev => prev.map(m => (
          m.timestamp === aiMessageTimestamp && m.role === 'model'
            ? { ...m, content: `${m.content}${chunk}` }
            : m
        )));
      });
    } catch (error) {
      const fallback = await sendMessage(chatSessionRef.current, textToSend);
      setMessages(prev => prev.map(m => (
        m.timestamp === aiMessageTimestamp && m.role === 'model'
          ? { ...m, content: fallback }
          : m
      )));
    }
    
    setIsLoading(false);
  };

  // Initialize chat session
  useEffect(() => {
    const initChat = async () => {
      try {
        console.log('[DecisionCopilotView] Initializing chat, initialQuery:', initialQuery);
        const sessionId = await startChat();
        chatSessionRef.current = sessionId;
        console.log('[DecisionCopilotView] Chat initialized with sessionId:', sessionId);
        setChatInitialized(true);
        
        // If there's an initial query and we haven't processed it yet, send it now
        if (initialQuery && !hasProcessedQuery.current) {
          console.log('[DecisionCopilotView] Sending initial query:', initialQuery);
          hasProcessedQuery.current = true;
          // Small delay to ensure the state update completes
          setTimeout(() => {
            handleSend(initialQuery);
            clearInitialQuery();
          }, 100);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setMessages(prev => [...prev, { role: 'model', content: "Sorry, I couldn't initialize the chat. Please try again.", timestamp: Date.now() }]);
      }
    };
    initChat();
  }, []);

  // Also handle case where initialQuery arrives after chat is already initialized
  useEffect(() => {
    if (initialQuery && chatInitialized && !hasProcessedQuery.current) {
      hasProcessedQuery.current = true;
      handleSend(initialQuery);
      clearInitialQuery();
    }
  }, [initialQuery, chatInitialized]);

  useEffect(() => {
    const messagesEndRef = document.querySelector('.messages-end');
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 md:p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg md:text-xl shadow-lg">🤖</div>
          <div>
            <h2 className="font-bold text-xs md:text-sm">PODS Advisor</h2>
            <div className="flex items-center">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full mr-1.5 md:mr-2"></span>
              <span className="text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest font-bold">Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50/50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[85%] rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm border ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-white text-slate-800 border-slate-200'
            }`}>
              <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed prose prose-sm max-w-none prose-slate">
                {m.content}
              </div>
              <div className={`text-[8px] md:text-[10px] mt-2 flex items-center ${m.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                <span className="mr-2">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {m.role === 'model' && <span className="bg-blue-50 text-blue-600 px-1 rounded font-bold text-[8px]">PODS ANALYTICS</span>}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span className="text-slate-400 text-[10px] md:text-xs font-medium italic">Analyzing...</span>
            </div>
          </div>
        )}
        <div className="messages-end" />
      </div>

      <div className="p-3 md:p-4 bg-white border-t border-slate-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-3 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-md flex items-center justify-center min-w-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
          {['"Check Milk"', '"LA-Chi Rate"', '"What-if Lead Time"'].map((suggestion, i) => (
            <button 
              key={i}
              onClick={() => handleSend(suggestion.replace(/"/g, ''))}
              className="text-[9px] md:text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded-full text-slate-600 whitespace-nowrap hover:border-blue-400 hover:text-blue-600 transition font-medium"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecisionCopilotView;
