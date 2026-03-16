import React from "react";
import { BookOpen } from "lucide-react";

export default function IndexPage({ subTab, dark }) {
  const muted = dark ? "#64748b" : "#94a3b8";
  const line = dark ? "#334155" : "#e2e8f0";
  const sectionBg = dark ? "#253247" : "#f8fafc";
  const text = dark ? "#e2e8f0" : "#1e293b";

  if (subTab === "contents") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={14} style={{ color: "#d4af37" }} />
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#d4af37" }}>Table of Contents</p>
      </div>
      <div className="space-y-1">
        {[
          { label: "Annual Goals", page: "1" },
          { label: "Quarterly Goals", page: "3" },
          { label: "Monthly Reviews", page: "7" },
          { label: "Weekly Plans", page: "15" },
          { label: "Daily Logs", page: "23" },
          { label: "Brain Dumps", page: "47" },
          { label: "Project Notes", page: "52" },
          { label: "Reading List", page: "60" },
          { label: "Ideas & Insights", page: "65" },
          { label: "Contacts & References", page: "70" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 p-2 rounded border" style={{ background: sectionBg, borderColor: line }}>
            <span className="flex-1 text-sm" style={{ color: text }}>{item.label}</span>
            <div className="flex-1 border-b border-dotted mx-2" style={{ borderColor: muted }} />
            <span className="text-xs font-mono" style={{ color: muted }}>{item.page}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (subTab === "notes") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: muted }}>Quick Notes</p>
      <div className="flex-1 flex flex-col">
        {[...Array(22)].map((_, i) => (
          <div key={i} className="flex items-end gap-2 pb-1 border-b" style={{ borderColor: line, minHeight: 36 }}>
            <span className="text-[10px] w-5 text-right" style={{ color: muted }}>{i + 1}</span>
            <div className="flex-1" />
          </div>
        ))}
      </div>
    </div>
  );

  if (subTab === "habits") return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#22c55e" }}>Habit Tracker</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left pb-2 pr-4" style={{ color: muted }}>Habit</th>
              {[...Array(31)].map((_, i) => (
                <th key={i} className="pb-2 text-center" style={{ color: muted, minWidth: 20 }}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["Exercise", "Meditate", "Read", "Journal", "No sugar", "Sleep 8h", "Hydrate"].map(habit => (
              <tr key={habit}>
                <td className="pr-4 py-2 font-medium" style={{ color: text, borderBottom: `1px solid ${line}` }}>{habit}</td>
                {[...Array(31)].map((_, i) => (
                  <td key={i} className="text-center py-2" style={{ borderBottom: `1px solid ${line}` }}>
                    <div className="w-4 h-4 rounded-sm border mx-auto" style={{ borderColor: muted }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return null;
}