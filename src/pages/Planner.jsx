import React, { useState, useRef, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";

import PortraitOverlay from "../components/planner/PortraitOverlay";
import BinderHeader from "../components/planner/BinderHeader";
import TabStrip from "../components/planner/TabStrip";
import PageSelector from "../components/planner/PageSelector";
import LeftPage from "../components/planner/LeftPage";
import RightPage from "../components/planner/RightPage";
import BinderSpine from "../components/planner/BinderSpine";
import InkCanvas from "../components/planner/InkCanvas";

function getPageKey(tab) {
  const now = new Date();
  if (tab === "today") return `today_${format(now, "yyyy-MM-dd")}`;
  if (tab === "weekly") {
    const weekNum = format(now, "II");
    return `weekly_${format(now, "yyyy")}-W${weekNum}`;
  }
  return `monthly_${format(now, "yyyy-MM")}`;
}

function getDateLabel(tab, date) {
  if (tab === "today") return format(date, "EEEE, MMMM d, yyyy");
  if (tab === "weekly") return `Week ${format(date, "II")}, ${format(date, "yyyy")}`;
  return format(date, "MMMM yyyy");
}

export default function Planner() {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mobilePage, setMobilePage] = useState("left");
  const localInkMemory = useRef({});
  const queryClient = useQueryClient();

  const handleDateChange = (days) => {
    setSelectedDate((d) => addDays(d, days));
  };

  const pageKey = getPageKey(activeTab);
  const dateLabel = getDateLabel(activeTab, selectedDate);

  // Fetch saved drawing for current tab
  const { data: drawings } = useQuery({
    queryKey: ["pageDrawing", pageKey],
    queryFn: () => base44.entities.PageDrawing.filter({ page_key: pageKey }),
    initialData: [],
    staleTime: 60000,
  });

  const existingDrawing = drawings?.[0];

  // Get image data: prefer local cache, then server
  const currentImageData =
    localInkMemory.current[pageKey] ||
    existingDrawing?.image_url ||
    null;

  // Save mutation — upload file first, then store URL
  const saveMutation = useMutation({
    mutationFn: async (dataUrl) => {
      // Convert base64 data URL to a Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${pageKey}.png`, { type: "image/png" });

      // Upload via UploadFile integration
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      if (existingDrawing?.id) {
        return base44.entities.PageDrawing.update(existingDrawing.id, {
          image_url: file_url,
        });
      }
      return base44.entities.PageDrawing.create({
        page_key: pageKey,
        tab: activeTab,
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

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        touchAction: "none",
        overflow: "hidden",
        background: "#1a120b",
      }}
    >
      <PortraitOverlay />
      <BinderHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        dateLabel={dateLabel}
      />

      {/* Binder body */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Page */}
        <div className="flex-1 min-w-0 h-full">
          <LeftPage />
        </div>

        {/* Spine */}
        <BinderSpine />

        {/* Right Page */}
        <div className="flex-1 min-w-0 h-full">
          <RightPage />
        </div>

        {/* Ink canvas spans the full binder, above both pages */}
        <InkCanvas
          key={`ink-${pageKey}`}
          savedImageData={currentImageData}
          onSave={handleSave}
        />
      </div>

      {/* Save indicator */}
      {saveMutation.isPending && (
        <div
          className="fixed bottom-4 right-4 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: "#f59e0b", color: "#1a120b" }}
        >
          Saving…
        </div>
      )}
    </div>
  );
}