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
    <div className="fixed left-0 top-0 bottom-0 w-20 flex flex-col items-center py-6 pointer-events-auto border-r z-50" style={{background: "#1a120b", borderColor: "#0f0a07"}}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTemplate === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTemplateChange(tab.id)}
            className="relative flex items-center justify-center w-full aspect-square transition-all duration-200 min-h-[44px]"
            title={tab.label}
            style={{
              color: isActive ? "#f59e0b" : "#8b7355",
            }}
          >
            <Icon size={24} />
            {isActive && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-l" style={{background: "#f59e0b"}} />
            )}
          </button>
        );
      })}
    </div>
  );
}