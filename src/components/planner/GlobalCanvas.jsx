import React, { useEffect, useLayoutEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import { base44 } from "@/api/base44Client";

const GlobalCanvas = forwardRef(({ 
  onSave, 
  savedImageData, 
  pageKey, 
  activeTemplate, 
  onClear, 
  activeTool = 'pen',
  isEraserMode = false, 
  penWidth = 2.2,
  eraserWidth = 30,
  highlighterWidth = 16,
  highlighterColor = 'rgba(253, 224, 71, 0.8)',
  globalTextSize = 0,
  onTextFocus
}, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const isErasingRef = useRef(false);
  const saveTimeout = useRef(null);
  const canvasScaleRef = useRef(null);
  const syncIdRef = useRef(null);
  const undoStackRef = useRef([]);
  const lastLocalUpdateTime = useRef(0);
  const textsRef = useRef([]);
  const myRecentSaves = useRef(new Set());

  const getCanvasSnapshot = () => {
    if (!canvasRef.current) return null;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    tempCanvas.getContext('2d').drawImage(canvasRef.current, 0, 0);
    return tempCanvas;
  };

  const putCanvasSnapshot = (snapshot) => {
    if (!snapshot || !ctxRef.current || !canvasRef.current) return;
    const ctx = ctxRef.current;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(snapshot, 0, 0);
    ctx.restore();
  };

  const syncToBackend = async (dataUrl, currentTexts) => {
    const timestamp = Date.now();
    lastLocalUpdateTime.current = timestamp;
    if (myRecentSaves.current) {
      myRecentSaves.current.add(timestamp);
      setTimeout(() => { if (myRecentSaves.current) myRecentSaves.current.delete(timestamp); }, 15000);
    }
    try {
      if (syncIdRef.current) {
        await base44.entities.PlannerSync.update(syncIdRef.current, {
          drawing_data: dataUrl,
          texts_data: JSON.stringify(currentTexts),
          updated_at: timestamp
        });
      } else {
        const records = await base44.entities.PlannerSync.filter({ page_key: pageKey });
        if (records.length > 0) {
          syncIdRef.current = records[0].id;
          await base44.entities.PlannerSync.update(syncIdRef.current, {
            drawing_data: dataUrl,
            texts_data: JSON.stringify(currentTexts),
            updated_at: timestamp
          });
        } else {
          const res = await base44.entities.PlannerSync.create({
            page_key: pageKey,
            drawing_data: dataUrl,
            texts_data: JSON.stringify(currentTexts),
            updated_at: timestamp
          });
          syncIdRef.current = res.id;
        }
      }
    } catch(e) {
      console.error('Failed to sync', e);
    }
  };

  // Expose clear function to parent
  useImperativeHandle(ref, () => ({
    clear: () => {
      if (canvasRef.current && ctxRef.current) {
        undoStackRef.current.push(getCanvasSnapshot());
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        updateTextsState([]);
        const dataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
        localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
        if (onSave) onSave(dataUrl);
        syncToBackend(dataUrl, []);
        onClear?.();
      }
    },
    undo: () => {
      if (undoStackRef.current.length > 0) {
        const prevState = undoStackRef.current.pop();
        if (canvasRef.current && ctxRef.current) {
          putCanvasSnapshot(prevState);
          const dataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
          localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
          if (onSave) onSave(dataUrl);
          syncToBackend(dataUrl, textsRef.current);
        }
      }
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let resizeTimer = null;

    const initCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || (window.innerWidth - 80);
      const height = rect.height || window.innerHeight;

      const contentContainer = document.querySelector('.max-w-4xl, .max-w-5xl, .max-w-6xl');
      if (contentContainer) {
          const cRect = contentContainer.getBoundingClientRect();
          layoutAnchorRef.current = { x: cRect.left - rect.left, y: cRect.top - rect.top };
      }
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;

      const localImageData = savedImageData || localStorage.getItem(`planner_drawing_${pageKey}`);
      if (localImageData && localImageData !== "null") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) {
            const dpr = window.devicePixelRatio || 1;
            ctx.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
          }
        };
        img.src = localImageData;
      }
    };

    const resizeCanvas = () => {
      if (!canvas || !ctxRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const newWidth = rect.width;
      const newHeight = rect.height;

      if (newWidth === 0 || newHeight === 0) return;
      if (Math.abs(canvas.width - newWidth * dpr) < 2 && Math.abs(canvas.height - newHeight * dpr) < 2) return;

      let currentAnchorX = 0;
      let currentAnchorY = 0;
      const contentContainer = document.querySelector('.max-w-4xl, .max-w-5xl, .max-w-6xl');
      if (contentContainer) {
          const cRect = contentContainer.getBoundingClientRect();
          currentAnchorX = cRect.left - rect.left;
          currentAnchorY = cRect.top - rect.top;
      }

      let shiftX = 0;
      let shiftY = 0;
      if (layoutAnchorRef.current) {
          shiftX = currentAnchorX - layoutAnchorRef.current.x;
          shiftY = currentAnchorY - layoutAnchorRef.current.y;
      }
      layoutAnchorRef.current = { x: currentAnchorX, y: currentAnchorY };

      const dataUrl = canvas.toDataURL("image/png");
      
      canvas.width = newWidth * dpr;
      canvas.height = newHeight * dpr;
      
      const ctx = ctxRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, newWidth, newHeight);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const dpr = window.devicePixelRatio || 1;
          ctx.drawImage(img, shiftX, shiftY, img.width / dpr, img.height / dpr);
          
          if (shiftX !== 0 || shiftY !== 0) {
              const newDataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
              localStorage.setItem(`planner_drawing_${pageKey}`, newDataUrl);
              if (saveTimeout.current) clearTimeout(saveTimeout.current);
              saveTimeout.current = setTimeout(() => {
                syncToBackend(newDataUrl, textsRef.current);
              }, 1500);
          }
        }
      };
      img.src = dataUrl;

      if ((shiftX !== 0 || shiftY !== 0) && textsRef.current.length > 0) {
         const updatedTexts = textsRef.current.map(t => ({ ...t, x: t.x + shiftX, y: t.y + shiftY }));
         textsRef.current = updatedTexts; 
         updateTextsState(updatedTexts); 
      }
    };

    const timer = setTimeout(initCanvas, 50);

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 150);
    });
    ro.observe(canvas);

    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      ro.disconnect();
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
        if (canvasRef.current) {
          const dataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
          localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
          if (onSave) onSave(dataUrl);
          syncToBackend(dataUrl, textsRef.current);
        }
      }
    };
  }, [pageKey, savedImageData, onSave]);

  const layoutAnchorRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);
  const [texts, setTexts] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);
  const prevGlobalTextSizeRef = useRef(globalTextSize);

  useEffect(() => {
    textsRef.current = texts;
  }, [texts]);

  useEffect(() => {
    if (prevGlobalTextSizeRef.current !== globalTextSize) {
      prevGlobalTextSizeRef.current = globalTextSize;
      if (activeTextId) {
        updateTextsState(prev => {
          const target = prev.find(t => t.id === activeTextId);
          const newSize = globalTextSize > 0 ? globalTextSize : null;
          if (target && target.customFontSize !== newSize) {
            return prev.map(t => 
              t.id === activeTextId ? { ...t, customFontSize: newSize } : t
            );
          }
          return prev;
        });
      }
    }
  }, [globalTextSize, activeTextId]);

  useEffect(() => {
    let isSubscribed = true;
    syncIdRef.current = null;
    lastLocalUpdateTime.current = 0; // Reset for new page to enforce fresh pull
    
    // First load from local storage for fast feedback
    const saved = localStorage.getItem(`planner_texts_${pageKey}`);
    if (saved) {
      try { setTexts(JSON.parse(saved)); } catch (e) { setTexts([]); }
    } else {
      setTexts([]);
    }

    // Then load from remote
    const loadRemote = async () => {
      try {
        const records = await base44.entities.PlannerSync.filter({ page_key: pageKey });
        if (records.length > 0 && isSubscribed) {
          syncIdRef.current = records[0].id;
          if (records[0].updated_at && records[0].updated_at > lastLocalUpdateTime.current) {
            lastLocalUpdateTime.current = records[0].updated_at;
            if (isDrawing.current) return; // Don't overwrite if user is actively drawing
            if (records[0].drawing_data && canvasRef.current && ctxRef.current) {
               const img = new Image();
               img.crossOrigin = "anonymous";
               img.onload = () => {
                   if (isDrawing.current) return;
                   ctxRef.current.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
                   const dpr = window.devicePixelRatio || 1;
                   ctxRef.current.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
                   localStorage.setItem(`planner_drawing_${pageKey}`, records[0].drawing_data);
               };
               img.src = records[0].drawing_data;
            }
            if (records[0].texts_data) {
               const parsedTexts = JSON.parse(records[0].texts_data);
               setTexts(parsedTexts);
               localStorage.setItem(`planner_texts_${pageKey}`, records[0].texts_data);
            }
          }
        }
      } catch(e) {}
    };
    loadRemote();

    const unsub = base44.entities.PlannerSync.subscribe((event) => {
        if (!isSubscribed) return;
        if (event.data.page_key === pageKey) {
            syncIdRef.current = event.data.id;
            // Use myRecentSaves instead of time offsets to bypass clock skew issues between devices
            if (event.data.updated_at && !myRecentSaves.current.has(event.data.updated_at)) {
                lastLocalUpdateTime.current = event.data.updated_at;
                if (isDrawing.current) return; // Don't interrupt drawing
                if (event.data.drawing_data && canvasRef.current && ctxRef.current) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        if (isDrawing.current) return;
                        ctxRef.current.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
                        const dpr = window.devicePixelRatio || 1;
                        ctxRef.current.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
                        localStorage.setItem(`planner_drawing_${pageKey}`, event.data.drawing_data);
                    };
                    img.src = event.data.drawing_data;
                }
                if (event.data.texts_data) {
                    const parsedTexts = JSON.parse(event.data.texts_data);
                    setTexts(parsedTexts);
                    localStorage.setItem(`planner_texts_${pageKey}`, event.data.texts_data);
                }
            }
        }
    });

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, [pageKey]);

  const updateTextsState = (action) => {
    setTexts(prev => {
      const updated = typeof action === 'function' ? action(prev) : action;
      localStorage.setItem(`planner_texts_${pageKey}`, JSON.stringify(updated));
      
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (canvasRef.current) {
          const dataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
          syncToBackend(dataUrl, updated);
        }
      }, 1000);
      
      return updated;
    });
  };

  const pointsRef = useRef([]);
  const preStrokeStateRef = useRef(null);
  const doubleTapSnapshotRef = useRef(null);
  const activeToolRef = useRef('pen');
  const lineWidthRef = useRef(2.2);
  const pendingDoubleClickRef = useRef(null);

  const handleTripleClickAction = (clientX, clientY, textObj = null) => {
    if (pendingDoubleClickRef.current) {
        clearTimeout(pendingDoubleClickRef.current);
        pendingDoubleClickRef.current = null;
    }
    let targetText = textObj;
    if (!targetText && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        targetText = textsRef.current.find(t => {
           const tWidth = parseInt(t.width) || 200;
           const lines = t.text ? t.text.split('\n').length : 1;
           const tHeight = (t.lineHeight || 32) * lines;
           return x >= t.x - 20 && x <= t.x + tWidth + 20 && y >= t.y - 20 && y <= t.y + tHeight + 20;
        });
    }

    if (targetText) {
        if (targetText.isStrikethrough) {
            updateTextsState(prev => prev.map(t => t.id === targetText.id ? { ...t, isStrikethrough: false, strikethroughBounds: null } : t));
            return; // Skip canvas erasing to preserve highlighters underneath
        }
    }

    if (targetText && ctxRef.current) {
        const ctx = ctxRef.current;
        
        undoStackRef.current.push(getCanvasSnapshot());
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const lines = targetText.text ? targetText.text.split('\n').length : 1;
        for (let i = 0; i < lines; i++) {
           const lineY = targetText.y + (targetText.lineHeight || 32) * (i + 0.5);
           ctx.moveTo(targetText.x - 10, lineY);
           ctx.lineTo(targetText.x + parseInt(targetText.width || 200) + 10, lineY);
        }
        ctx.stroke();
        ctx.restore();
        
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
            localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
            if (onSave) onSave(dataUrl);
            syncToBackend(dataUrl, textsRef.current);
          }
          saveTimeout.current = null;
        }, 1500); 
    } else if (!targetText && ctxRef.current) {
        const ctx = ctxRef.current;
        const rect = canvasRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const scaleX = (canvasRef.current.width / dpr) / rect.width;
        const scaleY = (canvasRef.current.height / dpr) / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        undoStackRef.current.push(getCanvasSnapshot());
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 150, y);
        ctx.lineTo(x + 150, y);
        ctx.stroke();
        ctx.restore();
        
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
            localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
            if (onSave) onSave(dataUrl);
            syncToBackend(dataUrl, textsRef.current);
          }
          saveTimeout.current = null;
        }, 1500); 
    }
  };

  const handleDoubleClickAction = (clientX, clientY, pointerType) => {
    if (pendingDoubleClickRef.current) clearTimeout(pendingDoubleClickRef.current);
    
    pendingDoubleClickRef.current = setTimeout(() => {
      pendingDoubleClickRef.current = null;
      if (!canvasRef.current) return;
      
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
      '[class*="border-b"], [style*="gradient"], hr'
    )).filter(el => {
       if (el.children.length > 0 && !el.style.backgroundImage) return false;
       if (el.tagName.toLowerCase() === 'button' || el.closest('button')) return false;
       return true;
    });

    let minDistance = Infinity;
    let bestLine = null;

    for (const el of lineElements) {
      const elRect = el.getBoundingClientRect();
      if (elRect.width === 0 || elRect.height === 0) continue;

      let targetY;
      if (el.style.backgroundSize) {
         const match = el.style.backgroundSize.match(/(\d+)px/g);
         if (match && match.length > 0) {
             const lh = parseInt(match[match.length - 1]);
             const relativeY = clientY - elRect.top;
             const gridY = Math.ceil(Math.max(0, relativeY - 10) / lh) * lh;
             targetY = elRect.top + Math.max(lh, gridY);
         } else {
             targetY = elRect.bottom;
         }
      } else {
         targetY = elRect.bottom;
      }

      // We want lines that are BELOW the click, or very close above (if they clicked slightly below the line)
      let verticalPenalty = 0;
      if (targetY < clientY - 15) {
         verticalPenalty = 1000;
      }

      let vDist = Math.abs(clientY - targetY) + verticalPenalty;

      let hDist = 0;
      if (clientX < elRect.left) hDist = elRect.left - clientX;
      else if (clientX > elRect.right) hDist = clientX - elRect.right;

      let dist = vDist * 10 + hDist;

      if (dist < minDistance && dist < 2000) {
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
         startX = Math.max(0, bestRect.left - rect.left + 2); 
         width = `${bestRect.width - 4}px`;
      }
      
      if (bestLine.className && typeof bestLine.className === 'string' && bestLine.className.includes('border')) {
        // Find line height by looking for adjacent lines
        const siblingLines = lineElements.filter(el => {
           if (el === bestLine) return false;
           const r = el.getBoundingClientRect();
           return Math.abs(r.left - bestRect.left) < 20;
        });
        
        if (siblingLines.length > 0) {
           siblingLines.sort((a, b) => a.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom);
           const linesAbove = siblingLines.filter(el => el.getBoundingClientRect().bottom < bestRect.bottom - 5);
           if (linesAbove.length > 0) {
               const prevRect = linesAbove[linesAbove.length - 1].getBoundingClientRect();
               lineHeight = bestRect.bottom - prevRect.bottom;
           } else {
               const linesBelow = siblingLines.filter(el => el.getBoundingClientRect().bottom > bestRect.bottom + 5);
               if (linesBelow.length > 0) {
                   lineHeight = linesBelow[0].getBoundingClientRect().bottom - bestRect.bottom;
               }
           }
        }
        
        if (lineHeight < 20 || lineHeight > 100) lineHeight = 40;
        
        // Align text box to fit within the cell
        snappedY = (bestRect.bottom - rect.top) - lineHeight + (lineHeight === 40 ? 0 : 8); 
      } else if (bestLine.style.backgroundSize) {
         const match = bestLine.style.backgroundSize.match(/(\d+)px/g);
         if (match && match.length > 0) {
             lineHeight = parseInt(match[match.length - 1]);
             const relativeY = clientY - bestRect.top;
             const gridY = Math.ceil(Math.max(0, relativeY - 10) / lineHeight) * lineHeight;
             const targetY = Math.max(lineHeight, gridY);
             snappedY = targetY + bestRect.top - rect.top - lineHeight + (lineHeight === 40 ? 6 : 8); 
         }
      }
    }

    updateTextsState(prev => {
      const currentClickX = clientX - rect.left;
      const currentClickY = clientY - rect.top;
      
      const clickedTextIndex = prev.findIndex(t => {
        const tWidth = parseInt(t.width) || 200;
        const lines = t.text ? t.text.split('\n').length : 1;
        const tHeight = (t.lineHeight || 32) * lines;
        return currentClickX >= t.x && currentClickX <= t.x + tWidth && currentClickY >= t.y && currentClickY <= t.y + tHeight + 10;
      });

      if (clickedTextIndex !== -1) {
        const updated = [...prev];
        updated[clickedTextIndex] = { ...updated[clickedTextIndex], isEditing: true };
        return updated;
      }

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
          baselineY: snappedY + lineHeight,
          text: '',
          isEditing: true,
          lineHeight,
          width,
          customFontSize: globalTextSize > 0 ? globalTextSize : null
        };
        return [...prev, newText];
      }
    });
    
      if (doubleTapSnapshotRef.current && ctxRef.current) {
        putCanvasSnapshot(doubleTapSnapshotRef.current);
      } else if (pointerType !== 'touch' && preStrokeStateRef.current && ctxRef.current) {
        putCanvasSnapshot(preStrokeStateRef.current);
      }
      isDrawing.current = false;
    }, 250);
  };

  const lastTapPosRef = useRef({ x: 0, y: 0 }); // Tracks last tap position to detect double/triple taps

  const startDrawing = (e) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    const isPen = e.pointerType === 'pen';
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 500; 

    if (now - lastTapRef.current > DOUBLE_TAP_DELAY) {
      if (ctxRef.current && canvasRef.current) {
        doubleTapSnapshotRef.current = getCanvasSnapshot();
      }
    }

    // Only check double tap if it's not a pen, or if it's a mouse/touch that hasn't moved much
    const dx = Math.abs(e.clientX - lastTapPosRef.current.x);
    const dy = Math.abs(e.clientY - lastTapPosRef.current.y);
    const isSameSpot = dx < 40 && dy < 40;

    if (!isPen && isSameSpot && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      tapCountRef.current += 1;
      if (tapCountRef.current === 3) {
         handleTripleClickAction(e.clientX, e.clientY);
         tapCountRef.current = 0;
         lastTapRef.current = 0;
         return;
      } else if (tapCountRef.current === 2) {
         handleDoubleClickAction(e.clientX, e.clientY, e.pointerType);
         lastTapRef.current = now;
         return;
      }
    } else {
      tapCountRef.current = 1;
    }
    
    lastTapRef.current = now;
    lastTapPosRef.current = { x: e.clientX, y: e.clientY };

    // Allow drawing with finger (touch) for mobile support
    // removed: if (e.pointerType === 'touch') return;

    if (!ctxRef.current || !canvasRef.current) return;
    
    // Save canvas state for potential stroke replacement (scratch out / strike through)
    preStrokeStateRef.current = getCanvasSnapshot();
    
    isDrawing.current = true;
    
    const isPenEraserButton = (e.pointerType === 'pen' && ((e.buttons & 2) !== 0 || (e.buttons & 32) !== 0));
    isErasingRef.current = isEraserMode || activeTool === 'eraser' || isPenEraserButton;
    
    activeToolRef.current = isErasingRef.current ? 'eraser' : activeTool;

    const rect = canvasRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = (canvasRef.current.width / dpr) / rect.width;
    const scaleY = (canvasRef.current.height / dpr) / rect.height;
    
    canvasScaleRef.current = { left: rect.left, top: rect.top, scaleX, scaleY };
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    pointsRef.current = [{x, y}];
    
    ctxRef.current.globalCompositeOperation = activeToolRef.current === 'eraser' ? 'destination-out' : 'source-over';
    
    let color = '#1e293b';
    if (activeToolRef.current === 'highlighter') color = highlighterColor;
    else if (activeToolRef.current === 'eraser') color = 'rgba(0,0,0,1)';
    ctxRef.current.strokeStyle = color;
    
    let baseWidth = penWidth;
    if (activeToolRef.current === 'eraser') baseWidth = eraserWidth;
    else if (activeToolRef.current === 'highlighter') baseWidth = highlighterWidth;
    lineWidthRef.current = baseWidth;
    
    ctxRef.current.lineWidth = baseWidth;
    ctxRef.current.lineCap = activeToolRef.current === 'highlighter' ? 'square' : 'round';
    ctxRef.current.lineJoin = 'round';
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    e.stopPropagation();
    if (!isDrawing.current || !ctxRef.current || !canvasScaleRef.current) return;
    const { left, top, scaleX, scaleY } = canvasScaleRef.current;
    
    const nativeEvent = e.nativeEvent || e;
    const events = nativeEvent.getCoalescedEvents ? nativeEvent.getCoalescedEvents() : [nativeEvent];
    
    for (const ev of events) {
      const x = (ev.clientX - left) * scaleX;
      const y = (ev.clientY - top) * scaleY;
      pointsRef.current.push({x, y});
      
      const pts = pointsRef.current;
      
      if (pts.length >= 3) {
        const lastTwo = pts[pts.length - 2];
        const lastOne = pts[pts.length - 1];
        const lastThree = pts[pts.length - 3];
        
        const midX1 = (lastThree.x + lastTwo.x) / 2;
        const midY1 = (lastThree.y + lastTwo.y) / 2;
        const midX2 = (lastTwo.x + lastOne.x) / 2;
        const midY2 = (lastTwo.y + lastOne.y) / 2;
        
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(midX1, midY1);
        ctxRef.current.quadraticCurveTo(lastTwo.x, lastTwo.y, midX2, midY2);
        
        if (ev.pointerType === 'pen' && ev.pressure !== undefined && ev.pressure > 0) {
           if (activeToolRef.current === 'eraser') {
               ctxRef.current.lineWidth = lineWidthRef.current * 0.5 + ev.pressure * lineWidthRef.current * 1.5;
           } else if (activeToolRef.current === 'highlighter') {
               ctxRef.current.lineWidth = lineWidthRef.current;
           } else {
               ctxRef.current.lineWidth = lineWidthRef.current * 0.5 + ev.pressure * lineWidthRef.current * 1.2;
           }
        }
        
        ctxRef.current.stroke();
      } else if (pts.length === 2) {
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(pts[0].x, pts[0].y);
        ctxRef.current.lineTo(pts[1].x, pts[1].y);
        
        if (ev.pointerType === 'pen' && ev.pressure !== undefined && ev.pressure > 0) {
           if (activeToolRef.current === 'eraser') {
               ctxRef.current.lineWidth = lineWidthRef.current * 0.5 + ev.pressure * lineWidthRef.current * 1.5;
           } else if (activeToolRef.current === 'highlighter') {
               ctxRef.current.lineWidth = lineWidthRef.current;
           } else {
               ctxRef.current.lineWidth = lineWidthRef.current * 0.5 + ev.pressure * lineWidthRef.current * 1.2;
           }
        }
        
        ctxRef.current.stroke();
      }
    }
  };

  const endDrawing = (e) => {
    e.stopPropagation();
    if (!isDrawing.current) return;
    if (e && e.pointerId) {
        try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
    }
    isDrawing.current = false;
    
    const pts = pointsRef.current;
    if (pts.length > 1 && preStrokeStateRef.current) {
        undoStackRef.current.push(preStrokeStateRef.current);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    }
    
    // Reset composite operation just in case
    if (ctxRef.current) {
        ctxRef.current.globalCompositeOperation = 'source-over';
    }

    if (activeToolRef.current === 'highlighter' && pts.length > 5 && ctxRef.current && canvasRef.current) {
      let minX = pts[0].x, maxX = pts[0].x;
      let minY = pts[0].y, maxY = pts[0].y;
      let xReversals = 0;
      let lastDir = 0;
      let yReversals = 0;
      let lastYDir = 0;

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
      }

      const width = maxX - minX;
      const height = maxY - minY;

      if ((width > 40 && height < 30 && xReversals <= 2) || (height > 40 && width < 30 && yReversals <= 2)) {
        if (preStrokeStateRef.current) {
          putCanvasSnapshot(preStrokeStateRef.current);
        }
        
        ctxRef.current.globalCompositeOperation = 'source-over';
        ctxRef.current.strokeStyle = highlighterColor;
        ctxRef.current.lineWidth = lineWidthRef.current;
        ctxRef.current.lineCap = 'square';
        ctxRef.current.lineJoin = 'round';
        
        ctxRef.current.beginPath();
        
        if (width > height) {
            const startX = pts[0].x < pts[pts.length-1].x ? minX : maxX;
            const endX = pts[0].x < pts[pts.length-1].x ? maxX : minX;
            let finalY = (pts[0].y + pts[pts.length-1].y) / 2;
            
            let snapped = false;
            if (textsRef.current && textsRef.current.length > 0) {
                let minDist = 24;
                for (const t of textsRef.current) {
                    const textCenterY = t.y + (t.lineHeight || 32) / 2;
                    const tWidth = parseInt(t.width) || 200;
                    if (Math.abs(finalY - textCenterY) < minDist && startX < t.x + tWidth && endX > t.x) {
                        minDist = Math.abs(finalY - textCenterY);
                        finalY = textCenterY;
                        snapped = true;
                    }
                }
            }

            if (!snapped && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const clientY = finalY + rect.top;
                const lineElements = Array.from(document.querySelectorAll('[class*="border-b"], [style*="gradient"], hr'));
                let minDistance = 24;
                
                for (const el of lineElements) {
                    const elRect = el.getBoundingClientRect();
                    if (elRect.width === 0 || elRect.height === 0) continue;
                    
                    let targetY = null;
                    if (el.style.backgroundSize) {
                        const match = el.style.backgroundSize.match(/(\d+)px/g);
                        if (match && match.length > 0) {
                            const lh = parseInt(match[match.length - 1]);
                            const relativeY = clientY - elRect.top;
                            const gridY = Math.floor(relativeY / lh) * lh + (lh / 2);
                            targetY = elRect.top + gridY;
                        }
                    } else if (el.className && typeof el.className === 'string' && el.className.includes('border-b')) {
                        targetY = elRect.bottom - 16; 
                    }

                    if (targetY !== null && Math.abs(clientY - targetY) < minDistance) {
                        minDistance = Math.abs(clientY - targetY);
                        finalY = targetY - rect.top;
                    }
                }
            }

            ctxRef.current.moveTo(startX, finalY);
            ctxRef.current.lineTo(endX, finalY);
        } else {
            const startY = pts[0].y < pts[pts.length-1].y ? minY : maxY;
            const endY = pts[0].y < pts[pts.length-1].y ? maxY : minY;
            const avgX = (pts[0].x + pts[pts.length-1].x) / 2;
            ctxRef.current.moveTo(avgX, startY);
            ctxRef.current.lineTo(avgX, endY);
        }
        ctxRef.current.stroke();
      }
    }

    if (activeToolRef.current === 'pen' && pts.length > 5 && ctxRef.current && canvasRef.current) {
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

      // Strike-through detection (mostly horizontal, straight line)
      if (width > 60 && height < 20 && xReversals <= 1) {
        if (preStrokeStateRef.current) {
          putCanvasSnapshot(preStrokeStateRef.current);
        }
        
        let finalY = (pts[0].y + pts[pts.length-1].y) / 2;
        let snappedTextId = null;
        
        // Snap to text vertical center if nearby
        if (textsRef.current && textsRef.current.length > 0) {
            let minDist = 24;
            for (const t of textsRef.current) {
                const textCenterY = t.y + (t.lineHeight || 32) / 2;
                const tWidth = parseInt(t.width) || 200;
                if (Math.abs(finalY - textCenterY) < minDist && minX < t.x + tWidth && maxX > t.x) {
                    minDist = Math.abs(finalY - textCenterY);
                    finalY = textCenterY;
                    snappedTextId = t.id;
                }
            }
        }

        if (snappedTextId) {
            updateTextsState(prev => prev.map(t => {
                if (t.id === snappedTextId) {
                    if (t.isStrikethrough) {
                        return { ...t, isStrikethrough: false, strikethroughBounds: null };
                    } else {
                        return { ...t, isStrikethrough: true, strikethroughBounds: { minX, maxX } };
                    }
                }
                return t;
            }));
            return;
        }

        // Replace with perfectly straight triple strike-through lines (if not over text)
        ctxRef.current.strokeStyle = '#1e293b';
        ctxRef.current.lineWidth = 3;
        
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(minX, finalY - 6);
        ctxRef.current.lineTo(maxX, finalY - 6);
        ctxRef.current.stroke();

        ctxRef.current.beginPath();
        ctxRef.current.moveTo(minX, finalY);
        ctxRef.current.lineTo(maxX, finalY);
        ctxRef.current.stroke();
        
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(minX, finalY + 6);
        ctxRef.current.lineTo(maxX, finalY + 6);
        ctxRef.current.stroke();
      }
      // Checkmark detection -> replace with a perfect checkbox with green check
      else if (isCheckmark) {
        if (preStrokeStateRef.current) {
          putCanvasSnapshot(preStrokeStateRef.current);
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
        const dataUrl = canvasRef.current.toDataURL("image/webp", 0.5);
        localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
        if (onSave) onSave(dataUrl);
        syncToBackend(dataUrl, textsRef.current);
      }
      saveTimeout.current = null;
    }, 1500); 
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef} // FIXED: Changed from ref__
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={endDrawing}
        onPointerCancel={endDrawing}
        onDoubleClick={(e) => handleDoubleClickAction(e.clientX, e.clientY, 'mouse')}
        onClick={(e) => {
          if (e.detail === 3) {
            handleTripleClickAction(e.clientX, e.clientY);
          }
        }}
        className="w-full h-full"
        style={{ background: "transparent", display: "block", touchAction: "none" }}
      />
      {texts.map(textObj => (
        <TextItem 
          key={textObj.id} 
          textObj={textObj} 
          activeTemplate={activeTemplate}
          updateText={(id, updated) => updateTextsState(prev => prev.map(t => t.id === id ? updated : t))}
          deleteText={(id) => updateTextsState(prev => prev.filter(t => t.id !== id))}
          onTripleClick={() => handleTripleClickAction(0, 0, textObj)}
          onFocus={() => {
            setActiveTextId(textObj.id);
            if (onTextFocus) onTextFocus(textObj.customFontSize);
          }}
        />
      ))}
    </div>
  );
});

