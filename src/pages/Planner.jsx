import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TabBar from "../components/planner/TabBar.jsx";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";

export default function Planner() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Precise Mapping
  const getTemplateFromPath = useCallback((path) => {
    const p = path.toLowerCase();
    if (p.includes("today")) return "DAILY";
    if (p.includes("rituals")) return "RITUALS";
    if (p.includes("weekly-review")) return "WEEKLY";
    if (p.includes("ideal-week")) return "IDEAL_WEEK";
    if (p.includes("goals")) return "QUARTERLY_GOALS";
    return "DAILY";
  }, []);

  const [activeTemplate, setActiveTemplate] = useState(getTemplateFromPath(location.pathname));

  // 2. Sync URL to State
  useEffect(() => {
    const newTemplate = getTemplateFromPath(location.pathname);
    setActiveTemplate(newTemplate);
  }, [location.pathname, getTemplateFromPath]);

  // 3. Tab Click Handler
  const handleTabChange = (id) => {
    const pathMap = {
      DAILY: "/today",
      RITUALS: "/rituals",
      WEEKLY: "/weekly-review",
      IDEAL_WEEK: "/ideal-week",
      QUARTERLY_GOALS: "/goals"
    };
    navigate(pathMap[id] || "/today");
  };

  return (
    /* 🛠️ FORCE CREAM BACKGROUND HERE TO KILL THE BLACK SCREEN */
    <div className="fixed inset-0 w-full h-full bg-[#F4EFE4]" style={{ backgroundColor: "#F4EFE4" }}>
      
      <TabBar activeTemplate={activeTemplate} onTemplateChange={handleTabChange} />

      <div className="fixed left-20 right-0 top-16 bottom-0 z-10">
        <TemplateRenderer template={activeTemplate} date={new Date()} />
      </div>

      <div className="fixed left-20 right-0 top-16 bottom-0 z-20 pointer-events-auto">
        <GlobalCanvas activeTemplate={activeTemplate} pageKey={`${activeTemplate}_page`} />
      </div>
    </div>
  );
}