import React, { useEffect, useLayoutEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

const GlobalCanvas = forwardRef(({ onSave, savedImageData, pageKey, activeTemplate, onClear }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const saveTimeout = useRef(null);

  // Expose clear function to parent
  useImperativeHandle(ref, () => ({
    clear: () => {
      if (canvasRef.current && ctxRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        updateTextsState([]);
        const dataUrl = canvasRef.current.toDataURL("image/png");
        localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
        if (onSave) onSave(dataUrl);
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

      const localImageData = savedImageData || localStorage.getItem(`planner_drawing_${pageKey}`);
      if (localImageData && localImageData !== "null") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = localImageData;
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

  const handleDoubleClickAction = (clientX, clientY, pointerType) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clickY = clientY - rect.top;
    let snappedY = Math.round((clickY - 16) / 32) * 32;

    let startX = clientX - rect.left;
    let lineHeight = 32;
    let width = `200px`;

    // Find layout bounds using elementsFromPoint as fallback
    const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
    const container = elementsAtPoint.find(el => 
      el.tagName === 'DIV' && 
      el !== canvasRef.current && 
      !el.className.includes('absolute') && 
      !el.className.includes('pointer-events-auto') &&
      el.getBoundingClientRect().width > 50
    );

    if (container) {
       const containerRect = container.getBoundingClientRect();
       width = `${containerRect.right - clientX - 16}px`;
    } else {
       width = `${rect.right - clientX - 40}px`;
    }

    // Smart Line Snapping: Find the nearest line-like element
    const lineElements = Array.from(document.querySelectorAll(
      '.border-b, .border-b-2, .border-b-4, .border-b-dashed, [style*="gradient"]'
    )).filter(el => {
       if (el.children.length > 0 && !el.style.backgroundImage) return false;
       if (el.tagName.toLowerCase() === 'button' || el.closest('button')) return false;
       return true;
    });

    let minDistance = Infinity;
    let bestLine = null;

    for (const el of lineElements) {
      const elRect = el.getBoundingClientRect();
      if (elRect.width === 0) continue;

      let hDist = 0;
      if (clientX < elRect.left) hDist = elRect.left - clientX;
      else if (clientX > elRect.right) hDist = clientX - elRect.right;

      let vDist = 0;
      if (clientY < elRect.top - 10) vDist = elRect.top - 10 - clientY;
      else if (clientY > elRect.bottom + 10) vDist = clientY - (elRect.bottom + 10);

      let dist = vDist * 10 + hDist;

      if (dist < minDistance && dist < 600) {
        minDistance = dist;
        bestLine = el;
      }
    }

    if (bestLine) {
      const bestRect = bestLine.getBoundingClientRect();
      
      if (bestLine.style.backgroundImage && bestLine.style.backgroundImage.includes('radial-gradient')) {
         startX = clientX - rect.left;
         width = `${bestRect.right - clientX - 16}px`;
      } else {
         startX = bestRect.left - rect.left + 2; 
         width = `${bestRect.width - 4}px`;
      }
      
      if (bestLine.className && typeof bestLine.className === 'string' && bestLine.className.includes('border')) {
        // Find line height by looking for the next line
        const siblingLines = lineElements.filter(el => {
           if (el === bestLine) return false;
           const r = el.getBoundingClientRect();
           return Math.abs(r.left - bestRect.left) < 20 && r.top > bestRect.top;
        });
        
        if (siblingLines.length > 0) {
           siblingLines.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
           const nextRect = siblingLines[0].getBoundingClientRect();
           lineHeight = nextRect.top - bestRect.top;
           if (lineHeight < 20 || lineHeight > 80) lineHeight = 32;
        } else {
           lineHeight = 32; // fallback
        }
        
        // Align text baseline to sit perfectly on the border line
        snappedY = (bestRect.bottom - rect.top) - lineHeight + 6; 
      } else if (bestLine.style.backgroundSize) {
         // It's a grid/lines background
         const match = bestLine.style.backgroundSize.match(/(\d+)px/g);
         if (match && match.length > 0) {
             lineHeight = parseInt(match[match.length - 1]);
             const relativeY = clientY - bestRect.top;
             const gridY = Math.floor(relativeY / lineHeight) * lineHeight;
             snappedY = gridY + bestRect.top - rect.top - 4; // slight visual offset
         }
      }
    }

    updateTextsState(prev => {
      const existingTextIndex = prev.findIndex(t => Math.abs(t.y - snappedY) < 10 && Math.abs(t.x - startX) < 10);
      if (existingTextIndex !== -1) {
        const updated = [...prev];
        updated[existingTextIndex] = { ...updated[existingTextIndex], isEditing: true };
        return updated;
      } else {
        const newText = {
          id: Date.now().toString(),
          x: startX,
          y: snappedY,
          text: '',
          isEditing: true,
          lineHeight,
          width
        };
        return [...prev, newText];
      }
    });
    
    if (pointerType !== 'touch' && preStrokeStateRef.current && ctxRef.current) {
      ctxRef.current.putImageData(preStrokeStateRef.current, 0, 0);
    }
    isDrawing.current = false;
  };

  const lastTapPosRef = useRef({ x: 0, y: 0 });

  const startDrawing = (e) => {
    const isPen = e.pointerType === 'pen';
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 500; 

    // Only check double tap if it's not a pen, or if it's a mouse/touch that hasn't moved much
    const dx = Math.abs(e.clientX - lastTapPosRef.current.x);
    const dy = Math.abs(e.clientY - lastTapPosRef.current.y);
    const isSameSpot = dx < 40 && dy < 40;

    if (!isPen && isSameSpot && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleDoubleClickAction(e.clientX, e.clientY, e.pointerType);
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
      let yReversals = 0;
      let lastYDir = 0;
      let maxYIdx = 0;

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

        let dy = pts[i].y - pts[i-1].y;
        if (Math.abs(dy) > 2) {
          let dir = dy > 0 ? 1 : -1;
          if (lastYDir !== 0 && dir !== lastYDir) yReversals++;
          lastYDir = dir;
        }

        if (pts[i].y > pts[maxYIdx].y) {
          maxYIdx = i;
        }
      }

      const width = maxX - minX;
      const height = maxY - minY;

      const isCheckmark = xReversals <= 1 && yReversals === 1 && 
                          (pts[maxYIdx].y - pts[0].y) > 2 && 
                          (pts[maxYIdx].y - pts[pts.length-1].y) > 5 &&
                          pts[pts.length-1].x > pts[0].x &&
                          pts[pts.length-1].y < pts[0].y + 10 && // ends higher or near where it started
                          width < 100 && height > 10;

      // Scratch-out detection (zigzag back and forth)
      // Increased thresholds significantly to prevent mistaking cursive handwriting for a scratch-out
      if (xReversals >= 8 && width > 20 && height > 10 && pts.length > 50) {
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
      // Checkmark detection -> replace with a perfect checkbox with green check
      else if (isCheckmark) {
        if (preStrokeStateRef.current) {
          ctxRef.current.putImageData(preStrokeStateRef.current, 0, 0);
        }
        const boxSize = Math.min(24, Math.max(16, width));
        const boxX = minX;
        const boxY = minY + (height - boxSize) / 2;
        
        ctxRef.current.beginPath();
        if (ctxRef.current.roundRect) {
          ctxRef.current.roundRect(boxX, boxY, boxSize, boxSize, 4);
        } else {
          ctxRef.current.rect(boxX, boxY, boxSize, boxSize);
        }
        ctxRef.current.fillStyle = '#f8fafc';
        ctxRef.current.fill();
        ctxRef.current.strokeStyle = '#cbd5e1';
        ctxRef.current.lineWidth = 2;
        ctxRef.current.stroke();
        
        // Green check
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(boxX + boxSize * 0.25, boxY + boxSize * 0.5);
        ctxRef.current.lineTo(boxX + boxSize * 0.45, boxY + boxSize * 0.7);
        ctxRef.current.lineTo(boxX + boxSize * 0.75, boxY + boxSize * 0.3);
        ctxRef.current.strokeStyle = '#22c55e';
        ctxRef.current.lineWidth = 3;
        ctxRef.current.lineCap = 'round';
        ctxRef.current.lineJoin = 'round';
        ctxRef.current.stroke();
      }
    }

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
        if (onSave) onSave(dataUrl);
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
        onDoubleClick={(e) => handleDoubleClickAction(e.clientX, e.clientY, 'mouse')}
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

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '1px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight + 2}px`; // +2 for border
    }
  };

  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
    resizeTextarea();
  }, [isEditing]);

  const handleInput = (e) => {
    setVal(e.target.value);
  };

  useLayoutEffect(() => {
    resizeTextarea();
  }, [val]);

  const handleBlur = () => {
    if (!val.trim()) {
      deleteText(textObj.id);
    } else {
      setIsEditing(false);
      updateText(textObj.id, { ...textObj, text: val, isEditing: false });
    }
  };

  const lh = textObj.lineHeight || 32;

  return (
    <div 
      className="absolute group flex items-start z-50"
      style={{ 
        left: textObj.x, 
        top: textObj.y, 
        width: textObj.width || `calc(100% - ${textObj.x}px - 40px)`, 
        minWidth: '200px' 
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={val}
        rows={1}
        onChange={handleInput}
        onBlur={handleBlur}
        onClick={() => setIsEditing(true)}
        className="w-full bg-transparent outline-none resize-none overflow-hidden"
        style={{
          lineHeight: `${lh}px`,
          fontSize: '26px',
          fontFamily: "'Caveat', cursive",
          color: '#1e293b',
          border: isEditing ? '1px dashed #94a3b8' : '1px solid transparent',
          minHeight: `${lh}px`,
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