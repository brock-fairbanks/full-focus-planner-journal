import React from "react";
import { BookOpen, Calendar, Target, Moon, TrendingUp } from "lucide-react";

const TABS = [
  { id: "DAILY", label: "Today", icon: Calendar },
  { id: "IDEAL_WEEK", label: "Ideal Week", icon: TrendingUp },
  { id: "QUARTERLY_GOALS", label: "Goals", icon: Target },
  { id: "RITUALS", label: "Rituals", icon: Moon },
  { id: "WEEKLY_REVIEW", label: "Weekly", icon: BookOpen },
];

export default function TabBar({ activeTemplate, onTemplateChange }) {
  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col gap-2 p-3 md:p-4 pointer-events-auto"
      style={{ background: "#1a120b", width: "80px", minWidth: "100px" }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className="active-anchor flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg transition-colors"
            onClick={() => onTemplateChange(tab.id)}
            style={{
              background: activeTemplate === tab.id ? "#f59e0b" : "rgba(255,255,255,0.08)",
              color: activeTemplate === tab.id ? "#1a120b" : "#e2e8f0",
            }}
          >
            <Icon size={20} className="md:w-6 md:h-6" />
            <span className="text-[9px] md:text-[10px] font-semibold text-center">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}