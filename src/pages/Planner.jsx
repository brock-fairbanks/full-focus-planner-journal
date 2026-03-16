import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDays } from "date-fns";
import TabBar from "../components/planner/TabBar.jsx";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";
import HeaderBar from "../components/planner/HeaderBar.jsx";

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const pointerStartRef = useRef(null);
  const lastPenTimeRef = useRef(0);

  useEffect(() => {
    setActiveTemplate(getTemplateFromPath(location.pathname));
  }, [location.pathname, getTemplateFromPath]);

  // Global Palm Rejection
  useEffect(() => {
    const handlePointer = (e) => {
      if (e.pointerType === 'pen') {
        lastPenTimeRef.current = Date.now();
      } else if (e.pointerType === 'touch') {
        if (Date.now() - lastPenTimeRef.current < 1000) {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    const handleTouch = (e) => {
      if (Date.now() - lastPenTimeRef.current < 1000) {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
      }
    };

    window.addEventListener('pointerdown', handlePointer, { capture: true, passive: false });
    window.addEventListener('pointermove', handlePointer, { capture: true, passive: false });
    window.addEventListener('pointerup', handlePointer, { capture: true, passive: false });
    
    window.addEventListener('touchstart', handleTouch, { capture: true, passive: false });
    window.addEventListener('touchmove', handleTouch, { capture: true, passive: false });

    return () => {
      window.removeEventListener('pointerdown', handlePointer, { capture: true });
      window.removeEventListener('pointermove', handlePointer, { capture: true });
      window.removeEventListener('pointerup', handlePointer, { capture: true });
      window.removeEventListener('touchstart', handleTouch, { capture: true });
      window.removeEventListener('touchmove', handleTouch, { capture: true });
    };
  }, []);

  const handlePointerDown = (e) => {
    // Only allow swipe navigation with finger (touch), not stylus/pen or mouse
    if (e.pointerType !== 'touch') return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handlePointerUp = (e) => {
    if (!pointerStartRef.current || e.pointerType !== 'touch') return;
    
    const dx = pointerStartRef.current.x - e.clientX;
    const dy = pointerStartRef.current.y - e.clientY;
    
    // Swipe requires at least 80px distance and mostly horizontal movement
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        setSelectedDate(prev => addDays(prev, 1)); // Swipe left -> Next day
      } else {
        setSelectedDate(prev => addDays(prev, -1)); // Swipe right -> Prev day
      }
    }
    
    pointerStartRef.current = null;
  };

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

  const pageKey = `${activeTemplate}${activeTemplate === "DAILY" && subSection ? `_${subSection}` : ''}_${selectedDate.toISOString().split('T')[0]}`;

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-[#F4EFE4]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
    >
      {/* Sidebar - Highest Z-index */}
      <TabBar activeTemplate={activeTemplate} onTemplateChange={handleTabChange} />
      
      <HeaderBar 
        selectedDate={selectedDate} 
        onDateChange={setSelectedDate} 
        isSynced={true} 
      />

      {/* Content Area */}
      <div className="fixed left-20 right-0 top-16 bottom-0 bg-[#FAF9F6]">
        {/* Template Layer (z-10) */}
        <div className="absolute inset-0 z-10 pointer-events-none [&_button]:pointer-events-auto">
          <TemplateRenderer template={activeTemplate} date={selectedDate} onSubSectionChange={setSubSection} />
        </div>
        
        {/* Drawing Layer (z-20) */}
        <div className={`absolute inset-x-0 bottom-0 z-20 pointer-events-auto ${activeTemplate === "DAILY" ? "top-[72px]" : "top-0"}`}>
          {/* FIXED: Using standard 'ref' instead of 'ref__' */}
          <GlobalCanvas ref={canvasRef} pageKey={pageKey} activeTemplate={activeTemplate} />
        </div>
      </div>
    </div>
  );
}