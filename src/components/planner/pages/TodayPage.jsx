import React from "react";
import { Sunrise, Moon } from "lucide-react";

const HOURS = ["6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm"];

export default function TodayPage({ subTab, dark }) {
  const muted = dark ? "#64748b" : "#94a3b8";
  const line = dark ? "#334155" : "#e2e8f0";
  const sectionBg = dark ? "#253247" : "#f8fafc";
  const sectionBorder = dark ? "#334155" : "#e2e8f0";
  const text = dark ? "#e2e8f0" : "#1e293b";

  if (subTab === "schedule") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <div className="flex items-center gap-2 mb-3 text-xs font-bold tracking-widest uppercase" style={{ color: "#f97316" }}>
        <Sunrise size={14} /> Morning Startup
      </div>
      <div className="space-y-2 mb-5">
        {[1,2,3].map(n => (
          <div key={n} className="flex items-center gap-3 p-2 rounded-lg border" style={{ background: sectionBg, borderColor: sectionBorder }}>
            <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: muted }} />
            <div className="flex-1 border-b" style={{ borderColor: line, height: 20 }} />
          </div>
        ))}
      </div>

      <div className="flex-1 border rounded-lg p-3 md:p-5 mb-5 flex flex-col justify-between min-h-[280px]"
        style={{ background: sectionBg, borderColor: sectionBorder }}>
        {HOURS.map(hour => (
          <div key={hour} className="flex items-center gap-3 flex-1" style={{ minHeight: 26 }}>
            <span className="text-xs font-mono w-10 text-right uppercase" style={{ color: muted }}>{hour}</span>
            <div className="flex-1 border-b" style={{ borderColor: line }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs font-bold tracking-widest uppercase" style={{ color: "#6366f1" }}>
        <Moon size={14} /> Evening Shutdown
      </div>
      <div className="space-y-2">
        {[1,2,3].map(n => (
          <div key={n} className="flex items-center gap-3 p-2 rounded-lg border" style={{ background: sectionBg, borderColor: sectionBorder }}>
            <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: muted }} />
            <div className="flex-1 border-b" style={{ borderColor: line, height: 20 }} />
          </div>
        ))}
      </div>
    </div>
  );

  if (subTab === "big3") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: muted }}>
        Today's Big 3 <span style={{ color: "#f97316" }}>★★★</span>
      </p>
      <div className="space-y-4 mb-8">
        {[1,2,3].map(num => (
          <div key={num} className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: sectionBg, borderColor: line }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: dark ? "#334155" : "#e2e8f0", color: muted }}>{num}</div>
            <div className="flex-1 border-b pb-2" style={{ borderColor: line, height: 38 }} />
          </div>
        ))}
      </div>
      <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: muted }}>Notes & Insights</p>
      <div className="flex-1 flex flex-col">
        {[...Array(14)].map((_, i) => (
          <div key={i} className="flex-1 border-b" style={{ borderColor: line, minHeight: 30 }} />
        ))}
      </div>
    </div>
  );

  if (subTab === "braindump") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: muted }}>Brain Dump</p>
      <div className="flex-1 flex flex-col">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="flex-1 border-b flex items-end gap-2 pb-1" style={{ borderColor: line, minHeight: 36 }}>
            <span className="text-xs w-5 text-right" style={{ color: muted }}>{i + 1}</span>
            <div className="flex-1" />
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}