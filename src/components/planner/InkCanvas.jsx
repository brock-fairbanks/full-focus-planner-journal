import React, { useRef, useEffect, useCallback } from "react";

export default function InkCanvas({ savedImageData, onSave }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);
  const hasLoaded = useRef(false);

  // Initialize canvas with HiDPI support
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d", { desynchronized: true });
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1E293B";

    return ctx;
  }, []);

  // Load saved image (ink only — transparent bg)
  const loadImage = useCallback(() => {
    if (!savedImageData || hasLoaded.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = canvas.getContext("2d", { desynchronized: true });
      // Clear first, then draw ink layer only
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      hasLoaded.current = true;
    };
    img.src = savedImageData;
  }, [savedImageData]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !onSave) return;
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    }, 1000);
  }, [onSave]);

  useEffect(() => {
    const ctx = initCanvas();
    if (!ctx) return;
    loadImage();

    const canvas = canvasRef.current;

    const handlePointerDown = (e) => {
      if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
      e.preventDefault();
      isDrawing.current = true;
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handlePointerMove = (e) => {
      if (!isDrawing.current) return;
      if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    };

    const handlePointerUp = (e) => {
      if (!isDrawing.current) return;
      if (e.pointerType !== "pen" && e.pointerType !== "mouse") return;
      isDrawing.current = false;
      ctx.closePath();
      debouncedSave();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    const handleResize = () => {
      if (!canvas.width || !canvas.height) return;

      // Save current content
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx && canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      initCanvas();

      // Restore content
      if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        const newCtx = canvas.getContext("2d", { desynchronized: true });
        newCtx.save();
        newCtx.setTransform(1, 0, 0, 1, 0, 0);
        newCtx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        newCtx.restore();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
      window.removeEventListener("resize", handleResize);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [initCanvas, loadImage, debouncedSave]);

  // When savedImageData changes (tab switch), reload
  useEffect(() => {
    hasLoaded.current = false;
    const ctx = initCanvas();
    if (!ctx) return;
    if (savedImageData) {
      loadImage();
    }
  }, [savedImageData, initCanvas, loadImage]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: "none", cursor: "crosshair", background: "transparent" }}
    />
  );
}