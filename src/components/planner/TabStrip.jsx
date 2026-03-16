import React from "react";
import { Calendar, BarChart2, Archive } from "lucide-react";

const TABS = [
  { key: "today", label: "TODAY", color: "#f97316" },
  { key: "weekly", label: "WEEKLY", color: "#3b82f6" },
  { key: "monthly", label: "MONTHLY", color: "#a78bfa" },
];

export default function TabStrip({ activeTab, onSelect }) {
  return (
    <div className="flex flex-col justify-start py-4 gap-1 shrink-0 select-none" style={{ width: 48 }}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className="relative flex flex-col items-center justify-center transition-all duration-200"
            style={{
              width: 44,
              height: 88,
              borderRadius: "0 8px 8px 0",
              background: active
                ? `linear-gradient(135deg, ${tab.color}22, ${tab.color}10)`
                : "rgba(255,255,255,0.04)",
              borderLeft: active ? `3px solid ${tab.color}` : "3px solid transparent",
              boxShadow: active ? `2px 0 12px ${tab.color}30` : "none",
              marginLeft: active ? 0 : 2,
            }}
          >
            <span
              className="text-[10px] font-black tracking-[0.18em]"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                transform: "rotate(180deg)",
                color: active ? tab.color : "#8a7f78",
                letterSpacing: "0.15em",
                fontFamily: "Georgia, serif",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}