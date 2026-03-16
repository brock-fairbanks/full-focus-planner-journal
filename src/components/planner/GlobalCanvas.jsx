import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

const GlobalCanvas = forwardRef(({ onSave, savedImageData, pageKey, activeTemplate, onClear }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);
  const isErasing = useRef(false);

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (canvasRef.current && ctxRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        ctxRef.current.clearRect(0, 0, rect.width, rect.height);
        onClear?.();
      }
    }
  }));



  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth - 80;
    const height = rect.height || window.innerHeight - 64;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d', { desynchronized: true, alpha: true });
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, width, height);
    ctxRef.current = ctx;

    // Load saved ink
    if (savedImageData) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = savedImageData;
    }
  }, [pageKey, savedImageData]);

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
      className="w-full h-full touch-none absolute inset-0"
      style={{ background: "transparent" }}
    />
  );
});

export default GlobalCanvas;