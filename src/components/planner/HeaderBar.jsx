import React from "react";
import { ChevronLeft, ChevronRight, PenTool } from "lucide-react";
import { format, addDays } from "date-fns";

export default function HeaderBar({ selectedDate, onDateChange, isSynced }) {
  return (
    <div className="fixed top-0 left-20 right-0 h-16 flex items-center justify-between px-8 pointer-events-auto z-50 border-b" style={{background: "#2c1f14", borderColor: "#1a120b"}}>
      {/* Left: Navigation */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{color: "#b8956a"}}
          title="Previous"
        >
          <ChevronLeft size={20} />
        </button>
        
        <button 
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{color: "#b8956a"}}
          title="Next"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Center: Date in Serif */}
      <div className="flex-1 text-center">
        <div style={{fontFamily: "'Playfair Display', serif", fontSize: "24px", fontWeight: "600", color: "#f5deb3", letterSpacing: "0.5px"}}>
          {format(selectedDate, "EEEE")}
        </div>
        <div style={{fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "400", color: "#c5a87e", letterSpacing: "0.3px"}}>
          {format(selectedDate, "MMMM d, yyyy")}
        </div>
      </div>

      {/* Right: Sync Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 min-h-[44px]">
          <PenTool size={18} style={{color: isSynced ? "#f59e0b" : "#d4af37", animation: !isSynced ? "pulse 1.5s ease-in-out infinite" : "none"}} />
          <span style={{fontSize: "12px", color: isSynced ? "#f59e0b" : "#d4af37", fontWeight: "500"}}>
            {isSynced ? "Synced" : "Syncing..."}
          </span>
        </div>
      </div>
    </div>
  );
}