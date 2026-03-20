import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ScratchpadSpread({ date, onSubSectionChange, onClearCanvas }) {
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [title, setTitle] = useState("");
    const [background, setBackground] = useState("none");
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

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
        onSubSectionChange(note.id); // This changes pageKey in Planner so GlobalCanvas switches drawings
    };

    const createNewNote = async () => {
        try {
            const newNote = {
                title: "Untitled Scratchpad",
                page_key: `scratch_${Date.now()}`,
                background: "none",
                created_at: Date.now(),
                updated_at: Date.now()
            };
            const created = await base44.entities.ScratchpadNote.create(newNote);
            setNotes(prev => [created, ...prev]);
            selectNote(created);
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
        if (confirm("Are you sure you want to delete this scratchpad?")) {
            await base44.entities.ScratchpadNote.delete(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            if (activeNoteId === id) {
                const remaining = notes.filter(n => n.id !== id);
                if (remaining.length > 0) selectNote(remaining[0]);
                else createNewNote();
            }
        }
    };

    // Auto-save logic
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
            case "lined":
                return {
                    backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)",
                    backgroundSize: "100% 32px",
                    backgroundAttachment: "local"
                };
            case "grid":
                return {
                    backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                };
            case "dotted":
                return {
                    backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                };
            default:
                return {};
        }
    };

    return (
        <div className="flex h-full min-h-[800px] w-full bg-[#FAF9F6]">
            {/* Sidebar for History */}
            <div className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col h-full z-30 pointer-events-auto shrink-0 shadow-sm relative">
                <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#FAF9F6]">
                    <h2 className="font-semibold text-[#1e293b]">History</h2>
                    <button onClick={createNewNote} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors" title="New Scratchpad">
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {notes.map(note => (
                        <div 
                            key={note.id} 
                            onClick={() => selectNote(note)}
                            className={`p-3 border-b border-slate-100 cursor-pointer group transition-colors flex justify-between items-center ${activeNoteId === note.id ? 'bg-slate-100 border-l-4 border-l-[#F97316]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                        >
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="text-sm font-medium text-[#1e293b] truncate">{note.title}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date(note.updated_at).toLocaleString()}</p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                className={`p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all`}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative z-0 min-w-[700px]">
                {/* Header configuration tools */}
                <div className="h-16 px-6 border-b border-[#E2E8F0] bg-white/50 backdrop-blur flex items-center justify-between pointer-events-auto shrink-0 relative z-30 shadow-sm">
                    <input 
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Scratchpad Title"
                        className="text-2xl font-bold bg-transparent border-none outline-none text-[#1e293b] w-1/2 font-serif placeholder:text-slate-300"
                    />
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span>Background:</span>
                            <select 
                                value={background}
                                onChange={(e) => setBackground(e.target.value)}
                                className="bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-[#F97316]/50"
                            >
                                <option value="none">None</option>
                                <option value="lined">Lined</option>
                                <option value="dotted">Dotted</option>
                                <option value="grid">Grid</option>
                            </select>
                        </div>
                        
                        <div className="w-px h-6 bg-slate-200" />
                        
                        {lastSaved && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 w-32 justify-end text-right">
                                {isSaving ? "Saving..." : `Saved ${new Date(lastSaved).toLocaleTimeString()}`}
                            </div>
                        )}
                        <button 
                            onClick={saveNote}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
                        >
                            {isSaving ? <Check size={16} /> : <Save size={16} />}
                            {isSaving ? "Saved" : "Save"}
                        </button>
                    </div>
                </div>

                <div 
                    className="flex-1 w-full h-full relative"
                    style={getBgStyle()}
                >
                    {/* The GlobalCanvas will physically render right here from pages/Planner */}
                </div>
            </div>
        </div>
    );
}