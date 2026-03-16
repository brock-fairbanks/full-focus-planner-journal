import React from "react";

export default function GoalsPage({ subTab, dark }) {
  const muted = dark ? "#64748b" : "#94a3b8";
  const line = dark ? "#334155" : "#e2e8f0";
  const sectionBg = dark ? "#253247" : "#f8fafc";
  const text = dark ? "#e2e8f0" : "#1e293b";

  if (subTab === "annual") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#f97316" }}>Annual Goals</p>
      <p className="text-[10px] mb-5" style={{ color: muted }}>Set your 1-year targets across life areas</p>
      {["Career & Business", "Health & Fitness", "Relationships", "Personal Growth", "Finance", "Creativity"].map(area => (
        <div key={area} className="mb-4">
          <p className="text-[10px] font-bold uppercase mb-2" style={{ color: muted }}>{area}</p>
          <div className="p-3 rounded-lg border" style={{ background: sectionBg, borderColor: line }}>
            {[1,2].map(n => (
              <div key={n} className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded border-2 shrink-0" style={{ borderColor: muted }} />
                <div className="flex-1 border-b" style={{ borderColor: line, height: 20 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (subTab === "quarterly") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#3b82f6" }}>Quarterly Goals</p>
      <p className="text-[10px] mb-5" style={{ color: muted }}>90-day sprint objectives</p>
      {["Q1","Q2","Q3","Q4"].map(q => (
        <div key={q} className="mb-5">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: muted }}>{q}</p>
          <div className="space-y-2">
            {[1,2,3].map(n => (
              <div key={n} className="flex items-center gap-3 p-2 rounded border" style={{ background: sectionBg, borderColor: line }}>
                <div className="w-5 h-5 rounded border-2 shrink-0" style={{ borderColor: muted }} />
                <div className="flex-1 border-b" style={{ borderColor: line, height: 24 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (subTab === "vision") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#a78bfa" }}>Vision & Purpose</p>
      <p className="text-[10px] mb-5" style={{ color: muted }}>Your north star — why you do what you do</p>
      {["My core values", "My vision statement", "My ideal life in 5 years", "What I stand for"].map(section => (
        <div key={section} className="mb-5">
          <p className="text-[10px] font-bold uppercase mb-2" style={{ color: muted }}>{section}</p>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border-b" style={{ borderColor: line, height: 36 }} />
          ))}
        </div>
      ))}
    </div>
  );

  return null;
}