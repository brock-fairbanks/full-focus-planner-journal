import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";

import PortraitOverlay from "../components/planner/PortraitOverlay";
import InkCanvas from "../components/planner/InkCanvas";
import TodayPage from "../components/planner/pages/TodayPage";
import WeeklyPage from "../components/planner/pages/WeeklyPage";
import MonthlyPage from "../components/planner/pages/MonthlyPage";
import GoalsPage from "../components/planner/pages/GoalsPage";
// Each binder tab with its sub-tabs
const BINDER_TABS = [
  { key: "TODAY",   label: "TODAY",   subTabs: ["schedule", "big3", "braindump"] },
  { key: "WEEKLY",  label: "WEEKLY",  subTabs: ["overview", "goals", "review"] },
  { key: "MONTHLY", label: "MONTHLY", subTabs: ["calendar", "goals", "review"] },
  { key: "GOALS",   label: "GOALS",   subTabs: ["annual", "quarterly", "vision"] },
  { key: "INDEX",   label: "INDEX",   subTabs: ["contents", "habits", "notes"] },
];

const SUB_TAB_LABELS = {
  schedule: "Schedule", big3: "Big 3", braindump: "Brain Dump",
  overview: "Overview", goals: "Goals", review: "Review",
  calendar: "Calendar",
  annual: "Annual", quarterly: "Quarterly", vision: "Vision",
  contents: "Contents", habits: "Habits", notes: "Notes",
};

function getPageKey(tab, subTab, date) {
  if (tab === "TODAY") return `today_${format(date, "yyyy-MM-dd")}_${subTab}`;
  if (tab === "WEEKLY") return `weekly_${format(date, "yyyy")}-W${format(date, "II")}_${subTab}`;
  if (tab === "MONTHLY") return `monthly_${format(date, "yyyy-MM")}_${subTab}`;
  return `${tab.toLowerCase()}_${subTab}`;
}

function getDateLabel(tab, date) {
  if (tab === "TODAY") return format(date, "EEEE, MMMM d, yyyy");
  if (tab === "WEEKLY") return `Week ${format(date, "II")}, ${format(date, "yyyy")}`;
  if (tab === "MONTHLY") return format(date, "MMMM yyyy");
  return tab;
}

