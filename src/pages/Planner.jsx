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
    if (p.includes("journal")) return "JOURNAL";
    if (p.includes("meeting")) return "MEETING";
    return "DAILY";
  }, []);

  const [activeTemplate, setActiveTemplate] = useState(getTemplateFromPath(location.pathname));
  const [subSection, setSubSection] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalMode, setJournalMode] = useState("DAILY");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pointerStartRef = useRef(null);
  const lastPenTimeRef = useRef(0);

  useEffect(() => {
    setActiveTemplate(getTemplateFromPath(location.pathname));
  }, [location.pathname, getTemplateFromPath]);

  useEffect(() => {
    const isYearEnd = selectedDate.getMonth() === 11 && selectedDate.getDate() >= 25;
    const isWknd = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    if (isYearEnd) setJournalMode("ANNUAL");
    else if (isWknd) setJournalMode("WEEKEND");
    else setJournalMode("DAILY");
  }, [selectedDate]);

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

  const handleClearCanvas = useCallback(() => {
    if (canvasRef.current && canvasRef.current.clear) {
      canvasRef.current.clear();
    }
  }, []);

  const handleTabChange = (templateId) => {
    const pathMap = {
      DAILY: "/today",
      RITUALS: "/rituals",
      WEEKLY: "/weekly-review",
      IDEAL_WEEK: "/ideal-week",
      QUARTERLY_GOALS: "/goals",
      JOURNAL: "/journal",
      MEETING: "/meeting"
    };
    navigate(pathMap[templateId] || "/today");
  };

  let datePart = selectedDate.toISOString().split('T')[0];
  if (activeTemplate === "JOURNAL" && subSection) {
    if (subSection.startsWith("ANNUAL_")) {
      datePart = selectedDate.getFullYear().toString();
    } else if (subSection.startsWith("WEEKEND_")) {
      const d = new Date(selectedDate);
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      if (day === 0) d.setDate(d.getDate() - 1); // Group Sunday with Saturday
      datePart = d.toISOString().split('T')[0];
    }
  }
  const pageKey = `${activeTemplate}${(activeTemplate === "DAILY" || activeTemplate === "JOURNAL") && subSection ? `_${subSection}` : ''}_${datePart}`;

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-[#F4EFE4]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
    >
      {/* Sidebar - Highest Z-index */}
      {!isFullscreen && (
        <>
          <TabBar 
            activeTemplate={activeTemplate} 
            onTemplateChange={handleTabChange} 
            journalMode={journalMode}
            onJournalModeChange={setJournalMode}
          />
          
          <HeaderBar 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
            isSynced={true} 
            activeTemplate={activeTemplate}
          />
        </>
      )}

      {/* Content Area */}
      {/* Content Area */}
      <div 
        className={`fixed ${
          isFullscreen 
            ? "left-0 top-0" 
            : (activeTemplate === "JOURNAL" ? "left-40 top-16" : "left-20 top-16")
        } right-0 bottom-0 bg-[#FAF9F6] overflow-y-auto overflow-x-auto transition-all duration-300 ease-in-out`}
      >
        <div className="relative min-h-full w-full flex flex-col">
          {/* Fullscreen Toggle Button */}
          <div className="w-full flex justify-start p-2 shrink-0 z-30">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] rounded-md shadow-sm text-[#94a3b8] hover:text-[#1e293b] transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isFullscreen ? (
                <>
                  <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                  <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                </>
              ) : (
                <>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </>
              )}
            </svg>
            </button>
          </div>

          {/* Template Layer */}
          <div className="flex-1 w-full pointer-events-auto">
            <TemplateRenderer template={activeTemplate} date={selectedDate} onSubSectionChange={setSubSection} onClearCanvas={handleClearCanvas} journalMode={journalMode} />
          </div>
          
          {/* Drawing Layer (z-20) */}
          <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-auto" style={{ top: (activeTemplate === "DAILY" || activeTemplate === "JOURNAL") ? "72px" : "0px" }}>
            <GlobalCanvas ref={canvasRef} pageKey={pageKey} activeTemplate={activeTemplate} />
          </div>
        </div>
      </div>
    </div>
  );
}