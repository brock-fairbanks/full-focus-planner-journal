import React from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

export default function BinderHeader({ dateLabel, onDateChange }) {
  return (
    <div
      className="flex items-center justify-between px-6 shrink-0 select-none"
      style={{
        height: 56,
        background: "linear-gradient(135deg, #2c1f14 0%, #4a2e18 50%, #2c1f14 100%)",
        borderBottom: "3px solid #8b5e3c",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, #d4a843, #b8892e)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)", flexShrink: 0,
        }}>
          <BookOpen className="w-4 h-4 text-stone-900" />
        </div>
        <h1 className="text-base font-bold tracking-[0.12em] text-amber-200 whitespace-nowrap"
          style={{ fontFamily: "Georgia, serif" }}>
          EXECUTIVE OS
        </h1>
      </div>

      {/* Date Nav */}
      <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-1 border border-stone-600">
        <button onClick={() => onDateChange(-1)} className="text-amber-400 hover:text-amber-200 p-0.5">
          <ChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-xs font-semibold text-amber-200 min-w-[140px] text-center"
          style={{ fontFamily: "Georgia, serif" }}>
          {dateLabel}
        </span>
        <button onClick={() => onDateChange(1)} className="text-amber-400 hover:text-amber-200 p-0.5">
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Spacer to balance layout */}
      <div style={{ width: 140 }} />
    </div>
  );
}