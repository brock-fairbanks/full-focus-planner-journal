import React, { useRef, useEffect, useCallback } from "react";

const GlobalCanvas = React.forwardRef(({ onSave, savedImageData, pageKey }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);
  const strokes = useRef([]);
  const currentStroke = useRef([]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d", { desynchronized: true, alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2;
    ctxRef.current = ctx;
  }, []);

  const redrawStrokes = useCallback((ctx) => {
    if (!ctx) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
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
      if (canvas && onSave) onSave(canvas.toDataURL("image/png"));
    }, 1500);
  }, [onSave]);

  // Load saved image on mount or page change
  useEffect(() => {
    strokes.current = [];
    currentStroke.current = [];
    setupCanvas();
    const ctx = ctxRef.current;

    if (savedImageData && ctx) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = savedImageData;
    }
  }, [pageKey, savedImageData, setupCanvas]);

  // Pointer events for drawing
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (e.pointerType !== "pen") return;
      e.preventDefault();
      isDrawing.current = true;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStroke.current = [pt];

      const ctx = ctxRef.current;
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
      }
    };

    const handlePointerMove = (e) => {
      if (!isDrawing.current || e.pointerType !== "pen") return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStroke.current.push(pt);

      const ctx = ctxRef.current;
      if (ctx) {
        ctx.lineWidth = 1 + (e.pressure || 0.5) * 2; // Pressure sensitivity 1-3
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
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
      setupCanvas();
      redrawStrokes(ctxRef.current);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
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
        willChange: "transform",
        pointerEvents: "auto",
      }}
    />
  );
});

GlobalCanvas.displayName = "GlobalCanvas";
export default GlobalCanvas;