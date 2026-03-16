import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import PortraitOverlay from "../components/planner/PortraitOverlay.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";
import TabBar from "../components/planner/TabBar.jsx";
import HeaderBar from "../components/planner/HeaderBar.jsx";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";

export default function Planner() {
  const [activeTemplate, setActiveTemplate] = useState("DAILY");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const canvasRef = useRef(null);
  const localInkMemory = useRef({});
  const queryClient = useQueryClient();

  const pageKey = `${activeTemplate}_${format(selectedDate, "yyyy-MM-dd")}`;

  const { data: drawings = [] } = useQuery({
    queryKey: ["pageDrawing", pageKey],
    queryFn: () => base44.entities.PageDrawing.filter({ page_key: pageKey }),
    staleTime: 60000,
  });

  const existingDrawing = drawings[0];
  const currentImageData = localInkMemory.current[pageKey] || existingDrawing?.image_url;

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
        tab: activeTemplate,
        date_label: format(selectedDate, "EEE, MMM d, yyyy"),
        image_url: file_url,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pageDrawing", pageKey] }),
  });

  const handleSaveInk = useCallback((dataUrl) => {
    localInkMemory.current[pageKey] = dataUrl;
    saveMutation.mutate(dataUrl);
  }, [pageKey, existingDrawing]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#FAF9F6]">
      <PortraitOverlay />

      {/* Layer 1: Navigation */}
      <div className="relative z-50">
        <TabBar activeTemplate={activeTemplate} onTemplateChange={setActiveTemplate} />
        <HeaderBar selectedDate={selectedDate} onDateChange={setSelectedDate} isSynced={!saveMutation.isPending} />
      </div>

      {/* Layer 2: Template Layout */}
      <div className="fixed left-20 md:left-24 right-0 top-16 md:top-20 bottom-0 z-10 overflow-auto">
        <TemplateRenderer template={activeTemplate} date={selectedDate} />
      </div>

      {/* Layer 3: Drawing Canvas (on top) */}
      <div className="fixed left-20 md:left-24 right-0 top-16 md:top-20 bottom-0 z-20 pointer-events-none">
        <div className="pointer-events-auto w-full h-full">
          <GlobalCanvas
            ref={canvasRef}
            activeTemplate={activeTemplate}
            onSave={handleSaveInk}
            savedImageData={currentImageData}
            pageKey={pageKey}
          />
        </div>
      </div>
    </div>
  );
}