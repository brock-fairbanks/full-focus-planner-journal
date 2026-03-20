import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save, Check, History, ChevronDown } from "lucide-react";
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

    useEffect(() => {
        loadNotes();
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
                title: "Untitled Note",
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
                return { backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)", backgroundSize: "100% 32px", backgroundAttachment: "local" };
            case "lined-wide":
                return { backgroundImage: "repeating-linear-gradient(transparent, transparent 47px, #e5e7eb 47px, #e5e7eb 48px)", backgroundSize: "100% 48px", backgroundAttachment: "local" };
            case "grid-small":
                return { backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)", backgroundSize: "20px 20px" };
            case "grid-large":
                return { backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)", backgroundSize: "40px 40px" };
            case "dotted":
                return { backgroundImage: "radial-gradient(#94a3b8 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" };
            default:
                return {};
        }
    };

    return (
        <div className="flex flex-col h-full min-h-[800px] w-full bg-[#FAF9F6]">
            {/* Header / Toolbar */}
            <div className="h-16 px-6 bg-white/90 backdrop-blur-md border border-[#E2E8F0] flex items-center justify-between pointer-events-auto shrink-0 relative z-40 shadow-sm rounded-xl mx-4 mt-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* History Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors text-sm font-bold text-slate-700"
                        >
                            <History size={16} />
                            History
                            <ChevronDown size={14} className={`transition-transform ${showHistory ? "rotate-180" : ""}`} />
                        </button>
                        
                        {showHistory && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 max-h-96 overflow-y-auto z-50">
                                <div className="px-3 pb-2 mb-2 border-b border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Notes</span>
                                    <button 
                                        onClick={createNewNote} 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="text-xs flex items-center gap-1 text-[#F97316] hover:text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded"
                                    >
                                        <Plus size={14} /> New
                                    </button>
                                </div>
                                {notes.map(note => (
                                    <div 
                                        key={note.id} 
                                        onClick={() => selectNote(note)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className={`px-4 py-2 cursor-pointer group flex justify-between items-center ${activeNoteId === note.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className={`text-sm truncate ${activeNoteId === note.id ? 'font-bold text-[#F97316]' : 'text-slate-700 font-medium'}`}>{note.title}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(note.updated_at).toLocaleDateString()} {new Date(note.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="Delete Note"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-8 bg-slate-200" />

                    {/* Title Input (Pointer events stopped to prevent global canvas eating focus) */}
                    <input 
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        placeholder="Name your scratchpad..."
                        className="text-xl font-bold bg-transparent border-none outline-none text-[#1e293b] w-80 font-serif placeholder:text-slate-300 focus:ring-2 focus:ring-orange-200/50 rounded px-2 py-1"
                    />
                </div>

                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pattern</span>
                        <select 
                            value={background}
                            onChange={(e) => setBackground(e.target.value)}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#F97316]/50 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="none">Blank Page</option>
                            <option value="lined-narrow">Lined (Narrow)</option>
                            <option value="lined-wide">Lined (Wide)</option>
                            <option value="grid-small">Grid (Small)</option>
                            <option value="grid-large">Grid (Large)</option>
                            <option value="dotted">Dotted</option>
                        </select>
                    </div>
                    
                    <div className="w-px h-8 bg-slate-200" />
                    
                    <div className="flex flex-col items-end justify-center min-w-[120px]">
                        <button 
                            onClick={saveNote}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-slate-800 text-white rounded-lg transition-colors text-sm font-bold shadow-sm"
                        >
                            {isSaving ? <Check size={16} className="text-green-400" /> : <Save size={16} />}
                            {isSaving ? "Saved" : "Save"}
                        </button>
                        {lastSaved && (
                            <span className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide">
                                {new Date(lastSaved).toLocaleDateString()} {new Date(lastSaved).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <div 
                className="flex-1 w-full h-full relative mx-4 mb-4 rounded-b-xl overflow-hidden bg-white shadow-sm border-x border-b border-[#E2E8F0] mt-2"
                style={getBgStyle()}
                onClick={() => setShowHistory(false)}
            >
                {/* The GlobalCanvas will overlay exactly on top of this in Planner.jsx */}
            </div>
        </div>
    );
}