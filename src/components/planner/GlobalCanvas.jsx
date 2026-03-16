import React, { useEffect, useRef, forwardRef } from "react";

const GlobalCanvas = forwardRef(({ onSave, savedImageData, pageKey, activeTemplate }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);
  const isErasing = useRef(false);

  // --- DRAWING THE PAPER GRID DIRECTLY TO CANVAS ---
  const drawPaperSubstrate = (ctx, width, height, template) => {
    ctx.fillStyle = "#FAF9F6";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;

    const centerX = width / 2;

    if (template === "DAILY") {
      // Draw Daily Big 3 Lines
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const y = 100 + i * 60;
        ctx.moveTo(50, y);
        ctx.lineTo(centerX - 50, y);
      }
      ctx.stroke();
    } else if (template === "IDEAL_WEEK") {
      // Draw hourly grid for week
      ctx.beginPath();
      for (let i = 0; i < 18; i++) {
        const y = 40 + i * 40;
        ctx.moveTo(50, y);
        ctx.lineTo(width - 50, y);
      }
      ctx.stroke();
    } else if (template === "QUARTERLY_GOALS") {
      // Draw 2x4 grid for goals
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const y = 80 + i * (height / 4);
        ctx.moveTo(50, y);
        ctx.lineTo(width - 50, y);
      }
      ctx.stroke();
    } else if (template === "RITUALS") {
      // Draw two columns with checkboxes
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const y = 80 + i * 50;
        ctx.moveTo(50, y);
        ctx.lineTo(centerX - 50, y);
        ctx.moveTo(centerX + 50, y);
        ctx.lineTo(width - 50, y);
      }
      ctx.stroke();
    } else if (template === "WEEKLY_REVIEW") {
      // Draw 2x2 grid
      ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const y = 100 + i * (height / 2);
        ctx.moveTo(50, y);
        ctx.lineTo(width - 50, y);
      }
      ctx.stroke();
    }

    // Draw Spine
    const gradient = ctx.createLinearGradient(centerX - 30, 0, centerX + 30, 0);
    gradient.addColorStop(0, "#FAF9F6");
    gradient.addColorStop(0.5, "#E2E8F0");
    gradient.addColorStop(1, "#FAF9F6");
    ctx.fillStyle = gradient;
    ctx.fillRect(centerX - 30, 0, 60, height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d', { desynchronized: true, alpha: false });
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;

    // 1. Draw the Paper first
    drawPaperSubstrate(ctx, rect.width, rect.height, activeTemplate);

    // 2. Overlay the saved Ink
    if (savedImageData) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        // Redraw grid on top so it stays visible
        drawPaperSubstrate(ctx, rect.width, rect.height, activeTemplate);
      };
      img.src = savedImageData;
    }
  }, [pageKey, savedImageData, activeTemplate]);

  const startDrawing = (e) => {
    isDrawing.current = true;
    isErasing.current = e.buttons === 32; // Secondary button (eraser)
    const rect = canvasRef.current.getBoundingClientRect();
    if (isErasing.current) {
      ctxRef.current.clearRect(e.clientX - rect.left - 10, e.clientY - rect.top - 10, 20, 20);
    } else {
      ctxRef.current.strokeStyle = '#1e293b';
      ctxRef.current.lineWidth = 2.2;
      ctxRef.current.lineCap = 'round';
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (isErasing.current) {
      ctxRef.current.clearRect(e.clientX - rect.left - 10, e.clientY - rect.top - 10, 20, 20);
    } else {
      ctxRef.current.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctxRef.current.stroke();
    }
  };

  const endDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onSave(canvasRef.current.toDataURL("image/png"));
    }, 1500); 
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={endDrawing}
      className="w-full h-full touch-none bg-[#FAF9F6]"
    />
  );
});

export default GlobalCanvas;