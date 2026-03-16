import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { format, addDays } from "date-fns";

export default function HeaderBar({ selectedDate, onDateChange, isSynced }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-3 border-b pointer-events-auto"
      style={{ background: "#1a120b", borderColor: "#3f2817" }}
    >
      <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#f59e0b" }}>
        Executive OS
      </span>

      <div className="flex items-center gap-3">
        <button
          className="active-anchor px-3 py-1 text-xs font-bold uppercase rounded"
          onClick={() => onDateChange(new Date())}
          style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
        >
          Today
        </button>

        <button className="active-anchor p-1" onClick={() => onDateChange(addDays(selectedDate, -1))}>
          <ChevronLeft size={18} style={{ color: "#e2e8f0" }} />
        </button>

        <span className="min-w-[120px] text-center text-sm font-semibold" style={{ color: "#e2e8f0" }}>
          {format(selectedDate, "EEE, MMM d")}
        </span>

        <button className="active-anchor p-1" onClick={() => onDateChange(addDays(selectedDate, 1))}>
          <ChevronRight size={18} style={{ color: "#e2e8f0" }} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isSynced ? (
          <ShieldCheck size={18} style={{ color: "#22c55e", animation: "pulse 2s infinite" }} />
        ) : (
          <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
            Saving...
          </span>
        )}
      </div>
    </div>
  );
}