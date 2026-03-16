import React from "react";
import { BookOpen } from "lucide-react";

const TABS = [
  { key: "today", label: "Today" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export default function BinderHeader({ activeTab, onTabChange, dateLabel }) {
  return (
    <div
      className="flex items-center justify-between px-6 shrink-0 select-none"
      style={{
        height: 68,
        background: "linear-gradient(180deg, #2a1f14 0%, #1a120b 100%)",
        borderBottom: "2px solid #f59e0b33",
      }}
    >
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-amber-400" />
        <span
          className="text-xl font-bold tracking-widest uppercase"
          style={{ color: "#f59e0b" }}
        >
          Executive OS
        </span>
      </div>

      <div className="flex items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className="px-7 py-2.5 rounded-t-lg text-base font-semibold transition-all duration-200"
            style={{
              background: activeTab === t.key ? "#f59e0b" : "transparent",
              color: activeTab === t.key ? "#1a120b" : "#f59e0b99",
              borderBottom: activeTab === t.key ? "2px solid #f59e0b" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-amber-200/70 text-base font-medium tracking-wide">
        {dateLabel}
      </div>
    </div>
  );
}