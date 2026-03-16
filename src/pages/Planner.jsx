import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import PortraitOverlay from "../components/planner/PortraitOverlay.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";
import TabBar from "../components/planner/TabBar.jsx";
import HeaderBar from "../components/planner/HeaderBar.jsx";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";
import { Trash2 } from "lucide-react";

export default function Planner() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 🛠️ Map URL path to your Template keys
  const getTemplateFromPath = useCallback((path) => {
    const p = path.toLowerCase();
    if (p.includes("today")) return "DAILY";
    if (p.includes("rituals")) return "RITUALS";
    if (p.includes("weekly-review")) return "WEEKLY";
    return "DAILY";
  }, []);

  const [activeTemplate, setActiveTemplate] = useState(getTemplateFromPath(location.pathname));
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const canvasRef = useRef(null);
  const localInkMemory = useRef({});

  // 🛠️ Sync template state if URL changes (back button / manual nav)
  useEffect(() => {
    setActiveTemplate(getTemplateFromPath(location.pathname));
  }, [location.pathname, getTemplateFromPath]);

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
  }, [pageKey, existingDrawing, saveMutation]);

  const handleClearInk = () => {
    if (window.confirm("Clear all ink from this page?")) {
      localInkMemory.current[pageKey] = null;
      if (existingDrawing?.id) {
        base44.entities.PageDrawing.delete(existingDrawing.id).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["pageDrawing", pageKey] });
      }
      canvasRef.current?.clear?.();
    }
  };

  // 🛠️ When a tab is clicked, update the URL (this fixes the "Black Screen" navigation)
  const handleTemplateChange = (newTemplate) => {
    const pathMap = {
      DAILY: "/today",
      RITUALS: "/rituals",
      WEEKLY: "/weekly-review"
    };
    navigate(pathMap[newTemplate] || "/today");
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{background: "#F4EFE4"}}>
      <PortraitOverlay />

      <TabBar activeTemplate={activeTemplate} onTemplateChange={handleTemplateChange} />
      
      <div className="fixed top-20 right-6 z-50 pointer-events-auto">
        <button
          onClick={handleClearInk}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded transition-colors"
          style={{color: "#b8956a"}}
        >
          <Trash2 size={20} />
        </button>
      </div>

      <HeaderBar selectedDate={selectedDate} onDateChange={setSelectedDate} isSynced={!saveMutation.isPending} />

      {/* Template Layout */}
      <div className="fixed left-20 right-0 top-16 bottom-0 z-10 pointer-events-none">
        <TemplateRenderer template={activeTemplate} date={selectedDate} />
      </div>

      {/* Drawing Canvas */}
      <div className="fixed left-20 right-0 top-16 bottom-0 z-20 pointer-events-auto">
        <GlobalCanvas
          ref={canvasRef}
          activeTemplate={activeTemplate}
          onSave={handleSaveInk}
          onClear={() => canvasRef.current?.clear?.()}
          savedImageData={currentImageData}
          pageKey={pageKey}
        />
      </div>
    </div>
  );
}