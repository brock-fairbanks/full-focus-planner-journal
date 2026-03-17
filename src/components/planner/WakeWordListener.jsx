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
    const conversationRef = useRef(null);
    useEffect(() => {
        conversationRef.current = conversation;
    }, [conversation]);
    const [latestResponse, setLatestResponse] = useState('');
    const [userTranscript, setUserTranscript] = useState('');
    
    const pathnameRef = useRef(location.pathname);
    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const isAssistantActiveRef = useRef(false);
    
    const [locationContext, setLocationContext] = useState('');
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocationContext(`User GPS: {"lat": ${position.coords.latitude}, "lon": ${position.coords.longitude}}`);
                },
                (error) => console.error("GPS error:", error)
            );
        }
    }, []);

    useEffect(() => {
        const unsubscribe = base44.entities.GeminiMessage.subscribe((event) => {
            if (isAssistantActiveRef.current && event.type === 'create') {
                if (event.data.role === 'model') {
                    setLatestResponse(event.data.content);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const playAIResponse = async (text) => {
        setAssistantState('speaking');
        try {
            const response = await base44.functions.invoke('generateSpeech', { text, voice: 'echo' });
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
        setLatestResponse('');
        setUserTranscript('');
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

    const playWakeSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {}
    };

    const triggerAssistant = async () => {
        const currentConv = conversationRef.current;
        if (isAssistantActiveRef.current || !currentConv) return;
        isAssistantActiveRef.current = true;
        setAssistantState('listening');
        playWakeSound();
        
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
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    sampleRate: 16000, 
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
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
                                setUserTranscript(text.trim());
                                setLatestResponse('');
                                
                                const response = await base44.functions.invoke('chatWithGemini', {
                                    userText: text.trim(),
                                    locationContext
                                });
                                
                                if (response.data && response.data.text) {
                                    setLatestResponse(response.data.text);
                                    playAIResponse(response.data.text);
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

                if (average > 3) {
                    hasSpoken = true;
                    silenceStart = Date.now();
                } else {
                    if (Date.now() - silenceStart > 3000) {
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
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth < 768);
        if (!hasSupport || isMobileDevice) return;

        let isMounted = true;
        let recognition = null;
        let restartDelay = 1000;

        const initListener = async () => {
            try {
                // Get permission to read device labels (also warms up mic)
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                const defaultMic = audioInputs.find(d => d.deviceId === 'default') || audioInputs[0];
                
                if (defaultMic && defaultMic.label) {
                    toast.info(`Listening via: ${defaultMic.label}`, { duration: 4000 });
                }
                
                stream.getTracks().forEach(t => t.stop());
            } catch (err) {
                console.error("Could not check microphones:", err);
            }

            if (!isMounted) return;

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            
            recognition.continuous = true;
            recognition.interimResults = true;
            
            recognition.onresult = (event) => {
                restartDelay = 500; // Reset backoff on success
                if (isAssistantActiveRef.current) return;

                const current = event.resultIndex;
                if (!event.results[current]) return;
                
                let transcript = '';
                for (let i = Math.max(0, event.resultIndex - 2); i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript.toLowerCase() + ' ';
                }
                console.log("Wake word listener heard:", transcript);
                
                if (transcript.includes('alex') || transcript.includes('alec') || transcript.includes('alix') || transcript.includes('alice')) {
                    const now = Date.now();
                    if (now - lastTriggerRef.current < 3000) return; // Debounce triggers
                    lastTriggerRef.current = now;

                    if (pathnameRef.current === '/chat') {
                        window.dispatchEvent(new CustomEvent('wakeword-detected'));
                    } else {
                        triggerAssistant();
                    }
                }
            };

            recognition.onend = () => {
                if (isMounted && recognitionRef.current === recognition && !isAssistantActiveRef.current) {
                    setTimeout(() => {
                        if (isMounted && recognitionRef.current === recognition) {
                            try { recognition.start(); } catch (e) {}
                        }
                    }, restartDelay);
                }
            };

            recognition.onerror = (e) => {
                console.error("Speech recognition error:", e.error);
                if (e.error === 'not-allowed') {
                    recognitionRef.current = null;
                    toast.error("Microphone access denied. Wake word disabled.");
                } else if (e.error === 'aborted' || e.error === 'network') {
                    restartDelay = Math.min(restartDelay * 1.5, 10000); // Exponential backoff to avoid looping
                }
            };

            try { recognition.start(); } catch (e) {}
        };

        initListener();

        return () => {
            isMounted = false;
            const rec = recognitionRef.current;
            recognitionRef.current = null;
            if (rec) {
                try { rec.abort(); } catch (e) {}
            }
        };
    }, [hasSupport]); // Removed conversation dependency to prevent restarts

    if (assistantState === 'idle') return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center justify-center pointer-events-auto gap-4">
            
            {/* Show AI text response if we are not on the chat page and there is a response */}
            {assistantState !== 'idle' && assistantState !== 'listening' && location.pathname !== '/chat' && (
                <div className="bg-white text-slate-800 rounded-2xl p-4 shadow-xl border border-slate-200 max-w-md w-full animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {userTranscript && (
                        <div className="mb-3 pb-3 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                                You:
                            </span>
                            <div className="text-sm text-slate-600 italic">"{userTranscript}"</div>
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-[#F97316] uppercase tracking-wider flex items-center gap-1">
                            {assistantState === 'speaking' ? <Volume2 size={12} /> : <Loader2 size={12} className="animate-spin" />}
                            Alex says:
                        </span>
                    </div>
                    <div className="text-sm prose prose-sm max-w-none prose-p:leading-relaxed max-h-[30vh] overflow-y-auto">
                        {latestResponse ? (
                            <ReactMarkdown>{latestResponse}</ReactMarkdown>
                        ) : (
                            <span className="text-slate-400 flex items-center gap-2 italic">
                                Thinking...
                            </span>
                        )}
                    </div>
                </div>
            )}

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