import React, { useState, useEffect, useRef } from "react";
import { Calendar, Target, Moon, TrendingUp, BookOpen, Sun, Coffee, CalendarDays, LogOut, Mic, Settings, MessagesSquare } from "lucide-react";
import { Reorder } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

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
  const { user } = useAuth();
  const lastPointerRef = React.useRef('mouse');
  
  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "User";

  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem("planner_tabs_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved).filter(t => t.id !== "MEETING" && t.id !== "CHAT");
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
        id="tour-sidebar"
        className="fixed left-0 top-16 bottom-0 w-20 flex flex-col items-center pt-4 pb-2 pointer-events-auto z-40 overflow-hidden border-r border-slate-800 bg-[#0f172a] shadow-xl" 
        onPointerDown={(e) => { lastPointerRef.current = e.pointerType; }}
      >
        <div className="w-full flex flex-col items-center justify-center pb-4 mb-2 border-b border-slate-800 shrink-0 mt-2">
          <span 
            className="text-xs md:text-sm font-bold tracking-widest uppercase text-center px-1 w-full overflow-hidden text-ellipsis whitespace-nowrap text-orange-500"
            style={{
              textShadow: "0 0 10px rgba(249, 115, 22, 0.8)"
            }}
          >
            {firstName}
          </span>
        </div>
        <div className="w-full flex-1 flex flex-col">
          <Reorder.Group axis="y" values={tabs} onReorder={handleReorder} className="w-full h-full flex flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTemplate === tab.id;
              return (
                <Reorder.Item 
                  key={tab.id} 
                  value={tab} 
                  className="w-full cursor-grab active:cursor-grabbing flex-1 flex flex-col"
                  dragConstraints={{ top: 0, bottom: 0 }}
                >
                  <button
                    onClick={() => { if (lastPointerRef.current === 'mouse') onTemplateChange(tab.id); }}
                    onDoubleClick={() => onTemplateChange(tab.id)}
                    className={`relative flex flex-col items-center justify-center w-full flex-1 min-h-0 transition-all duration-200 gap-1.5 select-none py-2 hover:bg-slate-800/50 ${isActive ? 'bg-slate-800/80 text-orange-500' : 'text-slate-400'}`}
                    title={tab.label}
                    style={{
                      textShadow: isActive ? "0 0 10px rgba(249, 115, 22, 0.8)" : "none",
                    }}
                  >
                    <Icon size={22} style={{ filter: isActive ? "drop-shadow(0 0 8px rgba(249, 115, 22, 0.8))" : "none" }} className="md:w-6 md:h-6" />
                    <span className="text-[10px] md:text-xs font-bold tracking-wide uppercase text-center leading-tight px-1">{tab.label}</span>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-r-md bg-orange-500" style={{
                        boxShadow: "0 0 12px 3px rgba(249, 115, 22, 0.8)"
                      }} />
                    )}
                  </button>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
        <div className="w-full flex flex-col items-center justify-center pt-2 pb-2 mt-auto border-t border-slate-800 shrink-0">
          <a
            href="/settings"
            onClick={(e) => { if (lastPointerRef.current !== 'mouse') e.preventDefault(); }}
            onDoubleClick={() => window.location.href = "/settings"}
            className="flex flex-col items-center justify-center w-full h-14 transition-all duration-200 gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
            title="Settings"
          >
            <Settings size={20} className="md:w-5 md:h-5" />
            <span className="text-[10px] md:text-xs font-bold tracking-wide uppercase">Settings</span>
          </a>
          <button
            onClick={() => { if (lastPointerRef.current === 'mouse') base44.auth.logout(); }}
            onDoubleClick={() => base44.auth.logout()}
            className="flex flex-col items-center justify-center w-full h-14 transition-all duration-200 gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
            title="Logout"
          >
            <LogOut size={20} className="md:w-5 md:h-5" />
            <span className="text-[10px] md:text-xs font-bold tracking-wide uppercase">Logout</span>
          </button>
        </div>
      </div>

      {/* Secondary Navigation for Journal Modes */}
      {activeTemplate === "JOURNAL" && (
        <div 
          id="tour-journal-modes"
          className="fixed left-20 top-16 bottom-0 w-20 md:w-24 flex flex-col items-center pt-6 pb-4 pointer-events-auto z-40 bg-[#1e293b] border-r border-slate-800 shadow-xl gap-4"
          onPointerDown={(e) => { lastPointerRef.current = e.pointerType; }}
        >
          <button
            onClick={() => { if (lastPointerRef.current === 'mouse') onJournalModeChange("DAILY"); }}
            onDoubleClick={() => onJournalModeChange("DAILY")}
            className={`flex flex-col items-center justify-center w-16 md:w-20 h-20 rounded-xl transition-all duration-200 gap-2 select-none ${
              journalMode === "DAILY" 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600"
            }`}
          >
            <Sun size={22} className="md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs font-bold tracking-wide">DAILY</span>
          </button>
          
          <button
            onClick={() => { if (lastPointerRef.current === 'mouse') onJournalModeChange("WEEKEND"); }}
            onDoubleClick={() => onJournalModeChange("WEEKEND")}
            className={`flex flex-col items-center justify-center w-16 md:w-20 h-20 rounded-xl transition-all duration-200 gap-2 select-none ${
              journalMode === "WEEKEND" 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600"
            }`}
          >
            <Coffee size={22} className="md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs font-bold tracking-wide">WKND</span>
          </button>

          <button
            onClick={() => { if (lastPointerRef.current === 'mouse') onJournalModeChange("ANNUAL"); }}
            onDoubleClick={() => onJournalModeChange("ANNUAL")}
            className={`flex flex-col items-center justify-center w-16 md:w-20 h-20 rounded-xl transition-all duration-200 gap-2 select-none ${
              journalMode === "ANNUAL" 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                : "bg-transparent text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-600"
            }`}
          >
            <CalendarDays size={22} className="md:w-6 md:h-6" />
            <span className="text-[10px] md:text-xs font-bold tracking-wide">ANNUAL</span>
          </button>
        </div>
      )}
    </>
  );
}