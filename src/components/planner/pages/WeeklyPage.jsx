import React from "react";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function WeeklyPage({ subTab, dark }) {
  const muted = dark ? "#64748b" : "#94a3b8";
  const line = dark ? "#334155" : "#e2e8f0";
  const sectionBg = dark ? "#253247" : "#f8fafc";
  const text = dark ? "#e2e8f0" : "#1e293b";

  if (subTab === "overview") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: muted }}>Weekly Overview</p>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {DAYS.map(day => (
          <div key={day} className="flex flex-col gap-1">
            <div className="text-center text-[10px] font-bold uppercase pb-1" style={{ color: muted, borderBottom: `1px solid ${line}` }}>{day}</div>
            <div className="flex flex-col gap-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border-b" style={{ borderColor: line, height: 28 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (subTab === "goals") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#f97316" }}>Weekly Goals</p>
      <div className="space-y-3 mb-6">
        {[1,2,3,4,5].map(n => (
          <div key={n} className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: sectionBg, borderColor: line }}>
            <div className="w-6 h-6 rounded border-2 shrink-0" style={{ borderColor: muted }} />
            <div className="flex-1 border-b" style={{ borderColor: line, height: 28 }} />
          </div>
        ))}
      </div>
      <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: muted }}>Reflections</p>
      <div className="flex-1 flex flex-col">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex-1 border-b" style={{ borderColor: line, minHeight: 36 }} />
        ))}
      </div>
    </div>
  );

  if (subTab === "review") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#a78bfa" }}>Weekly Review</p>
      {["What went well?", "What to improve?", "Key learnings", "Next week focus"].map(section => (
        <div key={section} className="mb-5">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: muted }}>{section}</p>
          <div className="flex flex-col">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-b" style={{ borderColor: line, height: 36 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return null;
}