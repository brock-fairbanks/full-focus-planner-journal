import React, { useEffect, useRef, forwardRef } from "react";

const GlobalCanvas = forwardRef(({ onSave, savedImageData, pageKey }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // 🖋️ LOW LATENCY ENGINE + ALPHA TRANSPARENCY
    const ctx = canvas.getContext('2d', { 
      desynchronized: true, 
      alpha: true 
    });
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b'; // Charcoal ink
    ctx.lineWidth = 2.2;
    ctxRef.current = ctx;

    // Load and clear buffer
    if (savedImageData) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = savedImageData;
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  }, [pageKey, savedImageData]);

  const startDrawing = (e) => {
    if (e.pointerType !== 'pen') return; // Palm Rejection
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing.current || e.pointerType !== 'pen') return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctxRef.current.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctxRef.current.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    // Auto-save with 1.5s delay
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
      onPointerLeave={endDrawing}
      className="w-full h-full touch-none bg-transparent cursor-crosshair"
    />
  );
});

export default GlobalCanvas;