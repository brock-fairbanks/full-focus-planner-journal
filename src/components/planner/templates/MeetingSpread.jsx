import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, FileText, Loader2, Sparkles, Trash2, Download, History, ChevronLeft, Save, Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { jsPDF } from "jspdf";
import { useAuth } from '@/lib/AuthContext';

export default function MeetingSpread({ date, onClearCanvas }) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingType, setRecordingType] = useState("meeting");
  const [savedNotes, setSavedNotes] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const notes = await base44.entities.MeetingNote.list("-created_date", 50);
      setSavedNotes(notes);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const saveNote = async (newTranscription, newSummary, newAudioUrl = null) => {
    if (!newTranscription && !newSummary && !newAudioUrl) return;
    try {
      const type = recordingTypeRef.current;
      const updateData = {};
      if (newTranscription !== null) updateData.transcription = newTranscription || transcription;
      if (newSummary !== null) updateData.summary = newSummary || summary;
      if (newAudioUrl !== null) updateData.audio_url = newAudioUrl;
      
      if (currentNoteId) {
        await base44.entities.MeetingNote.update(currentNoteId, updateData);
        setSavedNotes(prev => prev.map(n => n.id === currentNoteId ? { ...n, ...updateData } : n));
      } else {
        const title = `${type === 'lecture' ? 'Lecture' : 'Meeting'} ${new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
        const newNote = await base44.entities.MeetingNote.create({
          date: new Date().toISOString().slice(0, 10),
          title: title,
          type: type,
          session_id: sessionIdRef.current || `manual-${Date.now()}`,
          ...updateData
        });
        setCurrentNoteId(newNote.id);
        setSavedNotes(prev => [newNote, ...prev]);
      }
    } catch (e) {
      console.error("Failed to save note", e);
    }
  };

  const loadNote = (note) => {
    setTranscription(note.transcription || "");
    setSummary(note.summary || "");
    setRecordingType(note.type || "meeting");
    recordingTypeRef.current = note.type || "meeting";
    setCurrentNoteId(note.id);
    sessionIdRef.current = note.session_id;
    if (note.audio_url) {
      const ext = note.audio_url.split('.').pop()?.split('?')[0] || 'webm';
      setAudioUrl({ url: note.audio_url, extension: ext });
    } else {
      setAudioUrl(null);
    }
    setShowHistory(false);
  };

  const startNew = () => {
    setTranscription("");
    setSummary("");
    setCurrentNoteId(null);
    sessionIdRef.current = null;
    setAudioUrl(null);
  };
  
  const recordingTypeRef = useRef("meeting");
  const mediaRecorderRef = useRef(null);

  const handleTypeChange = (type) => {
    setRecordingType(type);
    recordingTypeRef.current = type;
  };
  const partNumberRef = useRef(1);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(false);
  const sessionIdRef = useRef(null);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
      }
    };
  }, []);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.error("Wake Lock error:", err);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.error("Wake Lock release error:", err);
    }
  };

  const processChunk = async (audioBlob, partNum, mimeType, extension, isFinal) => {
    if (isFinal) setIsProcessing(true);
    try {
      const dateStr = new Date().toISOString().slice(0,10);
      const sessionId = sessionIdRef.current || 'unknown';
      const rType = recordingTypeRef.current;
      const prefix = rType === 'lecture' ? 'lecture' : 'meeting';
      const fileName = `${prefix}_${dateStr}_${sessionId}_part${partNum}.${extension}`;
      const file = new File([audioBlob], fileName, { type: mimeType });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      
      if (user?.drive_connected) {
        const drivePrefix = rType === 'lecture' ? 'Lecture' : 'Meeting';
        const driveFileName = `${drivePrefix}_${dateStr}_ID-${sessionId}_Part${partNum}.${extension}`;
          
        base44.functions.invoke('uploadToGoogleDrive', {
          file_url: uploadRes.file_url,
          file_name: driveFileName,
          mime_type: mimeType
        }).catch(e => console.error("Drive upload failed", e));
      }
      
      const text = await base44.integrations.Core.InvokeLLM({
        prompt: `Please transcribe the following ${rType} audio file. Return only the transcription text. If this is a continuation, just transcribe what you hear without comments.`,
        file_urls: [uploadRes.file_url],
        model: "gemini_3_flash"
      });
      
      setTranscription(prev => {
        const newText = prev ? prev + "\n\n" + text : text;
        saveNote(newText, null, uploadRes.file_url);
        return newText;
      });
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
      
      await requestWakeLock();
      
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
      releaseWakeLock();
    }
  };

  const downloadPdf = (title, content) => {
    if (!content) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 30);
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const printContent = (title, content) => {
    if (!content) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
            h1 { margin-bottom: 24px; color: #111; }
            p { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>${content}</p>
          <script>
            window.onload = () => { 
              setTimeout(() => { window.print(); window.close(); }, 250);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateSummary = async () => {
    if (!transcription) return;
    setIsProcessing(true);
    try {
      const prompt = recordingType === 'lecture' 
        ? `Please provide a highly detailed, in-depth summary of the following lecture transcription. Include key concepts, comprehensive explanations, important examples or case studies, and a structured outline of the topics covered:\n\n${transcription}`
        : `Please summarize the following meeting transcription concisely, highlighting the main points, decisions, and action items:\n\n${transcription}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "gemini_3_flash"
      });
      setSummary(result);
      saveNote(null, result);
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

      <div className="flex justify-between items-center w-full max-w-5xl mb-8 relative z-30 pointer-events-auto">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b]">
          {recordingType === 'lecture' ? 'Lecture Notes' : 'Meeting Notes'}
        </h1>
        <div className="flex gap-2">
          {(transcription || summary) && (
            <button 
              onClick={startNew}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#1e293b] px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              Start New
            </button>
          )}
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <History size={18} />
            History
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="w-full max-w-5xl bg-white border-2 border-[#cbd5e1] rounded-xl p-8 mb-8 shadow-sm relative z-30 pointer-events-auto">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 rounded-md text-[#64748b]">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-[#1e293b]">Past Recordings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedNotes.length > 0 ? savedNotes.map(note => (
              <div 
                key={note.id} 
                onClick={() => loadNote(note)}
                className="p-4 border border-slate-200 rounded-lg hover:border-[#F97316] hover:shadow-md cursor-pointer transition-all bg-slate-50 hover:bg-white"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-slate-500">{note.date}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">
                    {note.type}
                  </span>
                </div>
                <h3 className="font-medium text-[#1e293b] mb-2 truncate" title={note.title}>{note.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-3">
                  {note.summary || note.transcription || "No content"}
                </p>
              </div>
            )) : (
              <div className="col-span-full text-center py-8 text-[#94a3b8]">
                No saved recordings found.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="w-full max-w-5xl bg-white border-2 border-[#cbd5e1] rounded-xl p-8 mb-8 shadow-sm relative z-30 pointer-events-auto">
            <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1e293b] mb-2">Record Audio</h2>
            <p className="text-[#64748b] text-sm">Record your audio, and AI will transcribe it for you.</p>
          </div>

          {!isRecording && !transcription && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleTypeChange('meeting')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recordingType === 'meeting' ? 'bg-white text-[#1e293b] shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'}`}
              >
                Meeting
              </button>
              <button
                onClick={() => handleTypeChange('lecture')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recordingType === 'lecture' ? 'bg-white text-[#1e293b] shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'}`}
              >
                Lecture
              </button>
            </div>
          )}

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-[#1e293b]" />
              <h3 className="text-xl font-serif font-bold text-[#1e293b]">Transcription</h3>
            </div>
            {transcription && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printContent('Transcription', transcription)}
                  className="p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-slate-100 rounded-md transition-colors"
                  title="Print Transcription"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => downloadPdf('Transcription', transcription)}
                  className="p-2 text-[#64748b] hover:text-[#F97316] hover:bg-orange-50 rounded-md transition-colors"
                  title="Download PDF"
                >
                  <Download size={18} />
                </button>
              </div>
            )}
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
            <div className="flex items-center gap-2">
              {summary && (
                <>
                  <button
                    onClick={() => printContent('AI Summary', summary)}
                    className="p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-slate-100 rounded-md transition-colors"
                    title="Print Summary"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => downloadPdf('AI Summary', summary)}
                    className="p-2 text-[#64748b] hover:text-[#F97316] hover:bg-orange-50 rounded-md transition-colors"
                    title="Download PDF"
                  >
                    <Download size={18} />
                  </button>
                </>
              )}
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
        </>
      )}
    </div>
  );
}