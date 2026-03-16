import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Compass } from "lucide-react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderBar({ selectedDate, onDateChange, isSynced, activeTemplate }) {
  const { user } = useAuth();
  
  return (
    <div className="fixed top-0 left-20 right-0 h-16 flex items-center justify-between px-8 pointer-events-auto z-50 border-b" style={{background: "#2C1F14", borderColor: "#1A120B"}}>
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-3 min-w-[100px]">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-[#1A120B] border border-[#3e2d1d] shrink-0">
          <Compass size={18} style={{ color: "#B8956A" }} />
        </div>
        <div className="flex flex-col">
          <span className="text-[#f5deb3] font-serif font-bold text-lg leading-tight tracking-wide whitespace-nowrap">
            Fairbanks Builders
          </span>
          <span 
            className="text-[10px] uppercase tracking-widest font-bold leading-none"
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
      <div className="flex flex-1 items-center justify-center gap-4">
        <button 
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80"
          style={{color: "#b8956a"}}
          title="Previous"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="text-center min-w-[180px]">
          <div style={{fontFamily: "'Playfair Display', serif", fontSize: "24px", fontWeight: "600", color: "#f5deb3", letterSpacing: "0.5px"}}>
            {format(selectedDate, "EEEE")}
          </div>
          <div style={{fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "400", color: "#c5a87e", letterSpacing: "0.3px"}}>
            {format(selectedDate, "MMMM d, yyyy")}
          </div>
        </div>

        <button 
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80"
          style={{color: "#b8956a"}}
          title="Next"
        >
          <ChevronRight size={28} />
        </button>

        {user?.email && (
          <div className="hidden lg:block absolute left-1/2 ml-[170px] text-sm font-medium" style={{color: "#8B7355", fontFamily: "'Playfair Display', serif"}}>
            {user.email}
          </div>
        )}
      </div>

      {/* Right: Sync Status */}
      <div className="flex items-center justify-end gap-3 min-w-[100px]">
        <div className="flex items-center gap-2 min-h-[44px]">
          <ShieldCheck 
            size={18} 
            style={{
              color: isSynced ? "#B8956A" : "#8B7355",
              animation: !isSynced ? "pulse 2s ease-in-out infinite" : "none"
            }} 
          />
          <span style={{fontSize: "12px", color: isSynced ? "#B8956A" : "#8B7355", fontWeight: "500"}}>
            {isSynced ? "Synced" : "Syncing..."}
          </span>
        </div>
      </div>
    </div>
  );
}