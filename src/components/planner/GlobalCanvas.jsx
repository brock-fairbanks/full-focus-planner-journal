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

    if (!ctxRef.current) return;
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    ctxRef.current.strokeStyle = '#1e293b';
    ctxRef.current.lineWidth = 2.2;
    ctxRef.current.lineCap = 'round';
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing.current || !ctxRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctxRef.current.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctxRef.current.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
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