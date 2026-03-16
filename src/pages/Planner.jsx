import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";

import PortraitOverlay from "../components/planner/PortraitOverlay";
import LeftPage from "../components/planner/LeftPage";
import RightPage from "../components/planner/RightPage";
import InkCanvas from "../components/planner/InkCanvas";

const BINDER_TABS = ["TODAY", "WEEKLY", "MONTHLY"];

function getPageKey(tab, date) {
  if (tab === "TODAY") return `today_${format(date, "yyyy-MM-dd")}`;
  if (tab === "WEEKLY") return `weekly_${format(date, "yyyy")}-W${format(date, "II")}`;
  return `monthly_${format(date, "yyyy-MM")}`;
}

function getDateLabel(tab, date) {
  if (tab === "TODAY") return format(date, "EEEE, MMMM d, yyyy");
  if (tab === "WEEKLY") return `Week ${format(date, "II")}, ${format(date, "yyyy")}`;
  return format(date, "MMMM yyyy");
}

export default function Planner() {
  const [activeTab, setActiveTab] = useState("TODAY");
  const [activeView, setActiveView] = useState("schedule"); // 'schedule' | 'big3'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const localInkMemory = useRef({});
  const queryClient = useQueryClient();

  const pageKey = getPageKey(activeTab, selectedDate);
  const dateLabel = getDateLabel(activeTab, selectedDate);

  // Fetch saved drawing
  const { data: drawings } = useQuery({
    queryKey: ["pageDrawing", pageKey],
    queryFn: () => base44.entities.PageDrawing.filter({ page_key: pageKey }),
    initialData: [],
    staleTime: 60000,
  });

  const existingDrawing = drawings?.[0];
  const currentImageData =
    localInkMemory.current[pageKey] || existingDrawing?.image_url || null;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pageDrawing", pageKey] });
    },
  });

  const handleSave = useCallback(
    (dataUrl) => {
      localInkMemory.current[pageKey] = dataUrl;
      saveMutation.mutate(dataUrl);
    },
    [pageKey, saveMutation]
  );

  const handleTabSwitch = (view) => {
    setActiveView(view);
  };

  const dark = isDarkMode;

  return (
    <div
      className="fixed inset-0 flex flex-col font-serif overflow-hidden"
      style={{ background: dark ? "#2a1c14" : "#e2e8f0" }}
    >
      <PortraitOverlay />

      {/* HEADER */}
      <div
        className="relative z-30 flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 border-b shadow-sm"
        style={{
          background: dark ? "#22150f" : "#ffffff",
          borderColor: dark ? "#4a3424" : "#cbd5e1",
        }}
      >
        <span
          className="text-sm md:text-xl font-bold tracking-widest uppercase"
          style={{ color: dark ? "#d4af37" : "#1e293b" }}
        >
          Executive OS
        </span>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Dark mode toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full transition-colors"
            style={{ color: dark ? "#f97316" : "#64748b" }}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Date navigation */}
          <div
            className="flex items-center gap-1 rounded-full border px-1 py-1"
            style={{
              background: dark ? "#1a0f0a" : "#f1f5f9",
              borderColor: dark ? "#4a3424" : "#cbd5e1",
            }}
          >
            <button
              onClick={() => setSelectedDate((d) => new Date())}
              className="px-3 py-1 text-xs font-bold uppercase rounded-full transition-colors hidden md:block"
              style={{ color: dark ? "#f97316" : "#ea580c" }}
            >
              • Today
            </button>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="p-1 md:p-2"
              style={{ color: dark ? "#e2e8f0" : "#475569" }}
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="min-w-[90px] md:min-w-[140px] text-center font-medium text-xs md:text-sm"
              style={{ color: dark ? "#e2e8f0" : "#1e293b" }}
            >
              {format(selectedDate, "EEE, MMM d")}
            </span>
            <button
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="p-1 md:p-2"
              style={{ color: dark ? "#e2e8f0" : "#475569" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN TOP TABS */}
      <div
        className="relative z-30 flex flex-shrink-0 border-b"
        style={{
          background: dark ? "#22150f" : "#ffffff",
          borderColor: dark ? "#4a3424" : "#cbd5e1",
        }}
      >
        {[
          { key: "schedule", label: "Daily Schedule" },
          { key: "big3", label: "Big 3" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabSwitch(key)}
            className="flex-1 py-3 text-xs md:text-sm font-bold tracking-widest uppercase transition-colors"
            style={{
              color:
                activeView === key
                  ? "#f97316"
                  : dark
                  ? "#94a3b8"
                  : "#64748b",
              borderBottom: activeView === key ? "2px solid #f97316" : "2px solid transparent",
              background:
                activeView === key
                  ? dark
                    ? "#1e293b"
                    : "#f8fafc"
                  : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* WORKSPACE */}
      <div className="flex-1 relative flex items-stretch p-2 md:p-6 overflow-hidden">

        {/* Vertical Binder Tabs */}
        <div className="relative z-30 flex flex-col gap-1 mr-[-1px] mt-4">
          {BINDER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                writingMode: "vertical-rl",
                background:
                  activeTab === tab
                    ? dark
                      ? "#1e293b"
                      : "#ffffff"
                    : dark
                    ? "#2a1c14"
                    : "#e2e8f0",
                color:
                  activeTab === tab
                    ? "#f97316"
                    : dark
                    ? "#a8a29e"
                    : "#64748b",
                borderColor: dark ? "#334155" : "#cbd5e1",
              }}
              className="px-2 md:px-3 py-4 md:py-6 text-[10px] md:text-xs font-bold tracking-widest rounded-l-md border border-r-0 cursor-pointer transition-colors"
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Page */}
        <div
          className="relative flex flex-col w-full max-w-7xl rounded-r-xl rounded-l-none shadow-2xl border overflow-hidden"
          style={{
            background: dark ? "#1e293b" : "#ffffff",
            borderColor: dark ? "#334155" : "#cbd5e1",
          }}
        >
          {/* Content layer */}
          <div className="absolute inset-0 z-10 overflow-y-auto pointer-events-none">
            <div className="pointer-events-auto p-4 md:p-8 h-full">
              {activeView === "schedule" && <LeftPage dark={dark} />}
              {activeView === "big3" && <RightPage dark={dark} />}
            </div>
          </div>

          {/* Ink canvas */}
          <InkCanvas
            key={`ink-${pageKey}-${activeView}`}
            savedImageData={currentImageData}
            onSave={handleSave}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div
        className="relative z-30 flex-shrink-0 p-2 md:p-3 flex justify-center gap-6 md:gap-10 border-t shadow-sm"
        style={{
          background: dark ? "#22150f" : "#ffffff",
          borderColor: dark ? "#4a3424" : "#cbd5e1",
        }}
      >
        <span
          className="text-[10px] md:text-xs font-bold uppercase tracking-widest"
          style={{ color: dark ? "#64748b" : "#94a3b8" }}
        >
          {dateLabel}
        </span>
        {saveMutation.isPending && (
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-500">
            Saving…
          </span>
        )}
      </div>
    </div>
  );
}