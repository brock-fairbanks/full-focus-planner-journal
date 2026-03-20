import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Save, Check, History, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ScratchpadSpread({ date, onSubSectionChange, onClearCanvas }) {
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [title, setTitle] = useState("");
    const [background, setBackground] = useState("none");
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const titleInputRef = useRef(null);
    const [portalTarget, setPortalTarget] = useState(null);

    useEffect(() => {
        loadNotes();
        setPortalTarget(document.getElementById("topbar-center-portal"));
    }, []);

    const loadNotes = async () => {
        try {
            const data = await base44.entities.ScratchpadNote.list();
            const sortedData = data.sort((a, b) => b.updated_at - a.updated_at);
            setNotes(sortedData);
            if (sortedData.length > 0) {
                selectNote(sortedData[0]);
            } else {
                createNewNote();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const selectNote = (note) => {
        setActiveNoteId(note.id);
        setTitle(note.title);
        setBackground(note.background || "none");
        setLastSaved(note.updated_at);
        onSubSectionChange(note.id);
        setShowHistory(false);
    };

    const createNewNote = async () => {
        try {
            const newNote = {
                title: "",
                page_key: `scratch_${Date.now()}`,
                background: "none",
                created_at: Date.now(),
                updated_at: Date.now()
            };
            const created = await base44.entities.ScratchpadNote.create(newNote);
            setNotes(prev => [created, ...prev]);
            selectNote(created);
            
            // Focus title after creation
            setTimeout(() => {
                if (titleInputRef.current) {
                    titleInputRef.current.focus();
                    titleInputRef.current.select();
                }
            }, 100);
        } catch (error) {
            console.error(error);
        }
    };

    const saveNote = async () => {
        if (!activeNoteId) return;
        setIsSaving(true);
        try {
            const updated = await base44.entities.ScratchpadNote.update(activeNoteId, {
                title,
                background,
                updated_at: Date.now()
            });
            setNotes(prev => prev.map(n => n.id === activeNoteId ? updated : n));
            setLastSaved(updated.updated_at);
            setTimeout(() => setIsSaving(false), 1000);
        } catch (error) {
            console.error(error);
            setIsSaving(false);
        }
    };

    const deleteNote = async (id) => {
        if (confirm("Delete this note?")) {
            await base44.entities.ScratchpadNote.delete(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            if (activeNoteId === id) {
                const remaining = notes.filter(n => n.id !== id);
                if (remaining.length > 0) selectNote(remaining[0]);
                else createNewNote();
            }
        }
    };

    // Auto-save when typing/changing backgrounds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeNoteId && notes.length > 0) {
                const note = notes.find(n => n.id === activeNoteId);
                if (note && (note.title !== title || note.background !== background)) {
                    saveNote();
                }
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [title, background, activeNoteId]);

    const getBgStyle = () => {
        switch (background) {
            case "lined-narrow":
                return { backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #93c5fd 31px, #93c5fd 32px)", backgroundSize: "100% 32px", backgroundAttachment: "local" };
            case "lined-wide":
                return { backgroundImage: "repeating-linear-gradient(transparent, transparent 47px, #93c5fd 47px, #93c5fd 48px)", backgroundSize: "100% 48px", backgroundAttachment: "local" };
            case "grid-small":
                return { backgroundImage: "linear-gradient(#93c5fd 1px, transparent 1px), linear-gradient(90deg, #93c5fd 1px, transparent 1px)", backgroundSize: "20px 20px" };
            case "grid-large":
                return { backgroundImage: "linear-gradient(#93c5fd 1px, transparent 1px), linear-gradient(90deg, #93c5fd 1px, transparent 1px)", backgroundSize: "40px 40px" };
            case "dotted":
                return { backgroundImage: "radial-gradient(#60a5fa 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" };
            default:
                return {};
        }
    };

    return (
        <div className="w-full h-full min-h-[800px] relative bg-white border-2 border-[#93c5fd]" style={getBgStyle()}>
            {/* Compact Header / Toolbar (Rendered in Portal) */}
            {portalTarget && createPortal(
                <div className="h-[34px] px-2 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] flex items-center justify-center gap-3 pointer-events-auto shadow-sm rounded-lg whitespace-nowrap">
                
                {/* History Button */}
                <button 
                    onClick={() => setShowHistory(true)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#1e293b] hover:bg-slate-100 px-2 py-1.5 rounded transition-colors"
                >
                    <History size={14} />
                    History
                </button>

                <div className="w-px h-4 bg-slate-200" />

                {/* Title Input */}
                <input 
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    placeholder="Untitled Note"
                    className="text-sm font-bold bg-transparent border-none outline-none text-[#1e293b] w-48 font-serif placeholder:text-slate-300 focus:ring-1 focus:ring-orange-200/50 rounded px-1"
                />

                <div className="w-px h-4 bg-slate-200" />

                {/* Pattern Select */}
                <div className="flex items-center gap-1.5 text-[11px] px-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Pattern</span>
                    <select 
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="bg-transparent border-none outline-none focus:ring-1 focus:ring-[#F97316]/50 font-bold text-[#1e293b] cursor-pointer hover:bg-slate-100 transition-colors py-0.5 rounded"
                    >
                        <option value="none">Blank</option>
                        <option value="lined-narrow">Lined (Narrow)</option>
                        <option value="lined-wide">Lined (Wide)</option>
                        <option value="grid-small">Grid (Small)</option>
                        <option value="grid-large">Grid (Large)</option>
                        <option value="dotted">Dotted</option>
                    </select>
                </div>
                
                <div className="w-px h-4 bg-slate-200" />
                
                {/* Save Status */}
                <div className="flex items-center justify-center min-w-[50px] pr-2">
                    {isSaving ? (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            Saving...
                        </span>
                    ) : lastSaved ? (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Check size={10} /> Saved
                        </span>
                    ) : null}
                </div>
            </div>, portalTarget)}

            {/* History Overlay (Covers everything including GlobalCanvas) */}
            {showHistory && (
                <div className="absolute inset-0 z-[60] bg-[#FAF9F6] flex flex-col pointer-events-auto">
                    <div className="h-20 px-8 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold text-[#1e293b] font-serif">Scratchpad History</h2>
                            <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">{notes.length} Pages</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={createNewNote}
                                className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-lg hover:bg-orange-600 transition-colors font-bold text-sm shadow-sm"
                            >
                                <Plus size={16} /> New Page
                            </button>
                            <div className="w-px h-8 bg-slate-200" />
                            <button 
                                onClick={() => setShowHistory(false)}
                                className="p-2 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {notes.map(note => (
                                <div 
                                    key={note.id} 
                                    onClick={() => selectNote(note)}
                                    className={`relative group bg-white border ${activeNoteId === note.id ? 'border-[#F97316] ring-2 ring-[#F97316]/20' : 'border-[#E2E8F0]'} rounded-xl p-5 cursor-pointer hover:shadow-md transition-all flex flex-col h-40`}
                                >
                                    <div className="flex-1">
                                        <h3 className={`font-bold text-lg mb-1 truncate ${activeNoteId === note.id ? 'text-[#F97316]' : 'text-[#1e293b]'}`}>
                                            {note.title || "Untitled Note"}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-2">
                                            <span className="capitalize">{note.background.replace("-", " ")}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between mt-4">
                                        <div className="text-[11px] text-slate-400 font-medium">
                                            {new Date(note.updated_at).toLocaleDateString()} {new Date(note.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                        className="absolute bottom-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Note"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}