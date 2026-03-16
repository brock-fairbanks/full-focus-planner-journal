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
      style={{ touchAction: "none", overflow: "hidden", background: "linear-gradient(160deg, #2c1f14 0%, #3d2b1a 30%, #2e2015 70%, #1e1409 100%)" }}
    >
      <PortraitOverlay />

      {/* Three-zone header */}
      <BinderHeader dateLabel={dateLabel} onDateChange={handleDateChange} />

      {/* Binder body */}
      <div className="flex flex-1 min-h-0 px-4 py-4">
        <div
          className="flex flex-1 rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #3d2b1a 0%, #4a3520 50%, #3d2b1a 100%)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
            border: "2px solid #6b4226",
          }}
        >
          {/* Vertical Tab Strip */}
          <TabStrip activeTab={activeTab} onSelect={handleTabChange} />

          {/* Content area */}
          <div className="flex-1 flex flex-col overflow-hidden rounded-r-2xl">
            <PageSelector
              leftLabel="Schedule"
              rightLabel="Tasks"
              currentPage={mobilePage}
              onPageChange={setMobilePage}
            />

            {/* Pages */}
            <div className="flex-1 flex min-h-0 relative"
              style={{
                background: "#FAF9F6",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeBlend in='SourceGraphic' mode='multiply'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
              }}
            >
              {mobilePage === "left" ? (
                <div className="flex-1 h-full overflow-hidden">
                  <LeftPage />
                </div>
              ) : (
                <div className="flex-1 h-full overflow-hidden">
                  <RightPage />
                </div>
              )}

              <InkCanvas
                key={`ink-${pageKey}`}
                savedImageData={currentImageData}
                onSave={handleSave}
              />
            </div>
          </div>
        </div>
      </div>

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