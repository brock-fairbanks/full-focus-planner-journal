import React, { useState, useEffect, useCallback, useRef } from "react";
import { Eraser, Pen, Highlighter, Undo, Type, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { base44 } from "@/api/base44Client";
import TemplateRenderer from "../components/planner/TemplateRenderer.jsx";
import GlobalCanvas from "../components/planner/GlobalCanvas.jsx";

export default function TodayWidget() {
  const canvasRef = useRef(null);
  
  const [subSection, setSubSection] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTool, setActiveTool] = useState("pen"); // 'pen' | 'highlighter' | 'eraser'
  const [isEraserMode, setIsEraserMode] = useState(false);
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
        prompt: "Transcribe the handwritten text from the image. \n\nRULES:\n1. Return ONLY the text actually written. Do NOT describe the image.\n2. If the image is blank or contains no legible text, return an empty items array.\n3. Group text into distinct blocks based on physical location.\n4. If you see drawn emojis or symbols (smileys, hearts, stars, checkmarks), convert them to actual Unicode Emojis (e.g. 🙂, ❤️, ⭐, ✅).\n5. For each block, return:\n   - 'text': The content.\n   - 'x_percent': Horizontal start position (0.0=left, 1.0=right).\n   - 'y_percent': Vertical center position (0.0=top, 1.0=bottom).\n\nIf you are unsure of a word, mark it with [?]. Do not hallucinate text.",
        file_urls: [uploadRes.file_url],
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string", description: "The transcribed text block" },
                  x_percent: { type: "number", description: "Horizontal start position (0.00 to 1.00)" },
                  y_percent: { type: "number", description: "Vertical center position (0.00 to 1.00)" }
                },
                required: ["text", "x_percent", "y_percent"]
              }
            }
          },
          required: ["items"]
        }
      });

      if (res && res.items && res.items.length > 0) {
          canvasRef.current.convertHandwritingToText(res.items);
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
    if (e.pointerType !== 'touch') return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handlePointerUp = (e) => {
    if (!pointerStartRef.current || e.pointerType !== 'touch') return;
    pointerStartRef.current = null;
  };

  const handleClearCanvas = useCallback(() => {
    if (canvasRef.current && canvasRef.current.clear) {
      canvasRef.current.clear();
    }
  }, []);

  let datePart = selectedDate.toISOString().split('T')[0];
  let pageKey = `DAILY${subSection ? `_${subSection}` : ''}_${datePart}`;

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-[#FAF9F6] overflow-y-auto overflow-x-auto"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
    >
      <div className="relative min-h-full w-full flex flex-col min-w-[1024px]">
        {/* Fullscreen Toggle & Tools */}
        <div className="w-full flex justify-between items-center p-2 shrink-0 z-50 pointer-events-auto sticky top-0 left-0 bg-[#FAF9F6] border-b border-black/5">
          {/* Date Changer */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] p-1 rounded-lg shadow-sm">
            <button 
              onClick={() => setSelectedDate(prev => addDays(prev, -1))}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex flex-col items-center justify-center min-w-[90px] select-none">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-none">
                {format(selectedDate, "EEEE")}
              </span>
              <span className="text-sm font-semibold text-slate-800 leading-tight mt-0.5">
                {format(selectedDate, "MMM d, yyyy")}
              </span>
            </div>
            <button 
              onClick={() => setSelectedDate(prev => addDays(prev, 1))}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Tools */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm border border-[#E2E8F0] p-1 rounded-lg shadow-sm">
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-1.5 rounded-md transition-colors ${(activeTool === 'pen' && !isEraserMode) ? 'bg-slate-200 text-[#1e293b]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              title="Pen"
            >
              <Pen size={16} />
            </button>
            <button
              onClick={() => setActiveTool('highlighter')}
              className={`p-1.5 rounded-md transition-colors ${(activeTool === 'highlighter' && !isEraserMode) ? 'bg-slate-200 text-[#1e293b]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              title="Highlighter"
            >
              <Highlighter size={16} />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              onPointerDown={() => setIsEraserMode(true)}
              onPointerUp={() => setIsEraserMode(false)}
              onPointerLeave={() => setIsEraserMode(false)}
              onPointerCancel={() => setIsEraserMode(false)}
              onContextMenu={(e) => e.preventDefault()}
              className={`p-1.5 rounded-md transition-colors select-none ${(activeTool === 'eraser' || isEraserMode) ? 'bg-slate-200 text-[#1e293b]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              title="Eraser (Tap to select, Hold to quick-erase)"
              style={{ touchAction: 'none' }}
            >
              <Eraser size={16} />
            </button>
            <div className="flex items-center ml-1 gap-1 border-l border-slate-200 pl-1">
              {(() => {
                const currentTool = isEraserMode ? 'eraser' : activeTool;
                if (currentTool === 'pen') {
                  return [1.5, 3, 5].map(w => (
                    <button key={w} onClick={() => setPenWidth(w)} className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${penWidth === w ? 'bg-slate-200' : 'hover:bg-slate-100'}`} title={`Thickness: ${w}`}>
                      <div className="bg-[#1e293b] rounded-full" style={{ width: w + 1, height: w + 1 }}></div>
                    </button>
                  ));
                }
                if (currentTool === 'highlighter') {
                  return (
                    <>
                      <select 
                        value={highlighterWidth} 
                        onChange={(e) => setHighlighterWidth(Number(e.target.value))}
                        className="h-6 px-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs text-[#1e293b] outline-none cursor-pointer border-none font-medium"
                        title="Highlighter Size"
                      >
                        {[10, 14, 18, 24, 30, 40, 50, 60, 80, 100].map(w => (
                          <option key={w} value={w}>Size {w}</option>
                        ))}
                      </select>
                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                      {[
                        { c: 'rgba(253, 224, 71, 0.8)', bg: '#fef08a' },
                        { c: 'rgba(167, 243, 208, 0.8)', bg: '#a7f3d0' },
                        { c: 'rgba(251, 207, 232, 0.8)', bg: '#fbcfe8' },
                        { c: 'rgba(191, 219, 254, 0.8)', bg: '#bfdbfe' }
                      ].map(item => (
                        <button key={item.c} onClick={() => setHighlighterColor(item.c)} className={`w-5 h-5 rounded-full border border-slate-200 ${highlighterColor === item.c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} style={{ backgroundColor: item.bg }} title="Color" />
                      ))}
                    </>
                  );
                }
                if (currentTool === 'eraser') {
                  return (
                    <select 
                      value={eraserWidth} 
                      onChange={(e) => setEraserWidth(Number(e.target.value))}
                      className="h-6 px-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs text-[#1e293b] outline-none cursor-pointer border-none font-medium"
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
            <div className="flex items-center ml-1 gap-1 border-l border-slate-200 pl-1">
              <button
                onClick={() => canvasRef.current?.undo && canvasRef.current.undo()}
                className="p-1.5 rounded-md transition-colors text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Undo"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="flex items-center gap-1 p-1.5 rounded-md transition-colors text-slate-400 hover:text-orange-500 hover:bg-orange-50 font-medium text-xs disabled:opacity-50"
                title="Convert Handwriting to Text"
              >
                {isTranscribing ? <Loader2 size={14} className="animate-spin text-orange-500" /> : <Type size={14} />}
                <span className="hidden xl:inline">{isTranscribing ? "Converting..." : "To Text"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Template & Drawing Layer */}
        <div className="flex-1 w-full pointer-events-auto mx-auto relative max-w-5xl">
          <TemplateRenderer template="DAILY" date={selectedDate} onSubSectionChange={setSubSection} onClearCanvas={handleClearCanvas} hideTabs={true} forceTab="Schedule" />
          
          {/* Drawing Layer (z-20) - Shifted by -72px to match Planner's canvas alignment which expects the hidden 72px tab header */}
          <div 
            className="absolute bottom-0 z-20 pointer-events-none mx-auto inset-x-0 w-full" 
            style={{ top: "-72px" }}
          >
            <div className="pointer-events-auto w-full h-full">
              <GlobalCanvas 
                key={pageKey}
                ref={canvasRef} 
                pageKey={pageKey} 
                activeTemplate="DAILY" 
                activeTool={activeTool}
                isEraserMode={isEraserMode} 
                penWidth={penWidth}
                eraserWidth={eraserWidth}
                highlighterWidth={highlighterWidth}
                highlighterColor={highlighterColor}
              />
            </div>
          </div>
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