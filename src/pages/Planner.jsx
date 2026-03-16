import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Zap } from "lucide-react";

import PortraitOverlay from "../components/planner/PortraitOverlay";
import GlobalCanvas from "../components/planner/GlobalCanvas";
import TemplateRenderer from "../components/planner/TemplateRenderer";
import TabBar from "../components/planner/TabBar";
import HeaderBar from "../components/planner/HeaderBar";

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
      <TabBar activeTemplate={activeTemplate} onTemplateChange={handleTemplateChange} />
      <HeaderBar selectedDate={selectedDate} onDateChange={setSelectedDate} isSynced={!saveMutation.isPending} />

      {/* Layer 0: Substrate (Static Background) */}
      <div className="absolute inset-0 top-16 bottom-16 pointer-events-none">
        <TemplateRenderer template={activeTemplate} date={selectedDate} />
      </div>

      {/* Layer 2: Global Canvas (Drawing) */}
      <div className="absolute inset-0 top-16 bottom-16" style={{ touchAction: "none", pointerEvents: "auto" }}>
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