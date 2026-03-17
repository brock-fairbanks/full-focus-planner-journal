import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function WakeWordListener() {
    const navigate = useNavigate();
    const location = useLocation();
    const [hasSupport] = useState('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    const recognitionRef = useRef(null);
    const lastTriggerRef = useRef(0);

    useEffect(() => {
        if (!hasSupport) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event) => {
            const current = event.resultIndex;
            if (!event.results[current]) return;
            
            const transcript = event.results[current][0].transcript.toLowerCase();
            
            if (transcript.includes('hey alex') || transcript.includes('okay alex')) {
                const now = Date.now();
                if (now - lastTriggerRef.current < 3000) return; // Debounce triggers
                lastTriggerRef.current = now;

                toast.success("Wake word detected! Listening...");
                
                if (window.location.pathname !== '/chat') {
                    navigate('/chat?autoRecord=true');
                } else {
                    window.dispatchEvent(new CustomEvent('wakeword-detected'));
                }
                
                // Stop to clear the transcript buffer, it will auto-restart via onend
                recognition.stop();
            }
        };

        recognition.onend = () => {
            // Restart listening unless the component unmounted
            if (recognitionRef.current) {
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (e) {}
                }, 100);
            }
        };

        recognition.onerror = (e) => {
            if (e.error === 'not-allowed') {
                recognitionRef.current = null; // stop trying if user denied mic
            }
        };

        try {
            recognition.start();
        } catch (e) {}

        return () => {
            const rec = recognitionRef.current;
            recognitionRef.current = null;
            if (rec) rec.stop();
        };
    }, [navigate, location.pathname, hasSupport]);

    return null; // This is a background listener component
}