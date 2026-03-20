import React, { useState, useEffect, useRef } from "react";
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
                    {/* History Button */}
                    <button 
                        onClick={() => setShowHistory(true)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors text-sm font-bold text-slate-700"
                    >
                        <History size={16} />
                        History
                    </button>

                    <div className="w-px h-8 bg-slate-200" />

                    {/* Title Input (Pointer events stopped to prevent global canvas eating focus) */}
                    <input 
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        placeholder="Untitled Note"
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
            >
                {/* The GlobalCanvas will overlay exactly on top of this in Planner.jsx */}
            </div>

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