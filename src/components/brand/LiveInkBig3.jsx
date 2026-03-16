import React, { useRef, useEffect, useCallback, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Pen } from "lucide-react";

function InkZone({ index, label, goalName, onTextRecognized }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const strokes = useRef([]);
  const currentStroke = useRef([]);
  const ctxRef = useRef(null);
  const penUpTimer = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | drawing | recognizing | done

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const parent = canvas.parentElement;
    if (!parent) return null;
    const rect = parent.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
    ctxRef.current = ctx;
    return ctx;
  }, []);

  const redrawStrokes = useCallback((ctx) => {
    if (!ctx || !canvasRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvasRef.current.width / dpr, canvasRef.current.height / dpr);
    strokes.current.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    });
  }, []);

  const runOCR = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.current.length === 0) return;
    setStatus("recognizing");
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `ink_zone_${index}.png`, { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: "Extract the handwritten text from this image. Return only the plain text, nothing else. If there is no recognizable text, return an empty string.",
        file_urls: [file_url],
      });
      const text = typeof result === "string" ? result.trim() : (result?.text || "").trim();
      if (text) {
        onTextRecognized(text);
        setStatus("done");
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  }, [index, onTextRecognized]);

  useEffect(() => {
    const ctx = setupCanvas();
    if (!ctx) return;

    const canvas = canvasRef.current;

    const getPoint = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e) => {
      // Prioritize pen; allow touch fallback
      if (e.pointerType === "mouse") return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      setStatus("drawing");
      if (penUpTimer.current) clearTimeout(penUpTimer.current);
      const pt = getPoint(e);
      currentStroke.current = [pt];
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(pt.x, pt.y);
    };

    const onPointerMove = (e) => {
      if (!isDrawing.current) return;
      if (e.pointerType === "mouse") return;
      e.preventDefault();
      const pt = getPoint(e);
      currentStroke.current.push(pt);
      ctxRef.current.lineTo(pt.x, pt.y);
      ctxRef.current.stroke();
    };

    const onPointerUp = (e) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (currentStroke.current.length > 0) {
        strokes.current.push([...currentStroke.current]);
        currentStroke.current = [];
      }
      ctxRef.current.closePath();
      // 2-second delay then OCR
      penUpTimer.current = setTimeout(runOCR, 2000);
    };

    const onResize = () => {
      const c = setupCanvas();
      if (c) redrawStrokes(c);
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      if (penUpTimer.current) clearTimeout(penUpTimer.current);
    };
  }, [setupCanvas, redrawStrokes, runOCR]);

  const clearInk = () => {
    strokes.current = [];
    const ctx = setupCanvas();
    if (ctx) redrawStrokes(ctx);
    setStatus("idle");
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px",
        minHeight: 90,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3 pointer-events-none select-none">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
          {index + 1}
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex-1">{label}</span>
        {goalName && <span className="text-[10px] text-amber-500/70 truncate max-w-[120px]">↳ {goalName}</span>}
        {status === "recognizing" && <Loader2 size={12} className="text-amber-400 animate-spin" />}
        {status === "done" && <Check size={12} className="text-green-400" />}
        {status === "idle" && strokes.current.length === 0 && (
          <Pen size={12} className="text-slate-700" />
        )}
      </div>

      {/* Ink canvas - fills the zone */}
      <div className="relative" style={{ height: 44 }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: "none", cursor: "crosshair" }}
        />
        {/* Baseline rule */}
        <div className="absolute bottom-0 left-0 right-0 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }} />
      </div>

      {/* Clear button */}
      {strokes.current.length > 0 && status !== "recognizing" && (
        <button
          onClick={clearInk}
          className="absolute top-3 right-3 text-[10px] text-slate-600 hover:text-red-400 transition-colors"
          style={{ pointerEvents: "auto" }}>
          clear
        </button>
      )}
    </div>
  );
}

export default function LiveInkBig3({ goals = [], form, setForm }) {
  const activeGoals = goals.filter(g => g.status === "in_progress" || g.status === "not_started");

  const tasks = [
    { taskKey: "task_1", goalKey: "task_1_goal_id", label: "Primary Task" },
    { taskKey: "task_2", goalKey: "task_2_goal_id", label: "Task 2" },
    { taskKey: "task_3", goalKey: "task_3_goal_id", label: "Task 3" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1 select-none">
        <Pen size={13} className="text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Ink · Big 3</span>
        <span className="text-[10px] text-slate-700 ml-1">Write with pen — auto-syncs after 2s</span>
      </div>

      {tasks.map((t, i) => {
        const linkedGoal = activeGoals.find(g => g.id === form[t.goalKey]);
        return (
          <div key={i} className="space-y-2">
            <InkZone
              index={i}
              label={t.label}
              goalName={linkedGoal?.title}
              onTextRecognized={(text) => setForm(p => ({ ...p, [t.taskKey]: text }))}
            />
            {/* Goal link select */}
            <select
              className="w-full text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: form[t.goalKey] ? "#fbbf24" : "#475569",
                touchAction: "manipulation",
              }}
              value={form[t.goalKey]}
              onChange={e => setForm(p => ({ ...p, [t.goalKey]: e.target.value }))}>
              <option value="" style={{ background: "#0f172a" }}>
                — Link to Q-Goal{i === 0 ? " (required)" : ""} —
              </option>
              {activeGoals.map(g => (
                <option key={g.id} value={g.id} style={{ background: "#0f172a" }}>
                  Q{g.quarter} · {g.title}
                </option>
              ))}
            </select>

            {/* Typed fallback */}
            {form[t.taskKey] && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
                <Check size={11} className="text-amber-400 shrink-0" />
                <span className="text-xs text-amber-200 flex-1">{form[t.taskKey]}</span>
                <button onClick={() => setForm(p => ({ ...p, [t.taskKey]: "" }))}
                  className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">×</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}