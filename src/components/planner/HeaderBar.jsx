import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Compass } from "lucide-react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderBar({ selectedDate, onDateChange, isSynced, activeTemplate }) {
  const { user } = useAuth();
  
  return (
    <div id="tour-header" className="fixed top-0 left-0 right-0 h-16 grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-8 pointer-events-auto z-50 border-b" style={{background: "#2C1F14", borderColor: "#1A120B"}}>
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-3 justify-start min-w-0">
        <div className="flex items-center justify-center w-10 h-10 rounded bg-[#1A120B] border border-[#3e2d1d] shrink-0">
          <Compass size={22} style={{ color: "#B8956A" }} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[#f5deb3] font-serif font-bold text-xl md:text-2xl leading-tight tracking-wide truncate">
            My Planner
          </span>
          <span 
            className="text-xs uppercase tracking-widest font-bold leading-none truncate mt-0.5"
            style={{
              color: "#F97316",
              textShadow: "0 0 8px rgba(249, 115, 22, 0.6)"
            }}
          >
            {activeTemplate === "JOURNAL" ? "Journal" : "Planner"}
          </span>
        </div>
      </div>

      {/* Center: Date with Navigation */}
      <div className="flex items-center justify-center gap-2 md:gap-4 shrink-0 px-4">
        <button 
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80 shrink-0"
          style={{color: "#b8956a"}}
          title="Previous"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="text-center min-w-[140px] md:min-w-[180px]">
          <div className="text-xl md:text-2xl" style={{fontFamily: "'Playfair Display', serif", fontWeight: "600", color: "#f5deb3", letterSpacing: "0.5px"}}>
            {format(selectedDate, "EEEE")}
          </div>
          <div className="text-base md:text-lg" style={{fontFamily: "'Playfair Display', serif", fontWeight: "400", color: "#c5a87e", letterSpacing: "0.3px"}}>
            {format(selectedDate, "MM/dd/yyyy")}
          </div>
        </div>

        <button 
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80 shrink-0"
          style={{color: "#b8956a"}}
          title="Next"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Right: User Email & Sync Status */}
      <div className="flex items-center justify-between w-full min-w-0 pl-4 lg:pl-8 gap-4">
        {user?.email ? (
          <div className="hidden md:block text-sm font-medium truncate text-center flex-1" style={{color: "#8B7355", fontFamily: "'Playfair Display', serif"}}>
            {user.email}
          </div>
        ) : <div className="flex-1" />}
        
        <div className="flex items-center justify-end gap-2 min-h-[44px] shrink-0">
          <ShieldCheck 
            size={18} 
            style={{
              color: isSynced ? "#B8956A" : "#8B7355",
              animation: !isSynced ? "pulse 2s ease-in-out infinite" : "none"
            }} 
          />
          <span className="hidden sm:inline-block" style={{fontSize: "12px", color: isSynced ? "#B8956A" : "#8B7355", fontWeight: "500"}}>
            {isSynced ? "Synced" : "Syncing..."}
          </span>
        </div>
      </div>
    </div>
  );
}