import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Zap } from "lucide-react";

import PortraitOverlay from "../components/planner/PortraitOverlay.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";
import TabBar from "../components/planner/TabBar.jsx";
import HeaderBar from "../components/planner/HeaderBar.jsx";

const TEMPLATES = {
  DAILY: "DAILY",
  IDEAL_WEEK: "IDEAL_WEEK",
  QUARTERLY_GOALS: "QUARTERLY_GOALS",
  RITUALS: "RITUALS",
  WEEKLY_REVIEW: "WEEKLY_REVIEW",
};

export default function Planner() {
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES.DAILY);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const canvasRef = useRef(null);
  const localInkMemory = useRef({});
  const queryClient = useQueryClient();

  const pageKey = `${activeTemplate}_${format(selectedDate, "yyyy-MM-dd")}`;

  // Fetch saved drawing
  const { data: drawings = [] } = useQuery({
    queryKey: ["pageDrawing", pageKey],
    queryFn: () => base44.entities.PageDrawing.filter({ page_key: pageKey }),
    staleTime: 60000,
  });

  const existingDrawing = drawings[0];
  const currentImageData = localInkMemory.current[pageKey] || existingDrawing?.image_url;

  // Save ink mutation with debounce
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
  }, [pageKey, saveMutation]);

  const handleTemplateChange = (template) => {
    setActiveTemplate(template);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#FAF9F6" }}>
      <PortraitOverlay />

      {/* Layer 1: Active Anchors (Navigation UI) */}
      <div className="md:h-20 h-16">
        <TabBar activeTemplate={activeTemplate} onTemplateChange={handleTemplateChange} />
      </div>
      <div className="md:h-16 h-14">
        <HeaderBar selectedDate={selectedDate} onDateChange={setSelectedDate} isSynced={!saveMutation.isPending} />
      </div>

      {/* Layer 0: Substrate (Static Background) */}
      <div className="absolute left-20 md:left-24 right-0 md:top-36 top-30 bottom-0 pointer-events-none">
        <TemplateRenderer template={activeTemplate} date={selectedDate} />
      </div>

      {/* Layer 2: Global Canvas (Drawing) */}
      <div className="absolute left-20 md:left-24 right-0 md:top-36 top-30 bottom-0" style={{ touchAction: "none", pointerEvents: "auto" }}>
        <GlobalCanvas
          ref={canvasRef}
          onSave={handleSaveInk}
          savedImageData={currentImageData}
          pageKey={pageKey}
        />
      </div>
    </div>
  );
}