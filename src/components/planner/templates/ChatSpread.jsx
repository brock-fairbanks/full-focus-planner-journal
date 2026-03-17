import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageSquare, Plus, MessagesSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Copy, Zap, CheckCircle2, AlertCircle, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    const statusConfig = {
        pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
        running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-slate-50",
                    expanded ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"
                )}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="text-slate-700">{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn("text-slate-500", isError && "text-red-600")}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 text-slate-400 transition-transform ml-auto", 
                        expanded && "rotate-90")} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-200 space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Parameters:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Result:</div>
                            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-8 w-8 rounded-full bg-[#1e293b] text-white flex items-center justify-center mt-0.5 shadow-sm shrink-0">
                    <Sparkles size={14} />
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm",
                        isUser ? "bg-[#F97316] text-white" : "bg-white border border-slate-200 text-slate-800"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:leading-relaxed"
                                components={{
                                    code: ({ inline, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <div className="relative group/code mt-2">
                                                <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">
                                                    <code className={className} {...props}>{children}</code>
                                                </pre>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                        toast.success('Copied!');
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3 text-slate-400" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[13px] font-mono">
                                                {children}
                                            </code>
                                        );
                                    },
                                    a: ({ children, ...props }) => (
                                        <a className="text-[#F97316] hover:underline font-medium" {...props} target="_blank" rel="noopener noreferrer">{children}</a>
                                    ),
                                    p: ({ children }) => <p className="my-1.5">{children}</p>,
                                    ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
                                    h1: ({ children }) => <h1 className="text-lg font-bold my-3 text-[#1e293b]">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold my-2 text-[#1e293b]">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold my-2 text-[#1e293b]">{children}</h3>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-3 border-slate-300 pl-4 my-3 text-slate-600 italic">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
                
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function ChatSpread({ onClearCanvas }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [conversation, setConversation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const initChat = async () => {
            try {
                // Try to get latest conversation or create new
                const convs = await base44.agents.listConversations({ agent_name: "planner_assistant" });
                let currentConv;
                if (convs.length > 0) {
                    currentConv = await base44.agents.getConversation(convs[0].id);
                } else {
                    currentConv = await base44.agents.createConversation({
                        agent_name: "planner_assistant",
                        metadata: { name: "Planner Assistant Chat" }
                    });
                }
                setConversation(currentConv);
                setMessages(currentConv.messages || []);
            } catch (err) {
                console.error("Failed to initialize chat", err);
                toast.error("Could not load chat.");
            } finally {
                setIsLoading(false);
            }
        };
        initChat();
    }, []);

    useEffect(() => {
        if (!conversation) return;
        const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
            setMessages(data.messages || []);
        });
        return () => unsubscribe();
    }, [conversation]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !conversation) return;
        
        const userText = input.trim();
        setInput("");
        setIsSending(true);

        try {
            await base44.agents.addMessage(conversation, {
                role: "user",
                content: userText
            });
        } catch (err) {
            console.error("Send failed", err);
            toast.error("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    const startNewConversation = async () => {
        setIsLoading(true);
        try {
            const newConv = await base44.agents.createConversation({
                agent_name: "planner_assistant",
                metadata: { name: "Planner Assistant Chat" }
            });
            setConversation(newConv);
            setMessages([]);
        } catch (err) {
            console.error("New conversation failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full h-[calc(100vh-80px)] p-4 md:p-8 flex flex-col items-center bg-[#FAF9F6]">
            <div className="flex justify-between items-center w-full max-w-4xl mb-6 relative z-30 pointer-events-auto">
                <div className="flex items-center gap-3">
                    <MessagesSquare size={28} className="text-[#1e293b]" />
                    <h1 className="text-3xl font-serif font-bold text-[#1e293b]">AI Assistant</h1>
                </div>
                <div className="flex gap-3 items-center">
                    <a 
                        href={base44.agents.getWhatsAppConnectURL('planner_assistant')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 px-4 py-2 rounded-lg transition-colors border border-green-100 flex items-center gap-2"
                    >
                        💬 WhatsApp
                    </a>
                    <button 
                        onClick={startNewConversation}
                        className="flex items-center gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
                    >
                        <Plus size={16} /> New Chat
                    </button>
                </div>
            </div>

            <div className="w-full max-w-4xl bg-white border-2 border-[#cbd5e1] rounded-xl flex flex-col overflow-hidden shadow-sm relative z-30 pointer-events-auto h-full mb-8">
                <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading chat...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                                <Sparkles size={32} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-[#1e293b]">How can I help you today?</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                                    I can recall meeting notes, summarize plans, check your daily tasks, and track quarterly goals.
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <form onSubmit={handleSend} className="flex gap-3">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask about your schedule, goals, or meeting notes..."
                            className="flex-1 bg-white border-slate-200 focus-visible:ring-[#F97316] text-base py-6 rounded-xl shadow-sm"
                            disabled={isLoading || isSending}
                        />
                        <Button 
                            type="submit" 
                            disabled={!input.trim() || isLoading || isSending}
                            className="bg-[#F97316] hover:bg-[#ea580c] text-white px-6 rounded-xl shadow-sm h-auto"
                        >
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}