export default function Planner() {
  const [activeTab, setActiveTab] = useState("TODAY");
  const [subTab, setSubTab] = useState("schedule");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const localInkMemory = useRef({});
  const queryClient = useQueryClient();

  const dark = isDarkMode;
  const currentTabDef = BINDER_TABS.find(t => t.key === activeTab);
  const pageKey = getPageKey(activeTab, subTab, selectedDate);
  const dateLabel = getDateLabel(activeTab, selectedDate);

  // Fetch saved drawing
  const { data: drawings } = useQuery({
    queryKey: ["pageDrawing", pageKey],
    queryFn: () => base44.entities.PageDrawing.filter({ page_key: pageKey }),
    initialData: [],
    staleTime: 60000,
  });

  const existingDrawing = drawings?.[0];
  const currentImageData = localInkMemory.current[pageKey] || existingDrawing?.image_url || null;

  const saveMutation = useMutation({
    mutationFn: async (dataUrl) => {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${pageKey}.png`, { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (existingDrawing?.id) {
        return base44.entities.PageDrawing.update(existingDrawing.id, { image_url: file_url });
      }
      return base44.entities.PageDrawing.create({
        page_key: pageKey,
        tab: activeTab.toLowerCase(),
        date_label: dateLabel,
        image_url: file_url,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pageDrawing", pageKey] }),
  });

  const handleSave = useCallback(
    (dataUrl) => {
      localInkMemory.current[pageKey] = dataUrl;
      saveMutation.mutate(dataUrl);
    },
    [pageKey, saveMutation]
  );

  const handleBinderTabChange = (tab) => {
    setActiveTab(tab);
    const def = BINDER_TABS.find(t => t.key === tab);
    setSubTab(def.subTabs[0]);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col font-serif overflow-hidden"
      style={{ background: dark ? "#2a1c14" : "#e2e8f0" }}
    >
      <PortraitOverlay />

      {/* HEADER */}
      <div
        className="relative z-30 flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-2 border-b shadow-sm"
        style={{ background: dark ? "#22150f" : "#ffffff", borderColor: dark ? "#4a3424" : "#cbd5e1" }}
      >
        <span className="text-sm md:text-xl font-bold tracking-widest uppercase"
          style={{ color: dark ? "#d4af37" : "#1e293b" }}>
          Executive OS
        </span>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setIsDarkMode(!dark)} className="p-2 rounded-full transition-colors"
            style={{ color: dark ? "#f97316" : "#64748b" }}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="flex items-center gap-1 rounded-full border px-1 py-1"
            style={{ background: dark ? "#1a0f0a" : "#f1f5f9", borderColor: dark ? "#4a3424" : "#cbd5e1" }}>
            <button onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1 text-xs font-bold uppercase rounded-full hidden md:block"
              style={{ color: dark ? "#f97316" : "#ea580c" }}>
              • Today
            </button>
            <button onClick={() => setSelectedDate(d => addDays(d, -1))} className="p-1 md:p-2"
              style={{ color: dark ? "#e2e8f0" : "#475569" }}>
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[90px] md:min-w-[140px] text-center font-medium text-xs md:text-sm"
              style={{ color: dark ? "#e2e8f0" : "#1e293b" }}>
              {format(selectedDate, "EEE, MMM d")}
            </span>
            <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-1 md:p-2"
              style={{ color: dark ? "#e2e8f0" : "#475569" }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB BAR */}
      <div className="relative z-30 flex flex-shrink-0 border-b"
        style={{ background: dark ? "#22150f" : "#ffffff", borderColor: dark ? "#4a3424" : "#cbd5e1" }}>
        {currentTabDef.subTabs.map(st => (
          <button key={st} onClick={() => setSubTab(st)}
            className="flex-1 py-2.5 text-[10px] md:text-xs font-bold tracking-widest uppercase transition-colors"
            style={{
              color: subTab === st ? "#f97316" : dark ? "#94a3b8" : "#64748b",
              borderBottom: subTab === st ? "2px solid #f97316" : "2px solid transparent",
              background: subTab === st ? (dark ? "#1e293b" : "#f8fafc") : "transparent",
            }}>
            {SUB_TAB_LABELS[st]}
          </button>
        ))}
      </div>

      {/* WORKSPACE */}
      <div className="flex-1 relative flex items-stretch p-2 md:p-4 overflow-hidden">

        {/* Vertical Binder Tabs */}
        <div className="relative z-30 flex flex-col gap-1 mr-[-1px] mt-4">
          {BINDER_TABS.map(tab => (
            <button key={tab.key} onClick={() => handleBinderTabChange(tab.key)}
              style={{
                writingMode: "vertical-rl",
                background: activeTab === tab.key ? (dark ? "#1e293b" : "#ffffff") : (dark ? "#2a1c14" : "#e2e8f0"),
                color: activeTab === tab.key ? "#f97316" : (dark ? "#a8a29e" : "#64748b"),
                borderColor: dark ? "#334155" : "#cbd5e1",
              }}
              className="px-2 py-4 md:py-6 text-[9px] md:text-[10px] font-bold tracking-widest rounded-l-md border border-r-0 cursor-pointer transition-colors">
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Page */}
        <div className="relative flex flex-col w-full max-w-7xl rounded-r-xl shadow-2xl border overflow-hidden"
          style={{ background: dark ? "#1e293b" : "#ffffff", borderColor: dark ? "#334155" : "#cbd5e1" }}>

          {/* Content layer */}
          <div className="absolute inset-0 z-10 overflow-y-auto pointer-events-none">
            <div className="pointer-events-auto p-4 md:p-8 min-h-full">
              {activeTab === "TODAY"   && <TodayPage   subTab={subTab} dark={dark} />}
              {activeTab === "WEEKLY"  && <WeeklyPage  subTab={subTab} dark={dark} />}
              {activeTab === "MONTHLY" && <MonthlyPage subTab={subTab} dark={dark} selectedDate={selectedDate} />}
              {activeTab === "GOALS"   && <GoalsPage   subTab={subTab} dark={dark} />}
              {activeTab === "INDEX"   && <IndexPage   subTab={subTab} dark={dark} />}
            </div>
          </div>

          {/* Ink canvas */}
          <InkCanvas
            key={`ink-${pageKey}`}
            savedImageData={currentImageData}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="relative z-30 flex-shrink-0 p-2 flex justify-center gap-6 border-t"
        style={{ background: dark ? "#22150f" : "#ffffff", borderColor: dark ? "#4a3424" : "#cbd5e1" }}>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: dark ? "#64748b" : "#94a3b8" }}>
          {dateLabel}
        </span>
        {saveMutation.isPending && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Saving…</span>
        )}
      </div>
    </div>
  );
}