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
    <div className="fixed left-0 top-0 bottom-0 z-50 flex flex-col gap-1 p-3 pointer-events-auto border-r" style={{background: "#8B6F47", borderColor: "#6B5638"}}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors"
            onClick={() => onTemplateChange(tab.id)}
            style={{
              background: activeTemplate === tab.id ? "#A0826D" : "transparent",
              color: activeTemplate === tab.id ? "#F5E6D3" : "#D4C4B0",
              fontWeight: activeTemplate === tab.id ? "600" : "500",
            }}
          >
            <Icon size={18} />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}