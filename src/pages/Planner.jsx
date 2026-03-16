import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TabBar from "../components/planner/TabBar.jsx";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";

export default function Planner() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

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
  const [subSection, setSubSection] = useState("");

  useEffect(() => {
    setActiveTemplate(getTemplateFromPath(location.pathname));
  }, [location.pathname, getTemplateFromPath]);

  const handleTabChange = (templateId) => {
    const pathMap = {
      DAILY: "/today",
      RITUALS: "/rituals",
      WEEKLY: "/weekly-review",
      IDEAL_WEEK: "/ideal-week",
      QUARTERLY_GOALS: "/goals"
    };
    navigate(pathMap[templateId] || "/today");
  };

  const pageKey = `${activeTemplate}_${new Date().toISOString().split('T')[0]}`;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#F4EFE4]">
      {/* Sidebar - Highest Z-index */}
      <TabBar activeTemplate={activeTemplate} onTemplateChange={handleTabChange} />
      
      {/* Content Area */}
      <div className="fixed left-20 right-0 top-0 bottom-0 bg-[#FAF9F6]">
        {/* Template Layer (z-10) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <TemplateRenderer template={activeTemplate} date={new Date()} />
        </div>
        
        {/* Drawing Layer (z-20) */}
        <div className="absolute inset-0 z-20 pointer-events-auto">
          {/* FIXED: Using standard 'ref' instead of 'ref__' */}
          <GlobalCanvas ref={canvasRef} pageKey={pageKey} activeTemplate={activeTemplate} />
        </div>
      </div>
    </div>
  );
}