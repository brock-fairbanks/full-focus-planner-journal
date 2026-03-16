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

    // 🛠️ FIX 1: Use a timeout to ensure the tab has finished 
    // rendering so getBoundingClientRect isn't 0
    const initCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Fallbacks if the layout hasn't fully computed yet
      const width = rect.width || (window.innerWidth - 80);
      const height = rect.height || (window.innerHeight - 64);
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d', { desynchronized: true, alpha: true });
      if (!ctx) return;
      
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Cleaner way to handle scaling
      
      // 🛠️ FIX 2: Explicitly clear to transparent to avoid "Black Canvas" syndrome
      ctx.clearRect(0, 0, width, height);
      ctxRef.current = ctx;

      // Load saved ink
      if (savedImageData && savedImageData !== "null") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) {
            ctx.drawImage(img, 0, 0, width, height);
          }
        };
        img.src = savedImageData;
      }
    };

    const timer = setTimeout(initCanvas, 60);
    return () => clearTimeout(timer);
  }, [pageKey, savedImageData]);

  const startDrawing = (e) => {
    if (!ctxRef.current) return;
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
    if (!isDrawing.current || !ctxRef.current) return;
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
      if (canvasRef.current) {
        onSave(canvasRef.current.toDataURL("image/png"));
      }
    }, 1500); 
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={startDrawing}
      onPointerMove={draw}
      onPointerUp={endDrawing}
      className="w-full h-full touch-none absolute inset-0"
      style={{ 
        background: "transparent", 
        display: "block",
        pointerEvents: "auto" // Ensure it can catch pointer events
      }}
    />
  );
});

export default GlobalCanvas;