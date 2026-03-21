import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function TutorialChat() {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        let unsubscribe;
        const initChat = async () => {
            try {
                const conv = await base44.agents.createConversation({
                    agent_name: "tutorial_agent",
                    metadata: { name: "Onboarding Tutorial" }
                });
                setConversation(conv);
                
                await base44.agents.addMessage(conv, {
                    role: "user",
                    content: "Give me a structured, beautifully formatted overview of all the app's features: Daily Planner, Quarterly Goals, Meeting Notes, Journal, and Scratchpad. Use emojis and bullet points. Do not ask me any questions at the end."
                });

                unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
                    setMessages(data.messages || []);
                    setLoading(false);
                });

            } catch (error) {
                console.error("Failed to init chat", error);
                setLoading(false);
            }
        };
        initChat();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-[400px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, i) => {
                            if (msg.role === 'user') return null;
                            
                            const isUser = msg.role === 'user';
                            return (
                                <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    {!isUser && (
                                        <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-white shrink-0 mt-1">
                                            <Bot size={16} />
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${isUser ? 'bg-[#1e293b] text-white' : 'bg-white border border-slate-200 text-slate-700 shadow-sm'}`}>
                                        <ReactMarkdown className="prose prose-sm max-w-none text-current prose-p:my-1 prose-ul:my-1">
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Removed prompt input per user request */}
        </div>
    );
}