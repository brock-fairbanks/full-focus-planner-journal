import React, { useState } from "react";
import { Sunrise, Moon } from "lucide-react";

const HOURS = ["6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm"];

export default function LeftPage({ dark }) {
  const text = dark ? "#e2e8f0" : "#1e293b";
  const muted = dark ? "#64748b" : "#94a3b8";
  const line = dark ? "#334155" : "#e2e8f0";
  const sectionBg = dark ? "#253247" : "#f8fafc";
  const sectionBorder = dark ? "#334155" : "#e2e8f0";

  return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      {/* Morning Startup */}
      <div className="flex items-center gap-2 mb-3 text-xs md:text-sm font-bold tracking-widest uppercase" style={{ color: "#f97316" }}>
        <Sunrise size={16} /> Morning Startup
      </div>
      <div className="space-y-2 mb-5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="flex items-center gap-3 p-2 md:p-3 rounded-lg border"
            style={{ background: sectionBg, borderColor: sectionBorder }}
          >
            <div className="w-5 h-5 rounded-full border-2 shrink-0" style={{ borderColor: muted }} />
            <div className="flex-1 border-b" style={{ borderColor: line, height: 24 }} />
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div
        className="flex-1 border rounded-lg p-3 md:p-5 mb-5 flex flex-col justify-between min-h-[300px]"
        style={{ background: sectionBg, borderColor: sectionBorder }}
      >
        {HOURS.map((hour) => (
          <div key={hour} className="flex items-center gap-3 flex-1" style={{ minHeight: 28 }}>
            <span className="text-xs font-mono w-10 text-right uppercase" style={{ color: muted }}>
              {hour}
            </span>
            <div className="flex-1 border-b" style={{ borderColor: line }} />
          </div>
        ))}
      </div>

      {/* Evening Shutdown */}
      <div className="flex items-center gap-2 mb-3 text-xs md:text-sm font-bold tracking-widest uppercase" style={{ color: "#6366f1" }}>
        <Moon size={16} /> Evening Shutdown
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="flex items-center gap-3 p-2 md:p-3 rounded-lg border"
            style={{ background: sectionBg, borderColor: sectionBorder }}
          >
            <div className="w-5 h-5 rounded-full border-2 shrink-0" style={{ borderColor: muted }} />
            <div className="flex-1 border-b" style={{ borderColor: line, height: 24 }} />
          </div>
        ))}
      </div>
    </div>
  );
}