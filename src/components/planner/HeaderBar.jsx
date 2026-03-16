import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { format, addDays } from "date-fns";

export default function HeaderBar({ selectedDate, onDateChange, isSynced }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-8 py-3 md:py-4 border-b pointer-events-auto"
      style={{ background: "#1a120b", borderColor: "#3f2817" }}
    >
      <span className="text-xs md:text-sm font-semibold tracking-widest uppercase" style={{ color: "#f59e0b" }}>
        Executive OS
      </span>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          className="active-anchor px-2 md:px-3 py-1 text-xs font-bold uppercase rounded"
          onClick={() => onDateChange(new Date())}
          style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
        >
          Today
        </button>

        <button className="active-anchor p-1 md:p-2" onClick={() => onDateChange(addDays(selectedDate, -1))}>
          <ChevronLeft size={20} className="md:w-5 md:h-5" style={{ color: "#e2e8f0" }} />
        </button>

        <span className="min-w-[120px] md:min-w-[140px] text-center text-xs md:text-sm font-semibold" style={{ color: "#e2e8f0" }}>
          {format(selectedDate, "EEE, MMM d")}
        </span>

        <button className="active-anchor p-1 md:p-2" onClick={() => onDateChange(addDays(selectedDate, 1))}>
          <ChevronRight size={20} className="md:w-5 md:h-5" style={{ color: "#e2e8f0" }} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isSynced ? (
          <ShieldCheck size={20} className="md:w-5 md:h-5" style={{ color: "#22c55e", animation: "pulse 2s infinite" }} />
        ) : (
          <span className="text-xs md:text-sm font-semibold" style={{ color: "#f59e0b" }}>
            Saving...
          </span>
        )}
      </div>
    </div>
  );
}