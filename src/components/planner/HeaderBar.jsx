import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Compass } from "lucide-react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderBar({ selectedDate, onDateChange, isSynced, activeTemplate }) {
  const { user } = useAuth();
  
  return (
    <div id="tour-header" className="fixed top-0 left-0 right-0 h-16 grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-8 pointer-events-auto z-50 border-b border-slate-800 bg-[#0f172a] shadow-lg">
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-3 justify-start min-w-0">
        <div className="flex items-center justify-center w-10 h-10 rounded bg-slate-800 border border-slate-700 shrink-0 shadow-inner">
          <Compass size={22} className="text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-white font-serif font-bold text-xl md:text-2xl leading-tight tracking-wide truncate">
            My Planner
          </span>
          <span 
            className="text-xs uppercase tracking-widest font-bold leading-none truncate mt-0.5 text-orange-500"
            style={{
              textShadow: "0 0 10px rgba(249, 115, 22, 0.8)"
            }}
          >
            {activeTemplate === "JOURNAL" ? "Journal" : "Planner"}
          </span>
        </div>
      </div>

      {/* Center: Date with Navigation */}
      <div id="tour-date-navigator" className="flex items-center justify-center gap-2 md:gap-4 shrink-0 px-4 bg-slate-900/60 rounded-xl border border-slate-800/80 py-1">
        <button 
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="p-2 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg shrink-0"
          title="Previous"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="text-center min-w-[140px] md:min-w-[180px]">
          <div className="text-xl md:text-2xl font-serif font-bold text-white tracking-wide drop-shadow-md">
            {format(selectedDate, "EEEE")}
          </div>
          <div className="text-sm md:text-base font-serif text-slate-300 tracking-wide">
            {format(selectedDate, "MM/dd/yyyy")}
          </div>
        </div>

        <button 
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg shrink-0"
          title="Next"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Right: User Email & Sync Status */}
      <div className="flex items-center justify-between w-full min-w-0 pl-4 lg:pl-8 gap-4">
        {user?.email ? (
          <div className="hidden md:block text-sm font-medium truncate text-center flex-1 text-slate-400 font-serif">
            {user.email}
          </div>
        ) : <div className="flex-1" />}
        
        <div className="flex items-center justify-end gap-2 min-h-[36px] shrink-0 bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700/50 shadow-inner">
          <ShieldCheck 
            size={18} 
            className={isSynced ? "text-emerald-400" : "text-amber-400"}
            style={{
              animation: !isSynced ? "pulse 2s ease-in-out infinite" : "none"
            }} 
          />
          <span className={`hidden sm:inline-block text-xs font-bold uppercase tracking-wider ${isSynced ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isSynced ? "Synced" : "Syncing..."}
          </span>
        </div>
      </div>
    </div>
  );
}