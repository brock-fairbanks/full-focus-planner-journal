import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

const GlobalCanvas = forwardRef(({ onSave, savedImageData, pageKey, activeTemplate, onClear }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);

  // Expose clear function to parent
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

    const initCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || (window.innerWidth - 80);
      const height = rect.height || window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // 🛠️ FIX 3: Removed desynchronized: true which causes the Canvas to render as an opaque black screen on some platforms
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Ensure canvas starts transparent
      ctx.clearRect(0, 0, width, height);
      ctxRef.current = ctx;

      if (savedImageData && savedImageData !== "null") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = savedImageData;
      }
    };

    const timer = setTimeout(initCanvas, 50);
    return () => clearTimeout(timer);
  }, [pageKey, savedImageData]);

  const lastTapRef = useRef(0);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });
  const inputRef = useRef(null);

  const commitText = () => {
    if (textInput.text.trim() && ctxRef.current && canvasRef.current) {
      const ctx = ctxRef.current;
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textBaseline = 'top';
      ctx.fillText(textInput.text, textInput.x, textInput.y - 10);

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (canvasRef.current && onSave) {
        onSave(canvasRef.current.toDataURL("image/png"));
      }
    }
    setTextInput({ visible: false, x: 0, y: 0, text: '' });
  };

  const pointsRef = useRef([]);
  const preStrokeStateRef = useRef(null);

  const startDrawing = (e) => {
    if (textInput.visible) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      const rect = canvasRef.current.getBoundingClientRect();
      setTextInput({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text: ''
      });
      isDrawing.current = false;
      lastTapRef.current = 0;
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    lastTapRef.current = now;

    // Prevent drawing with finger (touch), allow stylus/pen and mouse
    if (e.pointerType === 'touch') return;

    if (!ctxRef.current || !canvasRef.current) return;
    
    // Save canvas state for potential stroke replacement (scratch out / strike through)
    preStrokeStateRef.current = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    pointsRef.current = [{x, y}];
    
    ctxRef.current.strokeStyle = '#1e293b';
    ctxRef.current.lineWidth = 2.2;
    ctxRef.current.lineCap = 'round';
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing.current || !ctxRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    pointsRef.current.push({x, y});
    
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    const pts = pointsRef.current;
    if (pts.length > 5 && ctxRef.current && canvasRef.current) {
      let minX = pts[0].x, maxX = pts[0].x;
      let minY = pts[0].y, maxY = pts[0].y;
      let xReversals = 0;
      let lastDir = 0;

      for (let i = 1; i < pts.length; i++) {
        minX = Math.min(minX, pts[i].x);
        maxX = Math.max(maxX, pts[i].x);
        minY = Math.min(minY, pts[i].y);
        maxY = Math.max(maxY, pts[i].y);
        
        let dx = pts[i].x - pts[i-1].x;
        if (Math.abs(dx) > 2) {
          let dir = dx > 0 ? 1 : -1;
          if (lastDir !== 0 && dir !== lastDir) xReversals++;
          lastDir = dir;
        }
      }

      const width = maxX - minX;
      const height = maxY - minY;

      // Scratch-out detection (zigzag back and forth)
      if (xReversals >= 3 && width > 20 && height > 10) {
        if (preStrokeStateRef.current) {
          ctxRef.current.putImageData(preStrokeStateRef.current, 0, 0);
        }
        // Erase the bounded area plus a small buffer
        ctxRef.current.clearRect(minX - 10, minY - 10, width + 20, height + 20);
      } 
      // Strike-through detection (mostly horizontal, straight line)
      else if (width > 60 && height < 20 && xReversals <= 1) {
        if (preStrokeStateRef.current) {
          ctxRef.current.putImageData(preStrokeStateRef.current, 0, 0);
        }
        // Replace with a perfectly straight strike-through line
        ctxRef.current.beginPath();
        const avgY = (pts[0].y + pts[pts.length-1].y) / 2;
        ctxRef.current.moveTo(minX, avgY);
        ctxRef.current.lineTo(maxX, avgY);
        ctxRef.current.strokeStyle = '#1e293b';
        ctxRef.current.lineWidth = 3;
        ctxRef.current.stroke();
      }
    }

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (canvasRef.current && onSave) {
        onSave(canvasRef.current.toDataURL("image/png"));
      }
    }, 1500); 
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef} // FIXED: Changed from ref__
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={endDrawing}
        onPointerOut={endDrawing}
        className="w-full h-full touch-none"
        style={{ background: "transparent", display: "block" }}
      />
      {textInput.visible && (
        <input
          ref={inputRef}
          type="text"
          value={textInput.text}
          onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText();
          }}
          className="absolute bg-transparent border-b border-blue-500 outline-none"
          style={{
            left: textInput.x,
            top: textInput.y - 10,
            fontSize: '16px',
            color: '#1e293b',
            minWidth: '200px',
            fontFamily: 'sans-serif'
          }}
          placeholder="Type here..."
        />
      )}
    </div>
  );
});

export default GlobalCanvas;