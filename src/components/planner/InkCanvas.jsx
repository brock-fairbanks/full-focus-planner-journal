import React, { useRef, useEffect, useCallback } from "react";

export default function InkCanvas({ savedImageData, onSave }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);
  const ctxRef = useRef(null);

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

    const ctx = canvas.getContext("2d", { desynchronized: true });
    // Reset transform before scaling to avoid compounding
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1E293B";
    ctxRef.current = ctx;
    return ctx;
  }, []);

  const loadImage = useCallback((ctx) => {
    if (!savedImageData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    };
    img.src = savedImageData;
  }, [savedImageData]);

  const debouncedSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !onSave) return;
      onSave(canvas.toDataURL("image/png"));
    }, 1000);
  }, [onSave]);

  // Initial setup + load image
  useEffect(() => {
    const ctx = setupCanvas();
    if (!ctx) return;
    loadImage(ctx);
  }, [savedImageData]); // re-run when tab changes (savedImageData changes)

  // Event listeners (stable, only mount/unmount once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCtx = () => ctxRef.current;

    const handlePointerDown = (e) => {
      if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
      e.preventDefault();
      isDrawing.current = true;
      const rect = canvas.getBoundingClientRect();
      const ctx = getCtx();
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handlePointerMove = (e) => {
      if (!isDrawing.current) return;
      if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const ctx = getCtx();
      if (!ctx) return;
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    };

    const handlePointerUp = (e) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const ctx = getCtx();
      if (ctx) ctx.closePath();
      debouncedSave();
    };

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.width || !canvas.height) return;
      // Snapshot current ink
      const snap = canvas.toDataURL("image/png");
      const ctx = setupCanvas();
      if (!ctx) return;
      // Restore ink after resize
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      img.src = snap;
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
  }, [setupCanvas, debouncedSave]);

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