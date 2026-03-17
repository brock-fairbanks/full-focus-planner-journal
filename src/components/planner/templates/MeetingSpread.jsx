import React, { useState, useRef } from "react";
import { Mic, Square, FileText, Loader2, Sparkles, Trash2, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from '@/lib/AuthContext';

export default function MeetingSpread({ date, onClearCanvas }) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const partNumberRef = useRef(1);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(false);
  const sessionIdRef = useRef(null);

  const processChunk = async (audioBlob, partNum, mimeType, extension, isFinal) => {
    if (isFinal) setIsProcessing(true);
    try {
      const dateStr = new Date().toISOString().slice(0,10);
      const sessionId = sessionIdRef.current || 'unknown';
      const fileName = `meeting_${dateStr}_${sessionId}_part${partNum}.${extension}`;
      const file = new File([audioBlob], fileName, { type: mimeType });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      
      if (user?.drive_connected) {
        const driveFileName = `Meeting_${dateStr}_ID-${sessionId}_Part${partNum}.${extension}`;
          
        base44.functions.invoke('uploadToGoogleDrive', {
          file_url: uploadRes.file_url,
          file_name: driveFileName,
          mime_type: mimeType
        }).catch(e => console.error("Drive upload failed", e));
      }
      
      const text = await base44.integrations.Core.InvokeLLM({
        prompt: "Please transcribe the following audio file. Return only the transcription text. If this is a continuation, just transcribe what you hear without comments.",
        file_urls: [uploadRes.file_url],
        model: "gemini_3_flash"
      });
      
      setTranscription(prev => prev ? prev + "\n\n" + text : text);
    } catch (err) {
      console.error("Transcription error", err);
      if (isFinal) alert("Failed to transcribe audio.");
    } finally {
      if (isFinal) setIsProcessing(false);
    }
  };

  const startRecorderInstance = (stream) => {
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/mp3')) {
      mimeType = 'audio/mp3';
    }
    
    const options = { mimeType };
    const mediaRecorder = new MediaRecorder(stream, options);
    
    // Store in ref so we can stop the *current* one on user click
    mediaRecorderRef.current = mediaRecorder;
    
    // Create new array/size for this specific recorder instance
    const localChunks = [];
    let localChunkSize = 0;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        localChunks.push(event.data);
        localChunkSize += event.data.size;
        
        // If size exceeds ~40MB, trigger chunking to stay under 50MB limit
        if (localChunkSize > 40 * 1024 * 1024 && isRecordingRef.current) {
          // Immediately start next recorder to prevent gaps
          startRecorderInstance(stream);
          // Stop this one to finalize its file
          mediaRecorder.stop();
        }
      }
    };

    mediaRecorder.onstop = () => {
      const actualMimeType = mediaRecorder.mimeType || mimeType;
      const extension = actualMimeType.split('/')[1].split(';')[0];
      const audioBlob = new Blob(localChunks, { type: actualMimeType });
      
      if (!isRecordingRef.current) {
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl({ url, extension });
      }
      
      // Save current part number for this closure
      const currentPart = partNumberRef.current;
      
      if (isRecordingRef.current) {
        partNumberRef.current += 1;
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
      
      processChunk(audioBlob, currentPart, actualMimeType, extension, !isRecordingRef.current);
    };

    // Trigger ondataavailable every 5 seconds to accurately track chunk size
    mediaRecorder.start(5000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      partNumberRef.current = 1;
      isRecordingRef.current = true;
      sessionIdRef.current = Math.random().toString(36).substring(2, 8).toUpperCase();
      setAudioUrl(null);
      setIsRecording(true);
      
      startRecorderInstance(stream);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Microphone access denied or error occurred.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsProcessing(true);
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
  };

  const generateSummary = async () => {
    if (!transcription) return;
    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Please summarize the following meeting transcription concisely, highlighting the main points, decisions, and action items:\n\n${transcription}`,
        model: "gemini_3_flash"
      });
      setSummary(result);
    } catch (err) {
      console.error("Summary error", err);
      alert("Failed to generate summary.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative w-full min-h-full p-4 md:p-8 flex flex-col items-center bg-[#FAF9F6] pb-32">
      <button 
        onClick={onClearCanvas}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-30 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
        title="Clear entire page"
      >
        <Trash2 size={16} />
        <span className="hidden md:inline">Clear Page</span>
      </button>

      <h1 className="text-3xl font-serif font-bold mb-8 text-[#1e293b] self-start w-full max-w-5xl">Meeting Notes</h1>

      <div className="w-full max-w-5xl bg-white border-2 border-[#cbd5e1] rounded-xl p-8 mb-8 shadow-sm relative z-30 pointer-events-auto">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1e293b] mb-2">Record Meeting</h2>
            <p className="text-[#64748b] text-sm">Record your meeting audio, and AI will transcribe it for you.</p>
          </div>

          <div className="flex items-center gap-4">
            {!isRecording ? (
              <button 
                onClick={startRecording}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 shadow-sm"
              >
                <Mic size={20} />
                Start Recording
              </button>
            ) : (
              <button 
                onClick={stopRecording}
                className="flex items-center gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white px-6 py-3 rounded-full font-medium transition-all animate-pulse shadow-sm"
              >
                <Square size={20} className="fill-current" />
                Stop Recording
              </button>
            )}
            {!isRecording && !transcription && (
              <button
                onClick={() => {
                  setTranscription("Good morning everyone. Let's get started with today's team sync. First on the agenda is the website redesign project. Sarah, could you give us an update? Yes, we've completed the initial wireframes and the client has approved the new color scheme. We're on track to start development next week. That's great news. John, how are we looking on the backend API integration? The API is mostly complete, but we're still waiting on some documentation from the third-party payment gateway. I'll follow up with them today. Okay, please keep us posted on that. Finally, let's talk about the upcoming marketing campaign for the launch. We need to finalize the budget by Friday. Who is owning that? I am, I'll have the final numbers ready for review by tomorrow afternoon. Perfect. Let's aim to have everything wrapped up by end of week. Any other questions? No? Alright, let's get back to work.");
                }}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#1e293b] px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 shadow-sm border border-slate-200"
              >
                <FileText size={20} />
                Load Sample
              </button>
            )}
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-[#F97316] font-medium">
              <Loader2 size={18} className="animate-spin" />
              Processing Audio...
            </div>
          )}

          {audioUrl && !isRecording && !isProcessing && (
            <div className="flex items-center gap-4 mt-2">
              <audio controls src={audioUrl.url} className="h-10" />
              <a 
                href={audioUrl.url} 
                download={`meeting_recording.${audioUrl.extension}`}
                className="flex items-center gap-2 text-sm font-medium text-[#1e293b] hover:text-[#F97316] bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={16} />
                Download (.{audioUrl.extension})
              </a>
              <button
                onClick={() => {
                  setAudioUrl(null);
                  setTranscription("");
                  setSummary("");
                }}
                className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-30 pointer-events-auto">
        {/* Transcription Area */}
        <div className="flex flex-col h-full pointer-events-auto">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-[#1e293b]" />
            <h3 className="text-xl font-serif font-bold text-[#1e293b]">Transcription</h3>
          </div>
          <div className="bg-white border-2 border-[#cbd5e1] rounded-xl p-6 flex-1 h-[400px] max-h-[50vh] whitespace-pre-wrap overflow-y-auto">
            {transcription ? (
              <span className="text-[#334155] leading-relaxed font-sans">{transcription}</span>
            ) : (
              <span className="text-[#94a3b8] italic font-sans">Transcription will appear here...</span>
            )}
          </div>
        </div>

        {/* Summary Area */}
        <div className="flex flex-col h-full pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#F97316]" />
              <h3 className="text-xl font-serif font-bold text-[#1e293b]">AI Summary</h3>
            </div>
            {transcription && !summary && (
              <button
                onClick={generateSummary}
                disabled={isProcessing}
                className="text-sm font-medium text-white bg-[#F97316] hover:bg-[#ea580c] px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                Generate Summary
              </button>
            )}
          </div>
          <div className="bg-white border-2 border-[#cbd5e1] rounded-xl p-6 flex-1 h-[400px] max-h-[50vh] whitespace-pre-wrap overflow-y-auto">
            {summary ? (
              <span className="text-[#334155] leading-relaxed font-sans">{summary}</span>
            ) : (
              <span className="text-[#94a3b8] italic font-sans">AI summary will appear here after generating...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}