const TextItem = ({ textObj, updateText, deleteText, activeTemplate, onTripleClick, onFocus }) => {
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
    if (textObj.isEditing !== isEditing) {
      setIsEditing(textObj.isEditing);
    }
  }, [textObj.isEditing]);

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
      const currentBaseline = textObj.baselineY || (textObj.y + (textObj.lineHeight || 32));
      updateText(textObj.id, { 
        ...textObj, 
        text: val, 
        isEditing: false,
        baselineY: currentBaseline
      });
    }
  };

  useLayoutEffect(() => {
    if (!isEditing && textareaRef.current && activeTemplate !== 'IDEAL_WEEK' && textObj.customFontSize) {
      const currentBaseline = textObj.baselineY || (textObj.y + (textObj.lineHeight || 32));
      const prevMinHeight = textareaRef.current.style.minHeight;
      textareaRef.current.style.minHeight = '0px';
      textareaRef.current.style.height = '1px';
      const actualHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.minHeight = prevMinHeight;
      textareaRef.current.style.height = `${actualHeight + 2}px`;
      
      const newY = currentBaseline - actualHeight;
      if (Math.abs(newY - textObj.y) > 1) {
        updateText(textObj.id, { ...textObj, y: newY, baselineY: currentBaseline });
      }
    }
  }, [textObj.customFontSize, isEditing, val]);

  const lh = textObj.lineHeight || 32;

  const charsPerLine = textObj.width ? Math.max(12, parseInt(textObj.width) / 7) : 15;
  const estimatedLines = activeTemplate === 'IDEAL_WEEK' 
    ? Math.max(val.split('\n').length, Math.ceil(val.length / charsPerLine)) || 1
    : 1;
  const idealWeekFontSize = Math.max(13, Math.min(22, Math.floor(lh / (1.1 * estimatedLines))));

  return (
    <div 
      className="absolute group z-50"
      style={{ 
        left: textObj.x, 
        top: textObj.y, 
        width: textObj.width || `calc(100% - ${textObj.x}px - 40px)`, 
        minWidth: activeTemplate === 'IDEAL_WEEK' ? '50px' : '200px',
        pointerEvents: isEditing ? 'auto' : 'none'
      }}
      onPointerDown={(e) => { if (isEditing) e.stopPropagation(); }}
    >
      <textarea
        ref={textareaRef}
        value={val}
        rows={1}
        onChange={handleInput}
        onBlur={handleBlur}
        onFocus={onFocus}
        onClick={(e) => { 
          if (e.detail === 3) {
            if (onTripleClick) onTripleClick();
          } else {
            if (!isEditing) setIsEditing(true); 
          }
        }}
        className="w-full bg-transparent outline-none resize-none overflow-hidden pr-8"
        style={{
          lineHeight: textObj.customFontSize ? '1.2' : (activeTemplate === 'IDEAL_WEEK' ? '1.2' : `${lh}px`),
          fontSize: textObj.customFontSize ? `${textObj.customFontSize}px` : (activeTemplate === 'IDEAL_WEEK' ? `${idealWeekFontSize}px` : `${Math.max(18, Math.min(32, Math.round(lh * 0.8)))}px`),
          fontFamily: "'Caveat', cursive",
          color: textObj.isLoading ? '#94a3b8' : '#1e293b',
          border: isEditing ? '1px dashed #94a3b8' : '1px solid transparent',
          minHeight: textObj.customFontSize ? '0px' : `${lh}px`,
          padding: activeTemplate === 'IDEAL_WEEK' ? '4px 4px 4px 8px' : 0,
          margin: 0,
          userSelect: isEditing ? 'auto' : 'none',
          WebkitUserSelect: isEditing ? 'auto' : 'none',
          pointerEvents: isEditing ? 'auto' : 'none'
        }}
        placeholder={isEditing ? "Type here..." : ""}
        readOnly={textObj.isLoading}
      />
      {textObj.isStrikethrough && (
        <div className="absolute pointer-events-none flex flex-col justify-center gap-[3px]" 
             style={{ 
               top: `${(lh || 32) / 2}px`, 
               transform: 'translateY(-50%)', 
               left: textObj.strikethroughBounds ? `${Math.max(0, textObj.strikethroughBounds.minX - textObj.x)}px` : '4px',
               width: textObj.strikethroughBounds ? `${textObj.strikethroughBounds.maxX - textObj.strikethroughBounds.minX}px` : 'calc(100% - 12px)'
             }}>
           <div className="w-full h-[3px] bg-[#1e293b] rounded-full"></div>
           <div className="w-full h-[3px] bg-[#1e293b] rounded-full"></div>
           <div className="w-full h-[3px] bg-[#1e293b] rounded-full"></div>
        </div>
      )}
      {isEditing && !textObj.isLoading && (
        <button 
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteText(textObj.id);
          }}
          className="absolute right-0 top-0 p-2 text-red-500 hover:bg-red-50 rounded z-50 bg-white shadow-sm border border-red-100"
          title="Delete text"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default GlobalCanvas;