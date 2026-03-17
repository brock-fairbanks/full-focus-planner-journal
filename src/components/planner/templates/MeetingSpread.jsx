import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, FileText, Loader2, Sparkles, Trash2, Download, History, ChevronLeft, Save, Printer, Upload, Monitor, Pause, Play, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { jsPDF } from "jspdf";
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !highlight.trim()) {
    return <span>{text}</span>;
  }
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? <mark key={i} className="bg-yellow-300 text-black rounded px-0.5">{part}</mark> : <span key={i}>{part}</span>
      )}
    </span>
  );
};

export default function MeetingSpread({ date, onClearCanvas }) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingType, setRecordingType] = useState("meeting");
  const [title, setTitleState] = useState("");
  const titleRef = useRef("");
  const setTitle = (t) => {
    setTitleState(t);
    titleRef.current = t;
  };
  const [isPaused, setIsPaused] = useState(false);
  const manualPauseRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  const [savedNotes, setSavedNotes] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [driveTextFileId, setDriveTextFileId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = savedNotes.filter(note => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (note.title && note.title.toLowerCase().includes(q)) ||
      (note.transcription && note.transcription.toLowerCase().includes(q)) ||
      (note.summary && note.summary.toLowerCase().includes(q))
    );
  });

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
      const currentTrans = newTranscription !== null ? newTranscription : transcription;
      const currentSumm = newSummary !== null ? newSummary : summary;
      if (newTranscription !== null) updateData.transcription = currentTrans;
      if (newSummary !== null) updateData.summary = currentSumm;
      if (newAudioUrl !== null) updateData.audio_url = newAudioUrl;
      
      if (currentNoteId) {
        await base44.entities.MeetingNote.update(currentNoteId, updateData);
        setSavedNotes(prev => prev.map(n => n.id === currentNoteId ? { ...n, ...updateData } : n));
      } else {
        const defaultTitle = `${type === 'lecture' ? 'Lecture' : 'Meeting'} ${format(new Date(), "MM/dd/yyyy h:mm a")}`;
        const finalTitle = titleRef.current || defaultTitle;
        const newNote = await base44.entities.MeetingNote.create({
          date: new Date().toISOString().slice(0, 10),
          title: finalTitle,
          type: type,
          session_id: sessionIdRef.current || `manual-${Date.now()}`,
          ...updateData
        });
        setCurrentNoteId(newNote.id);
        if (!titleRef.current) setTitle(finalTitle);
        setSavedNotes(prev => [newNote, ...prev]);
      }

      if (user?.drive_connected && (newTranscription !== null || newSummary !== null)) {
        let content = `${type === 'lecture' ? 'Lecture' : 'Meeting'} Notes\nDate: ${format(new Date(), "MM/dd/yyyy")}\n\n`;
        if (currentSumm) content += `--- AI SUMMARY ---\n${currentSumm}\n\n`;
        if (currentTrans) content += `--- TRANSCRIPTION ---\n${currentTrans}\n`;
        
        const rType = type === 'lecture' ? 'Lecture' : 'Meeting';
        const dateStr = new Date().toISOString().slice(0,10);
        const sId = sessionIdRef.current || 'manual';
        const fileName = `${rType}_Notes_${dateStr}_ID-${sId}.txt`;
        
        const payload = {
            text_content: content,
            file_name: fileName,
            mime_type: 'text/plain'
        };
        
        // Pass file_id if we already created it in this session to update it
        setDriveTextFileId(prev => {
            if (prev) payload.file_id = prev;
            base44.functions.invoke('uploadToGoogleDrive', payload)
                .then(res => {
                    if (res.data && res.data.fileId && !prev) {
                        setDriveTextFileId(res.data.fileId);
                    }
                })
                .catch(e => console.error("Drive upload failed", e));
            return prev;
        });
      }
    } catch (e) {
      console.error("Failed to save note", e);
    }
  };

  const handleTitleBlur = async () => {
    if (currentNoteId && title) {
      try {
        await base44.entities.MeetingNote.update(currentNoteId, { title });
        setSavedNotes(prev => prev.map(n => n.id === currentNoteId ? { ...n, title } : n));
      } catch (err) {
        console.error("Failed to update title", err);
      }
    }
  };

  const loadNote = (note) => {
    setTranscription(note.transcription || "");
    setSummary(note.summary || "");
    setRecordingType(note.type || "meeting");
    setTitle(note.title || "");
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
    setTitle("");
    setCurrentNoteId(null);
    setDriveTextFileId(null);
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

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setAudioUrl(null);
    setTranscription("");
    setSummary("");
    
    try {
      sessionIdRef.current = Math.random().toString(36).substring(2, 8).toUpperCase();
      const rType = recordingTypeRef.current;
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      
      const dateStr = new Date().toISOString().slice(0,10);
      const sessionId = sessionIdRef.current;
      const extension = file.name.split('.').pop() || 'webm';
      const mimeType = file.type || 'audio/webm';
      
      setAudioUrl({ url: uploadRes.file_url, extension });

      if (user?.drive_connected) {
        const drivePrefix = rType === 'lecture' ? 'Lecture' : 'Meeting';
        const driveFileName = `${drivePrefix}_${dateStr}_ID-${sessionId}_Uploaded.${extension}`;
          
        base44.functions.invoke('uploadToGoogleDrive', {
          file_url: uploadRes.file_url,
          file_name: driveFileName,
          mime_type: mimeType
        }).catch(err => console.error("Drive upload failed", err));
      }

      const text = await base44.integrations.Core.InvokeLLM({
        prompt: `Please transcribe the following ${rType} audio file. Return only the transcription text.`,
        file_urls: [uploadRes.file_url],
        model: "gemini_3_flash"
      });
      
      setTranscription(text);
      saveNote(text, null, uploadRes.file_url);
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to process uploaded file.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (isPausedRef.current) {
      mediaRecorder.pause();
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      manualPauseRef.current = true;
      setIsPaused(true);
    } else if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      manualPauseRef.current = false;
      setIsPaused(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      partNumberRef.current = 1;
      isRecordingRef.current = true;
      manualPauseRef.current = false;
      setIsPaused(false);
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

  const startSystemAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      });
      
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach(t => t.stop());
        alert("No audio selected. Please check 'Share tab audio' in the selection dialog.");
        return;
      }
      
      stream.getVideoTracks().forEach(t => t.stop());
      const audioStream = new MediaStream([stream.getAudioTracks()[0]]);
      
      streamRef.current = audioStream;
      partNumberRef.current = 1;
      isRecordingRef.current = true;
      manualPauseRef.current = false;
      setIsPaused(false);
      sessionIdRef.current = Math.random().toString(36).substring(2, 8).toUpperCase();
      setAudioUrl(null);
      setIsRecording(true);
      
      await requestWakeLock();
      
      startRecorderInstance(audioStream);

      // Auto-pause setup
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart = null;
      let autoPaused = false;

      const checkAudioLevel = () => {
        if (!isRecordingRef.current) {
          audioCtx.close().catch(console.error);
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        if (average < 2) {
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart > 10000 && !autoPaused && !manualPauseRef.current) { 
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.pause();
              autoPaused = true;
              setIsPaused(true);
            }
          }
        } else {
          silenceStart = null;
          if (autoPaused && !manualPauseRef.current) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
              mediaRecorderRef.current.resume();
              autoPaused = false;
              setIsPaused(false);
            }
          }
        }
        
        requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();

    } catch (err) {
      console.error("Failed to start system audio recording", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsProcessing(true);
      setIsRecording(false);
      setIsPaused(false);
      manualPauseRef.current = false;
      mediaRecorderRef.current.stop();
      releaseWakeLock();
    }
  };

  const downloadPdf = (sectionTitle, content) => {
    if (!content) return;
    const doc = new jsPDF();
    const mainTitle = title || (recordingType === 'lecture' ? 'Lecture Notes' : 'Meeting Notes');
    doc.setFontSize(16);
    doc.text(`${mainTitle} - ${sectionTitle}`, 20, 20);
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 30);
    doc.save(`${mainTitle.toLowerCase().replace(/\s+/g, '_')}_${sectionTitle.toLowerCase()}.pdf`);
  };

  const printContent = (sectionTitle, content) => {
    if (!content) return;
    const printWindow = window.open('', '_blank');
    const mainTitle = title || (recordingType === 'lecture' ? 'Lecture Notes' : 'Meeting Notes');
    printWindow.document.write(`
      <html>
        <head>
          <title>${mainTitle} - ${sectionTitle}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
            h1 { margin-bottom: 8px; color: #111; }
            h2 { margin-bottom: 24px; color: #666; font-size: 1.25rem; font-weight: normal; }
            p { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${mainTitle}</h1>
          <h2>${sectionTitle}</h2>
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
      <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-5xl mb-2 relative z-30 pointer-events-auto gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder={recordingType === 'lecture' ? 'Lecture Notes' : 'Meeting Notes'}
          className="text-2xl md:text-3xl font-serif font-bold text-[#1e293b] bg-transparent border-b-2 border-transparent hover:border-[#cbd5e1] focus:border-[#F97316] outline-none placeholder:text-[#94a3b8] w-full sm:max-w-[40%] md:max-w-[50%] transition-colors pb-1 text-center sm:text-left"
        />
        <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0 items-center justify-center w-full sm:w-auto">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white px-3 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm flex-1 sm:flex-none"
          >
            <History size={16} />
            History
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl flex justify-end mb-6 md:mb-8 relative z-30 pointer-events-auto">
        <button 
          onClick={startNew}
          className="flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
          title="Reset page for next setup"
        >
          <Trash2 size={16} />
          <span>Reset Page</span>
        </button>
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
            {filteredNotes.length > 0 ? filteredNotes.map(note => (
              <div 
                key={note.id} 
                onClick={() => loadNote(note)}
                className="p-4 border border-slate-200 rounded-lg hover:border-[#F97316] hover:shadow-md cursor-pointer transition-all bg-slate-50 hover:bg-white"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-slate-500">
                    {note.date ? `${note.date.split('-')[1]}/${note.date.split('-')[2]}/${note.date.split('-')[0]}` : ''}
                  </span>
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

          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 w-full">
            {!isRecording ? (
              <>
                <button 
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="flex justify-center items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 shadow-sm w-full sm:w-auto"
                >
                  <Mic size={20} />
                  Record Mic
                </button>
                <button 
                  onClick={startSystemAudioRecording}
                  disabled={isProcessing}
                  className="flex justify-center items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 shadow-sm w-full sm:w-auto"
                >
                  <Monitor size={20} />
                  Record System Audio
                </button>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={togglePause}
                  className="flex justify-center items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full font-medium transition-all shadow-sm w-full sm:w-auto"
                >
                  {isPaused ? <Play size={20} className="fill-current" /> : <Pause size={20} className="fill-current" />}
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button 
                  onClick={stopRecording}
                  className={`flex justify-center items-center gap-2 bg-[#1e293b] hover:bg-[#0f172a] text-white px-6 py-3 rounded-full font-medium transition-all shadow-sm w-full sm:w-auto ${!isPaused ? 'animate-pulse' : ''}`}
                >
                  <Square size={20} className="fill-current" />
                  Stop Recording
                </button>
              </div>
            )}
            {!isRecording && !transcription && (
              <>
                <input 
                  type="file" 
                  accept="audio/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#1e293b] px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 shadow-sm border border-slate-200 w-full sm:w-auto"
                >
                  <Upload size={20} />
                  Upload Audio
                </button>
              </>
            )}
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-[#F97316] font-medium">
              <Loader2 size={18} className="animate-spin" />
              Processing Audio...
            </div>
          )}

          {audioUrl && !isRecording && !isProcessing && (
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4 w-full justify-center">
              <audio controls src={audioUrl.url} className="h-10 w-full sm:w-auto max-w-[300px]" />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a 
                  href={audioUrl.url} 
                  download={`meeting_recording.${audioUrl.extension}`}
                  className="flex flex-1 sm:flex-none justify-center items-center gap-2 text-sm font-medium text-[#1e293b] hover:text-[#F97316] bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Download</span> (.{audioUrl.extension})
                </a>
                <button
                  onClick={() => {
                    setAudioUrl(null);
                    setTranscription("");
                    setSummary("");
                  }}
                  className="flex flex-1 sm:flex-none justify-center items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl mb-6 relative z-30 pointer-events-auto">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search through all transcriptions and summaries..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 hover:border-[#cbd5e1] rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#F97316] bg-white shadow-sm transition-all"
          />
        </div>
      </div>

      {searchQuery.trim() ? (
        <div className="w-full max-w-5xl flex flex-col gap-6 relative z-30 pointer-events-auto mb-8">
          {filteredNotes.length > 0 ? filteredNotes.map(note => (
            <div key={note.id} className="bg-white border-2 border-[#cbd5e1] rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-serif font-bold text-[#1e293b]">{note.title || "Untitled"}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 capitalize">
                    {note.type}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-500">{note.date}</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <FileText size={16} /> Transcription
                  </h4>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-sm text-[#334155] max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    <HighlightText text={note.transcription || "No transcription"} highlight={searchQuery} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#F97316]" /> AI Summary
                  </h4>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg text-sm text-[#334155] max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    <HighlightText text={note.summary || "No summary"} highlight={searchQuery} />
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="bg-white border-2 border-[#cbd5e1] rounded-xl p-8 text-center text-slate-500 shadow-sm">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      ) : (
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-30 pointer-events-auto">
        {/* Transcription Area */}
        <div className="flex flex-col h-full pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-[#1e293b] shrink-0" />
              <h3 className="text-lg md:text-xl font-serif font-bold text-[#1e293b]">Transcription</h3>
            </div>
            {transcription && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => printContent('Transcription', transcription)}
                  className="p-1.5 sm:p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-slate-100 rounded-md transition-colors"
                  title="Print Transcription"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => downloadPdf('Transcription', transcription)}
                  className="p-1.5 sm:p-2 text-[#64748b] hover:text-[#F97316] hover:bg-orange-50 rounded-md transition-colors"
                  title="Download PDF"
                >
                  <Download size={18} />
                </button>
              </div>
            )}
          </div>
          <div className="bg-white border-2 border-[#cbd5e1] rounded-xl p-6 flex-1 h-[400px] max-h-[50vh] whitespace-pre-wrap overflow-y-auto">
            {transcription ? (
              <span className="text-[#334155] leading-relaxed font-sans">
                <HighlightText text={transcription} highlight={searchQuery} />
              </span>
            ) : (
              <span className="text-[#94a3b8] italic font-sans">Transcription will appear here...</span>
            )}
          </div>
        </div>

        {/* Summary Area */}
        <div className="flex flex-col h-full pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#F97316] shrink-0" />
              <h3 className="text-lg md:text-xl font-serif font-bold text-[#1e293b]">AI Summary</h3>
            </div>
            <div className="flex flex-wrap justify-end items-center gap-1 sm:gap-2">
              {summary && (
                <>
                  <button
                    onClick={() => printContent('AI Summary', summary)}
                    className="p-1.5 sm:p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-slate-100 rounded-md transition-colors"
                    title="Print Summary"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => downloadPdf('AI Summary', summary)}
                    className="p-1.5 sm:p-2 text-[#64748b] hover:text-[#F97316] hover:bg-orange-50 rounded-md transition-colors"
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
                  className="text-xs sm:text-sm font-medium text-white bg-[#F97316] hover:bg-[#ea580c] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                  Generate Summary
                </button>
              )}
            </div>
          </div>
          <div className="bg-white border-2 border-[#cbd5e1] rounded-xl p-6 flex-1 h-[400px] max-h-[50vh] whitespace-pre-wrap overflow-y-auto">
            {summary ? (
              <span className="text-[#334155] leading-relaxed font-sans">
                <HighlightText text={summary} highlight={searchQuery} />
              </span>
            ) : (
              <span className="text-[#94a3b8] italic font-sans">AI summary will appear here after generating...</span>
            )}
          </div>
        </div>
      </div>
      )}
        </>
      )}
    </div>
  );
}