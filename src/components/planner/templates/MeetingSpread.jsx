import React, { useState, useRef } from "react";
import { Mic, Square, FileText, Loader2, Sparkles, Trash2, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MeetingSpread({ date, onClearCanvas }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use webm format as it's widely supported for web recording
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      setAudioUrl(null);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Microphone access denied or error occurred.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        try {
          const file = new File([audioBlob], "meeting_audio.webm", { type: "audio/webm" });
          const uploadRes = await base44.integrations.Core.UploadFile({ file });
          
          const text = await base44.integrations.Core.InvokeLLM({
            prompt: "Please transcribe the following audio file. Return only the transcription text.",
            file_urls: [uploadRes.file_url],
            model: "gemini_3_flash"
          });
          
          setTranscription(text);
        } catch (err) {
          console.error("Transcription error", err);
          alert("Failed to transcribe audio.");
        } finally {
          setIsProcessing(false);
          // Stop all tracks
          if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
        }
      };
      
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

      <div className="w-full max-w-5xl bg-white border-2 border-[#cbd5e1] rounded-xl p-8 mb-8 shadow-sm">
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
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-[#F97316] font-medium">
              <Loader2 size={18} className="animate-spin" />
              Processing Audio...
            </div>
          )}

          {audioUrl && !isRecording && !isProcessing && (
            <div className="flex items-center gap-4 mt-2">
              <audio controls src={audioUrl} className="h-10" />
              <a 
                href={audioUrl} 
                download="meeting_recording.webm"
                className="flex items-center gap-2 text-sm font-medium text-[#1e293b] hover:text-[#F97316] bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={16} />
                Download Audio
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Transcription Area */}
        <div className="flex flex-col h-full pointer-events-auto">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-[#1e293b]" />
            <h3 className="text-xl font-serif font-bold text-[#1e293b]">Transcription</h3>
          </div>
          <div className="bg-white border-2 border-[#cbd5e1] rounded-xl p-6 flex-1 min-h-[400px] whitespace-pre-wrap overflow-y-auto">
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
          <div className="bg-white border-2 border-[#cbd5e1] rounded-xl p-6 flex-1 min-h-[400px] whitespace-pre-wrap overflow-y-auto">
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