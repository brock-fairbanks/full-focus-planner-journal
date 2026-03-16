import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";

export default function MonthlyPage({ subTab, dark, selectedDate }) {
  const muted = dark ? "#64748b" : "#94a3b8";
  const line = dark ? "#334155" : "#e2e8f0";
  const sectionBg = dark ? "#253247" : "#f8fafc";
  const text = dark ? "#e2e8f0" : "#1e293b";

  const days = eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) });
  const startOffset = (getDay(days[0]) + 6) % 7; // Mon start

  if (subTab === "calendar") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: muted }}>
        {format(selectedDate, "MMMM yyyy")}
      </p>
      <div className="grid grid-cols-7 gap-px mb-2">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: muted }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px flex-1">
        {[...Array(startOffset)].map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map(day => {
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          return (
            <div key={day.toString()}
              className="border rounded flex flex-col p-1 min-h-[50px]"
              style={{
                borderColor: line,
                background: isToday ? (dark ? "#3b4f2a" : "#fef9c3") : sectionBg,
              }}>
              <span className="text-[10px] font-bold" style={{ color: isToday ? "#f97316" : muted }}>
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (subTab === "goals") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#f97316" }}>Monthly Goals</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {["Personal", "Professional", "Health", "Finance"].map(cat => (
          <div key={cat} className="p-3 rounded-lg border" style={{ background: sectionBg, borderColor: line }}>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: muted }}>{cat}</p>
            {[1,2,3].map(n => (
              <div key={n} className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded border-2 shrink-0" style={{ borderColor: muted }} />
                <div className="flex-1 border-b" style={{ borderColor: line, height: 20 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (subTab === "review") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#a78bfa" }}>Monthly Review</p>
      {["Wins this month", "Challenges faced", "Key learnings", "Focus for next month"].map(section => (
        <div key={section} className="mb-5">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: muted }}>{section}</p>
          <div className="flex flex-col">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b" style={{ borderColor: line, height: 36 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return null;
}