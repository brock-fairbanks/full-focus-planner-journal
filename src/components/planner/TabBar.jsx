import React from "react";
import { BookOpen, Calendar, Target, Moon, TrendingUp } from "lucide-react";

const TABS = [
  { id: "DAILY", label: "Today", icon: Calendar },
  { id: "IDEAL_WEEK", label: "Ideal Week", icon: TrendingUp },
  { id: "QUARTERLY_GOALS", label: "Goals", icon: Target },
  { id: "RITUALS", label: "Rituals", icon: Moon },
  { id: "WEEKLY", label: "Weekly", icon: BookOpen },
];

export default function TabBar({ activeTemplate, onTemplateChange }) {
  return (
    <div className="fixed left-0 top-0 bottom-0 w-20 flex flex-col items-center py-6 pointer-events-auto z-50" style={{background: "#1A120B"}}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTemplate === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTemplateChange(tab.id)}
            className="relative flex flex-col items-center justify-center w-full h-20 transition-all duration-200 gap-1"
            title={tab.label}
            style={{
              color: isActive ? "#B8956A" : "#8B7355",
              backgroundColor: isActive ? "rgba(184, 149, 106, 0.1)" : "transparent",
            }}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium tracking-wide uppercase">{tab.label}</span>
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-14 w-1" style={{background: "#B8956A"}} />
            )}
          </button>
        );
      })}
    </div>
  );
}