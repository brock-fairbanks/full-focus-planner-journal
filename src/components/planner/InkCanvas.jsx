import React, { useRef, useEffect, useCallback } from "react";

export default function InkCanvas({ savedImageData, onSave }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);
  const ctxRef = useRef(null);
  // Store strokes in memory so we can redraw after resize
  const strokes = useRef([]);
  const currentStroke = useRef([]);

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
    ctx.strokeStyle = "#1E293B";
    ctxRef.current = ctx;
    return ctx;
  }, []);

  const redrawStrokes = useCallback((ctx) => {
    if (!ctx) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    strokes.current.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  }, []);

  const debouncedSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !onSave) return;
      // Composite ink onto white background for saving
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext("2d");
      offCtx.fillStyle = "#FAF9F6";
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      offCtx.drawImage(canvas, 0, 0);
      onSave(offscreen.toDataURL("image/png"));
    }, 1000);
  }, [onSave]);

  // Load saved image as background strokes reference (only on mount / tab switch)
  useEffect(() => {
    strokes.current = [];
    currentStroke.current = [];
    const ctx = setupCanvas();
    if (!ctx) return;

    if (savedImageData) {
      // Draw the saved image onto canvas directly (it includes the cream bg)
      // But we make it transparent by drawing on a cleared canvas
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      img.src = savedImageData;
    }
  }, [savedImageData]);

  // Event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e) => {
      if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
      e.preventDefault();
      isDrawing.current = true;
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStroke.current = [pt];
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    };

    const handlePointerMove = (e) => {
      if (!isDrawing.current) return;
      if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStroke.current.push(pt);
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    };

    const handlePointerUp = (e) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const ctx = ctxRef.current;
      if (ctx) ctx.closePath();
      if (currentStroke.current.length > 0) {
        strokes.current.push([...currentStroke.current]);
        currentStroke.current = [];
      }
      debouncedSave();
    };

    const handleResize = () => {
      const ctx = setupCanvas();
      if (!ctx) return;
      redrawStrokes(ctx);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);
    window.addEventListener("resize", handleResize);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
      window.removeEventListener("resize", handleResize);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [setupCanvas, redrawStrokes, debouncedSave]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        touchAction: "none",
        cursor: "crosshair",
        background: "transparent",
        display: "block",
      }}
    />
  );
}