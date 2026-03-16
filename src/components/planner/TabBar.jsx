import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Target, Moon, TrendingUp } from "lucide-react";
import { Reorder } from "framer-motion";

const DEFAULT_TABS = [
  { id: "DAILY", label: "Today", icon: Calendar },
  { id: "IDEAL_WEEK", label: "Ideal Week", icon: TrendingUp },
  { id: "QUARTERLY_GOALS", label: "Goals", icon: Target },
  { id: "RITUALS", label: "Rituals", icon: Moon },
  { id: "WEEKLY", label: "Weekly", icon: BookOpen },
];

const ICONS_MAP = {
  DAILY: Calendar,
  IDEAL_WEEK: TrendingUp,
  QUARTERLY_GOALS: Target,
  RITUALS: Moon,
  WEEKLY: BookOpen
};

export default function TabBar({ activeTemplate, onTemplateChange }) {
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem("planner_tabs_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map(tab => ({ ...tab, icon: ICONS_MAP[tab.id] }));
      } catch (e) {}
    }
    return DEFAULT_TABS;
  });

  const handleReorder = (newOrder) => {
    setTabs(newOrder);
    localStorage.setItem("planner_tabs_order", JSON.stringify(newOrder.map(t => ({ id: t.id, label: t.label }))));
  };

  return (
    <div 
      className="fixed left-0 top-0 bottom-0 w-20 flex flex-col items-center py-6 pointer-events-auto z-50" 
      style={{background: "#1A120B"}}
    >
      <Reorder.Group axis="y" values={tabs} onReorder={handleReorder} className="w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTemplate === tab.id;
          return (
            <Reorder.Item 
              key={tab.id} 
              value={tab} 
              className="w-full cursor-grab active:cursor-grabbing"
              dragConstraints={{ top: 0, bottom: 0 }}
            >
              <button
                onClick={() => onTemplateChange(tab.id)}
                className="relative flex flex-col items-center justify-center w-full h-20 transition-all duration-200 gap-1 select-none"
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
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </div>
  );
}