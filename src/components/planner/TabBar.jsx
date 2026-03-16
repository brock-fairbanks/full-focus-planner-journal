import React, { useState, useEffect } from "react";
import { Calendar, Target, Moon, TrendingUp, BookOpen, Sun, Coffee, CalendarDays } from "lucide-react";
import { Reorder } from "framer-motion";

const WeeklyIcon = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="12" x2="12" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <rect x="3" y="13" width="18" height="4" fill="currentColor" stroke="none" />
  </svg>
);

const DEFAULT_TABS = [
  { id: "DAILY", label: "Today", icon: Calendar },
  { id: "JOURNAL", label: "Journal", icon: BookOpen },
  { id: "IDEAL_WEEK", label: "Ideal Week", icon: TrendingUp },
  { id: "QUARTERLY_GOALS", label: "Goals", icon: Target },
  { id: "RITUALS", label: "Rituals", icon: Moon },
  { id: "WEEKLY", label: "Weekly", icon: WeeklyIcon },
];

const ICONS_MAP = {
  DAILY: Calendar,
  JOURNAL: BookOpen,
  IDEAL_WEEK: TrendingUp,
  QUARTERLY_GOALS: Target,
  RITUALS: Moon,
  WEEKLY: WeeklyIcon
};

export default function TabBar({ activeTemplate, onTemplateChange, journalMode, onJournalModeChange }) {
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem("planner_tabs_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Make sure newly added tabs appear even if user has saved an old layout
        const parsedIds = parsed.map(t => t.id);
        const missingTabs = DEFAULT_TABS.filter(t => !parsedIds.includes(t.id));
        return [...parsed, ...missingTabs].map(tab => ({ ...tab, icon: ICONS_MAP[tab.id] }));
      } catch (e) {}
    }
    return DEFAULT_TABS;
  });

  const handleReorder = (newOrder) => {
    setTabs(newOrder);
    localStorage.setItem("planner_tabs_order", JSON.stringify(newOrder.map(t => ({ id: t.id, label: t.label }))));
  };

  return (
    <>
      {/* Primary Navigation */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-20 flex flex-col items-center pt-6 pb-4 pointer-events-auto z-50 overflow-y-auto no-scrollbar border-r border-black/20" 
        style={{background: "#1A120B"}}
      >
        <div className="w-full flex-1 flex flex-col">
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
                      color: isActive ? "#F97316" : "#8B7355",
                      backgroundColor: isActive ? "rgba(249, 115, 22, 0.1)" : "transparent",
                      textShadow: isActive ? "0 0 8px rgba(249, 115, 22, 0.6)" : "none",
                    }}
                  >
                    <Icon size={22} style={{ filter: isActive ? "drop-shadow(0 0 6px rgba(249, 115, 22, 0.6))" : "none" }} />
                    <span className="text-[10px] font-medium tracking-wide uppercase">{tab.label}</span>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-14 w-1" style={{
                        background: "#F97316",
                        boxShadow: "0 0 12px 2px rgba(249, 115, 22, 0.8)"
                      }} />
                    )}
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
      </div>

      {/* Secondary Navigation for Journal Modes */}
      {activeTemplate === "JOURNAL" && (
        <div className="fixed left-20 top-16 bottom-0 w-20 flex flex-col items-center pt-6 pb-4 pointer-events-auto z-40 bg-white border-r border-[#E2E8F0] shadow-sm gap-4">
          <button
            onClick={() => onJournalModeChange("DAILY")}
            className={`flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all duration-200 gap-1.5 select-none ${
              journalMode === "DAILY" 
                ? "bg-[#1e293b] text-white shadow-md" 
                : "bg-white text-[#94a3b8] hover:bg-slate-50 border border-[#E2E8F0]"
            }`}
          >
            <Sun size={18} />
            <span className="text-[9px] font-bold tracking-wide">DAILY</span>
          </button>
          
          <button
            onClick={() => onJournalModeChange("WEEKEND")}
            className={`flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all duration-200 gap-1.5 select-none ${
              journalMode === "WEEKEND" 
                ? "bg-[#1e293b] text-white shadow-md" 
                : "bg-white text-[#94a3b8] hover:bg-slate-50 border border-[#E2E8F0]"
            }`}
          >
            <Coffee size={18} />
            <span className="text-[9px] font-bold tracking-wide">WKND</span>
          </button>

          <button
            onClick={() => onJournalModeChange("ANNUAL")}
            className={`flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all duration-200 gap-1.5 select-none ${
              journalMode === "ANNUAL" 
                ? "bg-[#1e293b] text-white shadow-md" 
                : "bg-white text-[#94a3b8] hover:bg-slate-50 border border-[#E2E8F0]"
            }`}
          >
            <CalendarDays size={18} />
            <span className="text-[9px] font-bold tracking-wide">ANNUAL</span>
          </button>
        </div>
      )}
    </>
  );
}