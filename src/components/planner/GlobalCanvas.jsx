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
  const [texts, setTexts] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(`planner_texts_${pageKey}`);
    if (saved) {
      try { setTexts(JSON.parse(saved)); } catch (e) { setTexts([]); }
    } else {
      setTexts([]);
    }
  }, [pageKey]);

  const updateTextsState = (action) => {
    setTexts(prev => {
      const updated = typeof action === 'function' ? action(prev) : action;
      localStorage.setItem(`planner_texts_${pageKey}`, JSON.stringify(updated));
      return updated;
    });
  };

  const pointsRef = useRef([]);
  const preStrokeStateRef = useRef(null);

  const handleDoubleClickAction = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickY = clientY - rect.top;
    const snappedY = Math.round((clickY - 16) / 32) * 32;

    updateTextsState(prev => {
      const existingTextIndex = prev.findIndex(t => t.y === snappedY);
      if (existingTextIndex !== -1) {
        const updated = [...prev];
        updated[existingTextIndex] = { ...updated[existingTextIndex], isEditing: true };
        return updated;
      } else {
        const newText = {
          id: Date.now().toString(),
          x: clientX - rect.left,
          y: snappedY,
          text: '',
          isEditing: true
        };
        return [...prev, newText];
      }
    });
    
    if (preStrokeStateRef.current && ctxRef.current) {
      ctxRef.current.putImageData(preStrokeStateRef.current, 0, 0);
    }
    isDrawing.current = false;
  };

  const lastTapPosRef = useRef({ x: 0, y: 0 });

  const startDrawing = (e) => {
    const isPen = e.pointerType === 'pen';
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 400; 

    // Only check double tap if it's not a pen, or if it's a mouse/touch that hasn't moved much
    const dx = Math.abs(e.clientX - lastTapPosRef.current.x);
    const dy = Math.abs(e.clientY - lastTapPosRef.current.y);
    const isSameSpot = dx < 20 && dy < 20;

    if (!isPen && isSameSpot && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleDoubleClickAction(e.clientX, e.clientY);
      lastTapRef.current = 0;
      return;
    }
    
    lastTapRef.current = now;
    lastTapPosRef.current = { x: e.clientX, y: e.clientY };

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
        className="w-full h-full touch-pan-y touch-pan-x"
        style={{ background: "transparent", display: "block" }}
      />
      {texts.map(textObj => (
        <TextItem 
          key={textObj.id} 
          textObj={textObj} 
          updateText={(id, updated) => updateTextsState(prev => prev.map(t => t.id === id ? updated : t))}
          deleteText={(id) => updateTextsState(prev => prev.filter(t => t.id !== id))}
        />
      ))}
    </div>
  );
});

const TextItem = ({ textObj, updateText, deleteText }) => {
  const [isEditing, setIsEditing] = useState(textObj.isEditing);
  const [val, setVal] = useState(textObj.text);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (!val.trim()) {
      deleteText(textObj.id);
    } else {
      setIsEditing(false);
      updateText(textObj.id, { ...textObj, text: val, isEditing: false });
    }
  };

  return (
    <div 
      className="absolute group flex items-start z-50"
      style={{ 
        left: textObj.x, 
        top: textObj.y, 
        width: `calc(100% - ${textObj.x}px - 40px)`, 
        minWidth: '200px' 
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onClick={() => setIsEditing(true)}
        className="w-full bg-transparent outline-none resize-none overflow-hidden"
        style={{
          lineHeight: '32px',
          fontSize: '18px',
          fontFamily: "'Playfair Display', serif",
          color: '#1e293b',
          border: isEditing ? '1px dashed #94a3b8' : '1px solid transparent',
          minHeight: '32px',
          height: `${Math.max(1, val.split('\\n').length) * 32}px`,
          padding: 0,
          margin: 0
        }}
        placeholder={isEditing ? "Type here..." : ""}
      />
      {!isEditing && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteText(textObj.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded ml-2 shrink-0 transition-opacity"
          title="Delete text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default GlobalCanvas;