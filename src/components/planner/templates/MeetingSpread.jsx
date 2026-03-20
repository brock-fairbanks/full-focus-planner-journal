import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, FileText, Loader2, Sparkles, Trash2, Download, History, ChevronLeft, Save, Printer, Upload, Monitor, Pause, Play, Search, Volume2 } from "lucide-react";
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
  const [processingStatus, setProcessingStatus] = useState("");
  const [transcription, setTranscription] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingType, setRecordingType] = useState("meeting");
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("planner_meeting_model") || "gemini-3-flash-preview";
  });
  const selectedModelRef = useRef(selectedModel);
  useEffect(() => {
    selectedModelRef.current = selectedModel;
    localStorage.setItem("planner_meeting_model", selectedModel);
  }, [selectedModel]);
  const [title, setTitleState] = useState("");
  const titleRef = useRef("");
  const setTitle = (t) => {
    setTitleState(t);
    titleRef.current = t;
  };
  const [isPaused, setIsPaused] = useState(false);
  const manualPauseRef = useRef(false);
  const isPausedRef = useRef(false);
  const autoPausedRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isRecording) {
      document.title = isPaused ? "⏸ Paused - Planner" : "🔴 Recording - Planner";
    } else {
      document.title = "Planner";
    }
    return () => { document.title = "Planner"; };
  }, [isPaused, isRecording]);
  const [savedNotes, setSavedNotes] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [driveTextFileId, setDriveTextFileId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingSection, setPlayingSection] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef(null);
  const mainAudioRef = useRef(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [preservePitch, setPreservePitch] = useState(true);

  const toggleSpeech = async (text, section) => {
    if (playingSection === section || isLoadingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingSection(null);
      setIsLoadingAudio(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (!text) return;

    try {
      setIsLoadingAudio(true);
      setPlayingSection(section);
      
      const response = await base44.functions.invoke('generateSpeech', { text, voice: 'onyx' });
      
      const audioUrl = `data:audio/mp3;base64,${response.data.audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingSection(null);
      };
      audio.onerror = () => {
        setPlayingSection(null);
        setIsLoadingAudio(false);
      };
      
      await audio.play();
      setIsLoadingAudio(false);
    } catch (error) {
      console.error("Audio generation failed:", error);
      setPlayingSection(null);
      setIsLoadingAudio(false);
      alert("Failed to generate speech. The text might be too long.");
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

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
        const fileName = `${titleRef.current || rType}_Notes_${dateStr}_ID-${sId}.txt`;
        
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

  const deleteNote = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this recording?")) return;
    try {
      await base44.entities.MeetingNote.delete(id);
      setSavedNotes(prev => prev.filter(n => n.id !== id));
      if (currentNoteId === id) {
        startNew();
      }
    } catch (err) {
      console.error("Failed to delete note", err);
      alert("Failed to delete note.");
    }
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
    if (isFinal) {
      setIsProcessing(true);
      setProcessingStatus("Uploading recording to server...");
    }
    let uploadedFileUrl = null;
    try {
      const dateStr = new Date().toISOString().slice(0,10);
      const sessionId = sessionIdRef.current || 'unknown';
      const rType = recordingTypeRef.current;
      const safeTitle = titleRef.current ? titleRef.current.replace(/[^a-zA-Z0-9-_]/g, '_') : (rType === 'lecture' ? 'lecture' : 'meeting');

      // Clean extension to avoid invalid file types
      const cleanExtension = extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'webm';
      const fileName = `${safeTitle}_${dateStr}_${sessionId}_part${partNum}.${cleanExtension}`;

      const file = new File([audioBlob], fileName, { type: mimeType });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      uploadedFileUrl = uploadRes.file_url;

      if (user?.drive_connected) {
        const drivePrefix = titleRef.current || (rType === 'lecture' ? 'Lecture' : 'Meeting');
        const driveFileName = `${drivePrefix}_${dateStr}_ID-${sessionId}_Part${partNum}.${extension}`;

        if (isFinal) setProcessingStatus("Backing up to Google Drive...");
        base44.functions.invoke('uploadToGoogleDrive', {
          file_url: uploadedFileUrl,
          file_name: driveFileName,
          mime_type: mimeType
        }).catch(e => console.error("Drive upload failed", e));
      }

      // Save the note immediately to preserve the audio file if the transcribe call fails
      if (isFinal) {
        await saveNote(null, null, uploadedFileUrl);
        setProcessingStatus("Sending to Gemini for transcription...");
      }

      const startRes = await base44.functions.invoke('processMeetingWithGemini', {
        action: 'transcribe_start',
        fileUrl: uploadedFileUrl,
        mimeType: mimeType
      });
      
      if (startRes.data.error) throw new Error(startRes.data.error);
      
      if (isFinal) setProcessingStatus("Gemini is processing the audio...");
      let isCompleted = false;
      let text = "";
      
      const prompt = rType === 'lecture' 
        ? "Please transcribe this lecture accurately. Exclude any advertisements or sponsored content."
        : "Please transcribe this meeting accurately. Exclude any advertisements or sponsored content.";

      while (!isCompleted) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await base44.functions.invoke('processMeetingWithGemini', {
          action: 'transcribe_poll',
          fileName: startRes.data.fileName,
          fileUri: startRes.data.fileUri,
          prompt,
          mimeType: mimeType,
          model: selectedModelRef.current || 'gemini-3-flash-preview'
        });
        
        if (pollRes.data.error) throw new Error(pollRes.data.error);
        if (pollRes.data.status === 'completed') {
          text = pollRes.data.text;
          isCompleted = true;
        } else if (pollRes.data.status === 'failed') {
          throw new Error("Gemini failed to process the file");
        }
      }

      if (isFinal) setProcessingStatus("Saving...");
      setTranscription(prev => {
        const newText = prev ? prev + "\n\n" + text : text;
        saveNote(newText, null, uploadedFileUrl);
        return newText;
      });
    } catch (err) {
      console.error("Transcription error", err);
      if (isFinal) alert("Failed to transcribe audio. The audio file has been saved, so you can try transcribing it again later.");
    } finally {
      if (isFinal) {
        setIsProcessing(false);
        setProcessingStatus("");
      }
    }
  };

  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is too large for standard web uploads
    const MAX_FILE_SIZE = 95 * 1024 * 1024; // 95MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = Math.round(file.size / (1024 * 1024));
      alert(`This file is too large (${sizeMB} MB). Web uploads are limited to ~95 MB. Please compress it slightly before uploading.`);
      if (e.target) e.target.value = '';
      return;
    }

    if (!title) {
      setTitle(file.name.split('.')[0] || "Uploaded Audio");
    }
    setPendingFile(file);
    if (e.target) e.target.value = '';
  };

  const confirmFileUpload = async () => {
    const file = pendingFile;
    if (!file) return;
    
    setPendingFile(null);
    setIsProcessing(true);
    setProcessingStatus(`Uploading ${file.name} to server...`);
    setAudioUrl(null);
    setTranscription("");
    setSummary("");
    
    let uploadedFileUrl = null;
    try {
      sessionIdRef.current = Math.random().toString(36).substring(2, 8).toUpperCase();
      const rType = recordingTypeRef.current;
      
      // Clean extension to avoid invalid file types
      const fileExt = file.name.split('.').pop() || 'webm';
      const cleanExtension = fileExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      // Recreate file with clean name if needed to avoid upload errors
      const safeFile = new File([file], `upload.${cleanExtension}`, { type: file.type || 'audio/webm' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file: safeFile });
      uploadedFileUrl = uploadRes.file_url;
      
      const dateStr = new Date().toISOString().slice(0,10);
      const sessionId = sessionIdRef.current;
      const extension = cleanExtension;
      const mimeType = file.type || 'audio/webm';
      
      setAudioUrl({ url: uploadedFileUrl, extension });
      // Save just the URL first so we don't lose it if transcription fails
      await saveNote(null, null, uploadedFileUrl);

      if (user?.drive_connected) {
        const drivePrefix = titleRef.current || (rType === 'lecture' ? 'Lecture' : rType === 'dialog' ? 'Dialog' : 'Meeting');
        const driveFileName = `${drivePrefix}_${dateStr}_ID-${sessionId}_Uploaded.${extension}`;
          
        setProcessingStatus("Backing up file to Google Drive...");
        base44.functions.invoke('uploadToGoogleDrive', {
          file_url: uploadedFileUrl,
          file_name: driveFileName,
          mime_type: mimeType
        }).catch(err => console.error("Drive upload failed", err));
      }

      setProcessingStatus("Sending to Gemini for transcription (this handles massive files)...");
      const startRes = await base44.functions.invoke('processMeetingWithGemini', {
        action: 'transcribe_start',
        fileUrl: uploadedFileUrl,
        mimeType: mimeType
      });
      
      if (startRes.data.error) throw new Error(startRes.data.error);
      const { fileName: geminiFileName, fileUri: geminiFileUri } = startRes.data;

      setProcessingStatus("Gemini is processing the long audio (can take a few minutes)...");
      let isCompleted = false;
      let finalTranscription = "";
      
      const prompt = rType === 'lecture' 
        ? "Please transcribe this lecture accurately. Exclude any advertisements or sponsored content."
        : "Please transcribe this meeting accurately. Exclude any advertisements or sponsored content.";

      while (!isCompleted) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await base44.functions.invoke('processMeetingWithGemini', {
          action: 'transcribe_poll',
          fileName: geminiFileName,
          fileUri: geminiFileUri,
          prompt,
          mimeType: mimeType,
          model: selectedModelRef.current || 'gemini-3-flash-preview'
        });
        
        if (pollRes.data.error) throw new Error(pollRes.data.error);
        if (pollRes.data.status === 'completed') {
          finalTranscription = pollRes.data.text;
          isCompleted = true;
        } else if (pollRes.data.status === 'failed') {
          throw new Error("Gemini failed to process the file");
        }
      }
      
      setProcessingStatus("Saving...");
      setTranscription(finalTranscription);
      saveNote(finalTranscription, null, uploadedFileUrl);
    } catch (err) {
      if (uploadedFileUrl) {
        saveNote(null, null, uploadedFileUrl);
      }
      console.error("Upload error", err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to process uploaded file. Error: ${errorMsg}\n\nIt might be too large for the current network connection or timeout limits.`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const startRecorderInstance = (stream) => {
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/mp3')) {
      mimeType = 'audio/mp3';
    }
    
    // Use a lower bitrate (32kbps) to ensure long lectures don't exceed upload limits without needing to chunk
    const options = { mimeType, audioBitsPerSecond: 32000 };
    const mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorderRef.current = mediaRecorder;

    const localChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        localChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const actualMimeType = mediaRecorder.mimeType || mimeType;
      // Make sure we have a clean extension without extra parameters
      const extensionMatch = actualMimeType.match(/\/(.*?)(;|$)/);
      const extension = extensionMatch ? extensionMatch[1] : 'webm';

      const audioBlob = new Blob(localChunks, { type: actualMimeType });

      const url = URL.createObjectURL(audioBlob);
      setAudioUrl({ url, extension });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      processChunk(audioBlob, 1, actualMimeType, extension, true);
    };

    // Start without timeslice to prevent missing/wrong duration metadata in MP4/WebM
    mediaRecorder.start();
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
      autoPausedRef.current = false;
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
      const getDisplayMedia = navigator.mediaDevices?.getDisplayMedia || navigator.getDisplayMedia;
      
      if (!getDisplayMedia) {
         alert("Your browser does not support system audio recording (getDisplayMedia API is missing). Try using the 'Record Mic' option instead.");
         return;
      }

      const stream = await getDisplayMedia.call(navigator.mediaDevices || navigator, { 
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
      autoPausedRef.current = false;

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
          else if (Date.now() - silenceStart > 10000 && !autoPausedRef.current && !manualPauseRef.current) { 
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.pause();
              autoPausedRef.current = true;
              setIsPaused(true);
            }
          }
        } else {
          silenceStart = null;
          if (autoPausedRef.current && !manualPauseRef.current) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
              mediaRecorderRef.current.resume();
              autoPausedRef.current = false;
              setIsPaused(false);
            }
          }
        }
        
        requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();

    } catch (err) {
      console.error("Failed to start system audio recording", err);
      alert("Could not start system audio recording. Permission was denied or the feature is not supported by your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      if (!titleRef.current) {
        const defaultName = recordingTypeRef.current === 'lecture' ? 'Lecture Notes' : 'Meeting Notes';
        const userInput = window.prompt("Please name this recording before saving:", defaultName);
        if (userInput !== null && userInput.trim() !== "") {
          setTitle(userInput.trim());
          if (currentNoteId) {
            base44.entities.MeetingNote.update(currentNoteId, { title: userInput.trim() }).catch(console.error);
            setSavedNotes(prev => prev.map(n => n.id === currentNoteId ? { ...n, title: userInput.trim() } : n));
          }
        }
      }

      isRecordingRef.current = false;
      setIsProcessing(true);
      setIsRecording(false);
      setIsPaused(false);
      manualPauseRef.current = false;
      mediaRecorderRef.current.stop();
      releaseWakeLock();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      if (!window.confirm("Are you sure you want to cancel? This recording will not be saved.")) return;
      
      // Prevent the onstop handler from processing the chunk
      mediaRecorderRef.current.onstop = null;
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      mediaRecorderRef.current.stop();
      
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsPaused(false);
      manualPauseRef.current = false;
      releaseWakeLock();
      
      startNew(); // Reset the UI state
    }
  };

  const downloadPdf = (sectionTitle, content) => {
    if (!content) return;
    const doc = new jsPDF();
    const mainTitle = title || (recordingType === 'lecture' ? 'Lecture Notes' : 'Meeting Notes');
    doc.setFontSize(18);
    doc.text(`${mainTitle} - ${sectionTitle}`, 20, 20);
    doc.setFontSize(11);
    
    // Clean up markdown bold/italics for basic PDF text
    const cleanContent = content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    const lines = cleanContent.split('\n');
    
    let y = 35;
    const pageHeight = doc.internal.pageSize.height;
    
    for (const line of lines) {
      if (line.trim() === '') {
         y += 6;
         continue;
      }
      
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const textToPrint = isBullet ? `• ${line.trim().substring(2)}` : line;
      const xOffset = isBullet ? 25 : 20; // Indent bullets
      const maxWidth = isBullet ? 160 : 170;
      
      const splitText = doc.splitTextToSize(textToPrint, maxWidth);
      
      for (let i = 0; i < splitText.length; i++) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        // If it's a multiline bullet point, indent the subsequent lines too
        doc.text(splitText[i], i === 0 ? xOffset : xOffset + 4, y);
        y += 6;
      }
      y += 4; // Extra space after paragraphs/bullets
    }
    
    doc.save(`${mainTitle.toLowerCase().replace(/\s+/g, '_')}_${sectionTitle.toLowerCase()}.pdf`);
  };

  const printContent = (sectionTitle, content) => {
    if (!content) return;
    const printWindow = window.open('', '_blank');
    const mainTitle = title || (recordingType === 'lecture' ? 'Lecture Notes' : 'Meeting Notes');
    
    // Convert basic markdown to HTML
    let inList = false;
    const htmlLines = content.split('\n').map(line => {
      let formattedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
      if (formattedLine.trim().startsWith('- ') || formattedLine.trim().startsWith('* ')) {
        const item = `<li style="margin-bottom: 8px;">${formattedLine.trim().substring(2)}</li>`;
        if (!inList) {
          inList = true;
          return `<ul style="margin-left: 20px; margin-bottom: 1.5em;">${item}`;
        }
        return item;
      } else {
        let prefix = '';
        if (inList) {
          inList = false;
          prefix = '</ul>';
        }
        return formattedLine.trim() ? `${prefix}<p>${formattedLine}</p>` : `${prefix}<br/>`;
      }
    });
    if (inList) htmlLines.push('</ul>');
    
    const htmlContent = htmlLines.join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${mainTitle} - ${sectionTitle}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; font-size: 1.1rem; }
            h1 { margin-bottom: 8px; color: #111; }
            h2 { margin-bottom: 24px; color: #666; font-size: 1.25rem; font-weight: normal; }
            p { margin-bottom: 1.5em; }
            ul { padding-left: 20px; }
            li { line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>${mainTitle}</h1>
          <h2>${sectionTitle}</h2>
          ${htmlContent}
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
    setProcessingStatus("Generating AI Summary...");
    try {
      const prompt = recordingType === 'lecture' 
        ? `Please provide a highly detailed, in-depth summary of the following lecture transcription. Include key concepts, comprehensive explanations, important examples or case studies, and a structured outline of the topics covered:\n\n${transcription}`
        : `Please summarize the following meeting transcription concisely, highlighting the main points, decisions, and action items:\n\n${transcription}`;

      const res = await base44.functions.invoke('processMeetingWithGemini', {
        action: 'summarize',
        transcription,
        recordingType,
        model: selectedModel
      });
      const result = res.data.text;
      setSummary(result);
      saveNote(null, result);
    } catch (err) {
      console.error("Summary error", err);
      alert("Failed to generate summary. The text might be too long.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleRetranscribe = async () => {
    if (!audioUrl) return;
    setIsProcessing(true);
    setProcessingStatus("Transcribing audio with AI...");
    try {
      let fileUrlToUse = audioUrl.url;
      const mimeType = audioUrl.extension ? (audioUrl.extension === 'mp3' ? 'audio/mp3' : audioUrl.extension === 'mp4' ? 'audio/mp4' : 'audio/webm') : 'audio/webm';
      
      if (fileUrlToUse.startsWith('blob:')) {
        setProcessingStatus("Uploading audio...");
        const response = await fetch(fileUrlToUse);
        const blob = await response.blob();
        
        // Clean extension to avoid invalid file types
        const cleanExtension = (audioUrl.extension || 'webm').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        
        const file = new File([blob], `recording.${cleanExtension}`, { type: mimeType });
        const uploadRes = await base44.integrations.Core.UploadFile({ file });
        fileUrlToUse = uploadRes.file_url;
        
        // Save the note with the new URL right after uploading just to be safe
        await saveNote(null, null, fileUrlToUse);
      }
      
      setProcessingStatus("Sending to Gemini for transcription...");
      const startRes = await base44.functions.invoke('processMeetingWithGemini', {
        action: 'transcribe_start',
        fileUrl: fileUrlToUse,
        mimeType: mimeType
      });
      
      if (startRes.data && startRes.data.error) throw new Error(startRes.data.error);
      const { fileName: geminiFileName, fileUri: geminiFileUri } = startRes.data;

      setProcessingStatus("Gemini is processing the audio...");
      let isCompleted = false;
      let finalTranscription = "";
      const rType = recordingTypeRef.current;
      
      const prompt = rType === 'lecture' 
        ? "Please transcribe this lecture accurately. Exclude any advertisements or sponsored content."
        : "Please transcribe this meeting accurately. Exclude any advertisements or sponsored content.";

      while (!isCompleted) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await base44.functions.invoke('processMeetingWithGemini', {
          action: 'transcribe_poll',
          fileName: geminiFileName,
          fileUri: geminiFileUri,
          prompt,
          mimeType: mimeType,
          model: selectedModelRef.current || 'gemini-3-flash-preview'
        });
        
        if (pollRes.data && pollRes.data.error) throw new Error(pollRes.data.error);
        if (pollRes.data.status === 'completed') {
          finalTranscription = pollRes.data.text;
          isCompleted = true;
        } else if (pollRes.data.status === 'failed') {
          throw new Error("Gemini failed to process the file");
        }
      }
      
      setTranscription(finalTranscription);
      saveNote(finalTranscription, null, fileUrlToUse);
    } catch (err) {
      console.error("Retranscription error", err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to retranscribe audio. Error: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
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
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
          >
            <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
            <option value="gemini-3.1-pro-preview">Gemini 3 Pro</option>
          </select>
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

      {!showHistory && audioUrl && !isRecording && !isProcessing && (
        <div className="w-full max-w-5xl bg-white border-2 border-[#cbd5e1] rounded-xl p-4 mb-6 shadow-sm relative z-30 pointer-events-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-[#1e293b] p-2 rounded-lg text-white shrink-0">
              <Mic size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-[#1e293b] truncate">Recording Audio</span>
            </div>
          </div>
          <audio 
            ref={mainAudioRef}
            controls 
            src={audioUrl.url} 
            className="h-10 w-full md:flex-1 max-w-xl" 
            onLoadedData={(e) => { 
              e.target.playbackRate = playbackSpeed; 
              e.target.preservesPitch = preservePitch;
              if ('webkitPreservesPitch' in e.target) e.target.webkitPreservesPitch = preservePitch;
            }}
            onRateChange={(e) => { if (e.target.playbackRate !== playbackSpeed) setPlaybackSpeed(e.target.playbackRate); }}
          />
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                const newVal = !preservePitch;
                setPreservePitch(newVal);
                if (mainAudioRef.current) {
                  mainAudioRef.current.preservesPitch = newVal;
                  if ('webkitPreservesPitch' in mainAudioRef.current) mainAudioRef.current.webkitPreservesPitch = newVal;
                }
              }}
              className={`text-xs px-2 py-2 rounded-lg font-medium transition-colors border ${preservePitch ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white text-slate-600 border-slate-300'}`}
              title="Toggle Pitch Preservation"
            >
              Pitch: {preservePitch ? 'On' : 'Off'}
            </button>
            <select
              value={playbackSpeed}
              onChange={(e) => {
                const speed = parseFloat(e.target.value);
                setPlaybackSpeed(speed);
                if (mainAudioRef.current) mainAudioRef.current.playbackRate = speed;
              }}
              className="bg-slate-100 hover:bg-slate-200 border border-transparent text-[#1e293b] text-sm rounded-lg px-2 py-2 focus:outline-none transition-colors font-medium cursor-pointer flex-shrink-0"
              title="Playback Speed"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="4">4x</option>
            </select>
            <button 
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const response = await fetch(audioUrl.url);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = blobUrl;
                  const safeTitle = title ? title.replace(/[^a-zA-Z0-9-_]/g, '_') : 'meeting_recording';
                  a.download = `${safeTitle}.${audioUrl.extension}`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(a);
                } catch (err) {
                  console.error('Download failed:', err);
                  window.open(audioUrl.url, '_blank');
                }
              }}
              className="flex justify-center items-center gap-2 text-sm font-medium text-[#1e293b] hover:text-[#F97316] bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download</span> (.{audioUrl.extension})
            </button>
          </div>
        </div>
      )}

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
                className="relative p-4 border border-slate-200 rounded-lg hover:border-[#F97316] hover:shadow-md cursor-pointer transition-all bg-slate-50 hover:bg-white group"
              >
                <button
                  onClick={(e) => deleteNote(note.id, e)}
                  className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 md:group-hover:opacity-100 transition-all z-10"
                  style={{ opacity: window.innerWidth < 768 ? 1 : undefined }}
                  title="Delete Recording"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex justify-between items-start mb-2 pr-6">
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
            <div className="flex flex-wrap justify-center bg-slate-100 p-1 rounded-lg gap-1">
              <button
                onClick={() => handleTypeChange('meeting')}
                title="Shorter, action-focused summary tailored for meetings and decisions"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recordingType === 'meeting' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'}`}
              >
                Meeting
              </button>
              <button
                onClick={() => handleTypeChange('lecture')}
                title="Detailed, comprehensive summary tailored for educational lectures and concepts"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recordingType === 'lecture' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'}`}
              >
                Lecture
              </button>
              <button
                onClick={() => handleTypeChange('dialog')}
                title="Summary focusing on topics, conversation flow, and key takeaways"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recordingType === 'dialog' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-[#64748b] hover:text-[#1e293b]'}`}
              >
                Dialog
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 w-full">
            {!isRecording ? (
              <>
                <button 
                  onClick={startRecording}
                  disabled={isProcessing}
                  title="Record audio from your computer's microphone"
                  className="flex justify-center items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 shadow-sm w-full sm:w-auto"
                >
                  <Mic size={20} />
                  Record Mic
                </button>
                <button 
                  onClick={startSystemAudioRecording}
                  disabled={isProcessing}
                  title="Record audio directly from your computer speakers or a specific browser tab"
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
                  className={`flex justify-center items-center gap-2 text-white px-6 py-3 rounded-full font-medium transition-all shadow-sm w-full sm:w-auto ${!isPaused ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-[#1e293b] hover:bg-[#0f172a]'}`}
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
                  accept="*/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title="Upload an existing audio file (MP3, MP4, WAV, M4A, WEBM) for transcription"
                  className="flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#1e293b] px-6 py-3 rounded-full font-medium transition-all disabled:opacity-50 shadow-sm border border-slate-200 w-full sm:w-auto"
                >
                  <Upload size={20} />
                  Upload Audio
                </button>
              </>
            )}
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-[#F97316] font-medium text-center">
              <Loader2 size={18} className="animate-spin shrink-0" />
              <span>{processingStatus || "Processing Audio..."}</span>
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
            {(transcription || audioUrl) && !isRecording && (
              <div className="flex items-center gap-1 sm:gap-2">
                {audioUrl && (
                  <button
                    onClick={handleRetranscribe}
                    disabled={isProcessing}
                    className="text-xs sm:text-sm font-medium text-[#1e293b] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap flex items-center gap-1.5"
                    title="Transcribe Audio"
                  >
                    <Sparkles size={14} />
                    {transcription ? "Retranscribe" : "Transcribe"}
                  </button>
                )}
                {transcription && (
                  <>
                    <button
                      onClick={() => toggleSpeech(transcription, 'transcription')}
                      className="p-1.5 sm:p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-slate-100 rounded-md transition-colors"
                      title={playingSection === 'transcription' ? "Stop Reading" : "Read Aloud"}
                    >
                      {isLoadingAudio && playingSection === 'transcription' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : playingSection === 'transcription' ? (
                        <Square size={18} className="fill-current text-[#F97316]" />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
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
                  </>
                )}
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
                    onClick={() => toggleSpeech(summary, 'summary')}
                    className="p-1.5 sm:p-2 text-[#64748b] hover:text-[#1e293b] hover:bg-slate-100 rounded-md transition-colors"
                    title={playingSection === 'summary' ? "Stop Reading" : "Read Aloud"}
                  >
                    {isLoadingAudio && playingSection === 'summary' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : playingSection === 'summary' ? (
                      <Square size={18} className="fill-current text-[#F97316]" />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>
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

      {/* File Upload Confirmation Modal */}
      {pendingFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-[#1e293b] mb-4">Upload Audio</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 truncate">
                {pendingFile.name}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Recording Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this recording a name..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                autoFocus
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Recording Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleTypeChange('meeting')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${recordingType === 'meeting' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  Meeting
                </button>
                <button
                  onClick={() => handleTypeChange('lecture')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${recordingType === 'lecture' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  Lecture
                </button>
                <button
                  onClick={() => handleTypeChange('dialog')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${recordingType === 'dialog' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  Dialog
                </button>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingFile(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmFileUpload}
                className="px-4 py-2 text-sm font-medium text-white bg-[#F97316] hover:bg-[#ea580c] rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <Upload size={16} />
                Start Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}