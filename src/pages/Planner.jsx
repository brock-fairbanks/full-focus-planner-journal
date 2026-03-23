import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDays } from "date-fns";
import { Mic, MessagesSquare, Eraser, Pen, Highlighter, Undo, FileEdit, Type, Loader2, X, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TabBar from "../components/planner/TabBar.jsx";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";
import HeaderBar from "../components/planner/HeaderBar.jsx";
import { useIsMobile, useIsSmallPhone } from "@/hooks/use-mobile.jsx";
import MeetingSpreadMobile from "../components/planner/templates/MeetingSpreadMobile.jsx";

export default function Planner() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const isMobile = useIsMobile();
  const isSmallPhone = useIsSmallPhone();

  const getTemplateFromPath = useCallback((path) => {
    const p = path.toLowerCase();
    if (p.includes("today")) return "DAILY";
    if (p.includes("rituals")) return "RITUALS";
    if (p.includes("weekly-review")) return "WEEKLY";
    if (p.includes("ideal-week")) return "IDEAL_WEEK";
    if (p.includes("goals")) return "QUARTERLY_GOALS";
    if (p.includes("journal")) return "JOURNAL";
    if (p.includes("meeting")) return "MEETING";
    if (p.includes("chat")) return "CHAT";
    if (p.includes("scratchpad")) return "SCRATCHPAD";
    return "DAILY";
  }, []);

  const [activeTemplate, setActiveTemplate] = useState(getTemplateFromPath(location.pathname));
  const [subSection, setSubSection] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalMode, setJournalMode] = useState("DAILY");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState("pen"); // 'pen' | 'highlighter' | 'eraser'
  const [isEraserMode, setIsEraserMode] = useState(false); // For quick hold-to-erase
  const [penWidth, setPenWidth] = useState(() => Number(localStorage.getItem('planner_penWidth')) || 2.2);
  const [eraserWidth, setEraserWidth] = useState(() => Number(localStorage.getItem('planner_eraserWidth')) || 30);
  const [highlighterWidth, setHighlighterWidth] = useState(() => Number(localStorage.getItem('planner_highlighterWidth')) || 16);
  const [highlighterColor, setHighlighterColor] = useState(() => localStorage.getItem('planner_highlighterColor') || 'rgba(253, 224, 71, 0.8)');
  const pointerStartRef = useRef(null);
  const lastPenTimeRef = useRef(0);

  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleTranscribe = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.getDataUrl();
    if (!dataUrl || dataUrl === "data:,") {
      alert("No drawing found to transcribe.");
      return;
    }

    setIsTranscribing(true);

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'handwriting.webp', { type: 'image/webp' });

      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: "Please transcribe the handwritten text in this image. Only return the transcribed text, nothing else. Preserve line breaks. Do not add any introductory or concluding remarks. Just the text.",
        file_urls: [uploadRes.file_url],
        model: "gemini_3_flash"
      });

      if (res && !res.toLowerCase().includes("no handwriting detected")) {
          canvasRef.current.convertHandwritingToText(res);
      } else {
          alert("Could not detect handwriting.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to transcribe handwriting. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('planner_penWidth', penWidth.toString());
  }, [penWidth]);

  useEffect(() => {
    localStorage.setItem('planner_eraserWidth', eraserWidth.toString());
  }, [eraserWidth]);

  useEffect(() => {
    localStorage.setItem('planner_highlighterWidth', highlighterWidth.toString());
  }, [highlighterWidth]);

  useEffect(() => {
    localStorage.setItem('planner_highlighterColor', highlighterColor);
  }, [highlighterColor]);

  useEffect(() => {
    if (isSmallPhone) {
      if (location.pathname !== "/meeting") {
        navigate("/meeting", { replace: true });
      }
      setActiveTemplate("MEETING");
    } else {
      setActiveTemplate(getTemplateFromPath(location.pathname));
    }
  }, [location.pathname, getTemplateFromPath, isSmallPhone, navigate]);

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
      MEETING: "/meeting",
      CHAT: "/chat",
      SCRATCHPAD: "/scratchpad"
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
  let pageKey = `${activeTemplate}${(activeTemplate === "DAILY" || activeTemplate === "JOURNAL") && subSection ? `_${subSection}` : ''}_${datePart}`;
  if (activeTemplate === "SCRATCHPAD") {
      pageKey = subSection ? `SCRATCHPAD_${subSection}` : `SCRATCHPAD_${datePart}`;
  }

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-[#F4EFE4]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
    >
      {/* Sidebar - Highest Z-index */}
      {!isFullscreen && !isSmallPhone && (
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

          {/* Tools Sub Header */}
          <div id="tour-subheader" className={`fixed top-16 right-0 h-10 bg-[#E5E0D8] flex items-center justify-end px-4 gap-4 z-40 ${activeTemplate === "JOURNAL" ? "left-48 md:left-52" : "left-24"} transition-all duration-300 ease-in-out`}>
            <button 
                onClick={() => handleTabChange("MEETING")}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTemplate === 'MEETING' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
                <Mic size={16} /> Meeting/Lecture
            </button>
            <button 
                onClick={() => handleTabChange("CHAT")}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTemplate === 'CHAT' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
                <MessagesSquare size={16} /> AI Chat
            </button>
            <button 
                id="tour-scratchpad-nav-btn"
                onClick={() => handleTabChange("SCRATCHPAD")}
                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTemplate === 'SCRATCHPAD' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
                <FileEdit size={16} /> Scratchpad
            </button>
          </div>
        </>
      )}

      {/* Content Area */}
      <div 
        className={`fixed ${
          isFullscreen || isSmallPhone
            ? "left-0 top-0" 
            : (activeTemplate === "JOURNAL" ? "left-48 md:left-52 top-[104px]" : "left-24 top-[104px]")
        } right-0 bottom-0 ${activeTemplate === 'SCRATCHPAD' ? 'bg-[#E5E0D8]' : 'bg-[#FAF9F6]'} overflow-y-auto overflow-x-auto transition-all duration-300 ease-in-out`}
      >
        <div className={`relative min-h-full w-full flex flex-col ${isSmallPhone ? 'min-w-0' : 'min-w-[1024px]'}`}>
          {/* Fullscreen Toggle & Tools */}
          {!isSmallPhone && (
          <div className={`w-full flex justify-between items-center p-3 shrink-0 z-50 pointer-events-auto sticky top-0 left-0 ${activeTemplate === 'SCRATCHPAD' ? 'bg-[#E5E0D8]' : 'bg-[#FAF9F6]'} border-b border-black/5`}>
            <button
              id="tour-fullscreen-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] rounded-lg shadow-sm text-[#94a3b8] hover:text-[#1e293b] transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

            <div id="topbar-center-portal" className="flex-1 flex justify-center pointer-events-auto mx-4"></div>

            {activeTemplate !== "MEETING" && activeTemplate !== "CHAT" && (
              <div id="tour-tools" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] p-1.5 rounded-xl shadow-sm">
                <button
                  onClick={() => setActiveTool('pen')}
                  className={`p-2.5 rounded-lg transition-colors ${(activeTool === 'pen' && !isEraserMode) ? 'bg-slate-200 text-[#1e293b]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title="Pen"
                >
                  <Pen size={20} />
                </button>
                <button
                  onClick={() => setActiveTool('highlighter')}
                  className={`p-2.5 rounded-lg transition-colors ${(activeTool === 'highlighter' && !isEraserMode) ? 'bg-slate-200 text-[#1e293b]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title="Highlighter"
                >
                  <Highlighter size={20} />
                </button>
                <button
                  onClick={() => setActiveTool('eraser')}
                  onPointerDown={() => setIsEraserMode(true)}
                  onPointerUp={() => setIsEraserMode(false)}
                  onPointerLeave={() => setIsEraserMode(false)}
                  onPointerCancel={() => setIsEraserMode(false)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`p-2.5 rounded-lg transition-colors select-none ${(activeTool === 'eraser' || isEraserMode) ? 'bg-slate-200 text-[#1e293b]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title="Eraser (Tap to select, Hold to quick-erase)"
                  style={{ touchAction: 'none' }}
                >
                  <Eraser size={20} />
                </button>
                <div className="flex items-center ml-2 gap-2 border-l border-slate-200 pl-2">
                  {(() => {
                    const currentTool = isEraserMode ? 'eraser' : activeTool;
                    if (currentTool === 'pen') {
                      return [1.5, 3, 5].map(w => (
                        <button key={w} onClick={() => setPenWidth(w)} className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${penWidth === w ? 'bg-slate-200' : 'hover:bg-slate-100'}`} title={`Thickness: ${w}`}>
                          <div className="bg-[#1e293b] rounded-full" style={{ width: w + 2, height: w + 2 }}></div>
                        </button>
                      ));
                    }
                    if (currentTool === 'highlighter') {
                      return (
                        <>
                          <select 
                            value={highlighterWidth} 
                            onChange={(e) => setHighlighterWidth(Number(e.target.value))}
                            className="h-8 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-sm text-[#1e293b] outline-none cursor-pointer border-none font-medium"
                            title="Highlighter Size"
                          >
                            {[10, 14, 18, 24, 30, 40, 50, 60, 80, 100].map(w => (
                              <option key={w} value={w}>Size {w}</option>
                            ))}
                          </select>
                          <div className="w-px h-6 bg-slate-200 mx-1"></div>
                          {[
                            { c: 'rgba(253, 224, 71, 0.8)', bg: '#fef08a' },
                            { c: 'rgba(167, 243, 208, 0.8)', bg: '#a7f3d0' },
                            { c: 'rgba(251, 207, 232, 0.8)', bg: '#fbcfe8' },
                            { c: 'rgba(191, 219, 254, 0.8)', bg: '#bfdbfe' }
                          ].map(item => (
                            <button key={item.c} onClick={() => setHighlighterColor(item.c)} className={`w-7 h-7 rounded-full border border-slate-200 ${highlighterColor === item.c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ backgroundColor: item.bg }} title="Color" />
                          ))}
                        </>
                      );
                    }
                    if (currentTool === 'eraser') {
                      return (
                        <select 
                          value={eraserWidth} 
                          onChange={(e) => setEraserWidth(Number(e.target.value))}
                          className="h-8 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-sm text-[#1e293b] outline-none cursor-pointer border-none font-medium"
                          title="Eraser Size"
                        >
                          {[10, 20, 30, 40, 50, 60, 80, 100, 150, 200].map(w => (
                            <option key={w} value={w}>Size {w}</option>
                          ))}
                        </select>
                      );
                    }
                  })()}
                </div>
                <div className="flex items-center ml-2 gap-2 border-l border-slate-200 pl-2">
                  <button
                    onClick={() => canvasRef.current?.undo && canvasRef.current.undo()}
                    className="p-2.5 rounded-lg transition-colors text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Undo"
                  >
                    <Undo size={20} />
                  </button>
                  <button
                    onClick={handleTranscribe}
                    disabled={isTranscribing}
                    className="flex items-center gap-1.5 p-2 rounded-lg transition-colors text-slate-400 hover:text-orange-500 hover:bg-orange-50 font-medium text-sm disabled:opacity-50"
                    title="Convert Handwriting to Text"
                  >
                    {isTranscribing ? <Loader2 size={18} className="animate-spin text-orange-500" /> : <Type size={18} />}
                    <span className="hidden xl:inline">{isTranscribing ? "Converting..." : "To Text"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Template Layer */}
          <div id="tour-content-area" className={`flex-1 w-full pointer-events-auto mx-auto relative ${activeTemplate === 'SCRATCHPAD' ? 'max-w-[95%]' : 'max-w-5xl'}`}>
            <TemplateRenderer template={activeTemplate} date={selectedDate} onSubSectionChange={setSubSection} onClearCanvas={handleClearCanvas} journalMode={journalMode} />
          </div>
          
          {/* Drawing Layer (z-20) */}
          {activeTemplate !== "MEETING" && activeTemplate !== "CHAT" && (
            <div 
              id="tour-canvas"
              className={`absolute bottom-0 z-20 pointer-events-auto mx-auto inset-x-0 w-full ${activeTemplate === 'SCRATCHPAD' ? 'max-w-[95%]' : 'max-w-5xl'}`} 
              style={{ 
                top: (activeTemplate === "DAILY" || activeTemplate === "JOURNAL") ? "72px" : "0px",
              }}
            >
              <GlobalCanvas 
                key={pageKey}
                ref={canvasRef} 
                pageKey={pageKey} 
                activeTemplate={activeTemplate} 
                activeTool={activeTool}
                isEraserMode={isEraserMode} 
                penWidth={penWidth}
                eraserWidth={eraserWidth}
                highlighterWidth={highlighterWidth}
                highlighterColor={highlighterColor}
              />
            </div>
          )}
        </div>
      </div>

      {/* Processing Overlay */}
      {isTranscribing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
            <Loader2 size={40} className="animate-spin text-orange-500" />
            <div className="text-center">
              <h3 className="font-bold text-lg text-slate-800">Converting Handwriting...</h3>
              <p className="text-slate-500 text-sm mt-1">This might take a few seconds.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}