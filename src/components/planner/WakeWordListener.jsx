import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Mic, Loader2, Volume2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export default function WakeWordListener() {
    const location = useLocation();
    const [hasSupport] = useState('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    const recognitionRef = useRef(null);
    const lastTriggerRef = useRef(0);
    
    const [assistantState, setAssistantState] = useState('idle'); // idle, listening, processing, speaking
    const [conversation, setConversation] = useState(null);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const isAssistantActiveRef = useRef(false);

    // Initialize conversation for the assistant
    useEffect(() => {
        const initChat = async () => {
            try {
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
            } catch (err) {
                console.error("Failed to initialize background chat", err);
            }
        };
        initChat();
    }, []);

    const playAIResponse = async (text) => {
        setAssistantState('speaking');
        try {
            const response = await base44.functions.invoke('generateSpeech', { text, voice: 'onyx' });
            const audioUrl = `data:audio/mp3;base64,${response.data.audioContent}`;
            const audio = new Audio(audioUrl);
            audioPlayerRef.current = audio;
            
            audio.onended = () => {
                closeAssistant();
            };
            audio.onerror = () => {
                closeAssistant();
            };
            
            await audio.play();
        } catch (err) {
            console.error("Speech playback failed", err);
            closeAssistant();
        }
    };

    const closeAssistant = () => {
        setAssistantState('idle');
        isAssistantActiveRef.current = false;
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        // Restart wake word listener
        try {
            if (recognitionRef.current) recognitionRef.current.start();
        } catch (e) {}
    };

    const triggerAssistant = async () => {
        if (isAssistantActiveRef.current || !conversation) return;
        isAssistantActiveRef.current = true;
        setAssistantState('listening');
        
        // Stop wake word listener temporarily
        try {
            if (recognitionRef.current) recognitionRef.current.stop();
        } catch (e) {}

        // Stop any currently playing audio
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(() => {});
                    audioContextRef.current = null;
                }

                if (!isAssistantActiveRef.current) return; // aborted

                setAssistantState('processing');
                
                try {
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        try {
                            const base64Audio = reader.result.split(',')[1];
                            const res = await base44.functions.invoke('transcribeAudio', { audioBase64: base64Audio });
                            
                            const text = res.data.text;
                            
                            if (text && text.trim()) {
                                // Add user message and wait for AI to finish responding
                                const updatedConv = await base44.agents.addMessage(conversation, {
                                    role: "user",
                                    content: text.trim()
                                });
                                
                                const finalMessages = updatedConv.messages || [];
                                const latestMsg = finalMessages[finalMessages.length - 1];
                                
                                if (latestMsg && latestMsg.role === 'model' && latestMsg.content) {
                                    playAIResponse(latestMsg.content);
                                } else {
                                    closeAssistant();
                                }
                            } else {
                                closeAssistant();
                            }
                        } catch (err) {
                            console.error("Voice transcription failed", err);
                            toast.error("Failed to transcribe voice message");
                            closeAssistant();
                        }
                    };
                } catch (err) {
                    console.error("Voice processing failed", err);
                    closeAssistant();
                }
            };

            mediaRecorder.start();

            // Silence detection for auto-stop
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.minDecibels = -50;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            let silenceStart = Date.now();
            let hasSpoken = false;
            
            const checkSilence = () => {
                if (mediaRecorder.state !== 'recording') return;
                
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const average = sum / bufferLength;

                if (average > 10) {
                    hasSpoken = true;
                    silenceStart = Date.now();
                } else {
                    if (hasSpoken && Date.now() - silenceStart > 1500) {
                        mediaRecorder.stop();
                        return;
                    } else if (!hasSpoken && Date.now() - silenceStart > 7000) {
                        mediaRecorder.stop();
                        return;
                    }
                }
                
                requestAnimationFrame(checkSilence);
            };
            
            checkSilence();
        } catch (err) {
            console.error("Failed to access microphone", err);
            toast.error("Microphone access denied");
            closeAssistant();
        }
    };

    // Wake word listener
    useEffect(() => {
        if (!hasSupport) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event) => {
            if (isAssistantActiveRef.current) return;

            const current = event.resultIndex;
            if (!event.results[current]) return;
            
            const transcript = event.results[current][0].transcript.toLowerCase();
            
            if (transcript.includes('hey alex') || transcript.includes('okay alex')) {
                const now = Date.now();
                if (now - lastTriggerRef.current < 3000) return; // Debounce triggers
                lastTriggerRef.current = now;

                triggerAssistant();
            }
        };

        recognition.onend = () => {
            if (recognitionRef.current && !isAssistantActiveRef.current) {
                setTimeout(() => {
                    try { recognition.start(); } catch (e) {}
                }, 100);
            }
        };

        recognition.onerror = (e) => {
            if (e.error === 'not-allowed') recognitionRef.current = null;
        };

        try { recognition.start(); } catch (e) {}

        return () => {
            const rec = recognitionRef.current;
            recognitionRef.current = null;
            if (rec) rec.stop();
        };
    }, [hasSupport, conversation]);

    if (assistantState === 'idle') return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md text-white rounded-full pl-2 pr-4 py-2 shadow-2xl flex items-center gap-3 border border-slate-700/50">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    assistantState === 'listening' && "bg-blue-500 animate-pulse",
                    assistantState === 'processing' && "bg-amber-500",
                    assistantState === 'speaking' && "bg-emerald-500"
                )}>
                    {assistantState === 'listening' && <Mic size={20} className="text-white" />}
                    {assistantState === 'processing' && <Loader2 size={20} className="text-white animate-spin" />}
                    {assistantState === 'speaking' && <Volume2 size={20} className="text-white animate-pulse" />}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-wide">
                        {assistantState === 'listening' && "Listening..."}
                        {assistantState === 'processing' && "Thinking..."}
                        {assistantState === 'speaking' && "Speaking..."}
                    </span>
                </div>
                <button 
                    onClick={closeAssistant}
                    className="ml-2 p-1.5 hover:bg-white/20 rounded-full transition-colors text-slate-300 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}