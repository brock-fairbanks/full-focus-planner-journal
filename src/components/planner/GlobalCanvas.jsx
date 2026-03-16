import React, { useEffect, useRef, forwardRef } from "react";

const GlobalCanvas = forwardRef(({ onSave, savedImageData, pageKey, activeTemplate }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);
  const isErasing = useRef(false);



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