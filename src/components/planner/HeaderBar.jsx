import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { format, addDays } from "date-fns";

export default function HeaderBar({ selectedDate, onDateChange, isSynced }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 border-b pointer-events-auto" style={{background: "#8B6F47", borderColor: "#6B5638"}}>
      <h1 className="text-lg font-semibold" style={{color: "#F5E6D3"}}>Executive OS</h1>

      <div className="flex items-center gap-4">
        <button
          className="px-3 py-1 text-sm font-medium rounded transition-colors"
          style={{color: "#F5E6D3", background: "rgba(255,255,255,0.1)"}}
          onClick={() => onDateChange(new Date())}
        >
          Today
        </button>

        <button className="p-1 rounded transition-colors" style={{color: "#F5E6D3", background: "rgba(255,255,255,0.1)"}} onClick={() => onDateChange(addDays(selectedDate, -1))}>
          <ChevronLeft size={20} />
        </button>

        <span className="min-w-[120px] text-center text-sm font-medium" style={{color: "#F5E6D3"}}>
          {format(selectedDate, "EEE, MMM d")}
        </span>

        <button className="p-1 rounded transition-colors" style={{color: "#F5E6D3", background: "rgba(255,255,255,0.1)"}} onClick={() => onDateChange(addDays(selectedDate, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isSynced ? (
          <ShieldCheck size={18} style={{color: "#C8E6C9", animation: "pulse 2s infinite" }} />
        ) : (
          <span className="text-xs font-medium" style={{color: "#FFE0B2"}}>Saving...</span>
        )}
      </div>
    </div>
  );
}