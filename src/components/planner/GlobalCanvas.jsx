import React, { useEffect, useLayoutEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

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
  highlighterColor = 'rgba(253, 224, 71, 0.8)'
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
  const drawingFrameRef = useRef(null);
  const lastDrawnIndexRef = useRef(0);
  const pendingRemoteDrawingRef = useRef(null);
  const { user } = useAuth();

  const getCanvasSnapshot = () => {
    if (!canvasRef.current) return null;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    tempCanvas.getContext('2d').drawImage(canvasRef.current, 0, 0);
    return tempCanvas;
  };

  const getScaledDataUrl = () => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    if (dpr <= 1) {
      // Force transparent background for the saved image so it doesn't cover templates
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, 0);
      return tempCanvas.toDataURL("image/webp", 0.4);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width / dpr;
    tempCanvas.height = canvas.height / dpr;
    const ctx = tempCanvas.getContext('2d');

    // Don't fill with white, keep it transparent so templates show through
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    // Use low-quality webp to drastically reduce size and upload/processing time
    return tempCanvas.toDataURL("image/webp", 0.4);
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
    if (!user?.email) return;
    const timestamp = Date.now();
    lastLocalUpdateTime.current = timestamp;
    localStorage.setItem(`planner_updated_at_${pageKey}`, timestamp.toString());
    if (myRecentSaves.current) {
      myRecentSaves.current.add(timestamp);
      setTimeout(() => { if (myRecentSaves.current) myRecentSaves.current.delete(timestamp); }, 15000);
    }
    
    const dpr = window.devicePixelRatio || 1;
    const currentLogicalWidth = canvasRef.current ? canvasRef.current.width / dpr : window.innerWidth;
    
    const textPayload = JSON.stringify({
        texts: currentTexts,
        canvasWidth: currentLogicalWidth
    });

    try {
      let finalDrawingData = dataUrl;
      // Only upload if it's dangerously close to the 200KB entity limit to avoid choking the sync
      if (dataUrl && dataUrl.length > 180000) {
          try {
            const uploadRes = await base44.integrations.Core.UploadFile({ file: dataUrl });
            if (uploadRes && uploadRes.file_url) {
              finalDrawingData = uploadRes.file_url;
            }
          } catch (uploadError) {
            console.error('Failed to upload image to CDN:', uploadError);
          }
      }

      if (syncIdRef.current) {
        await base44.entities.PlannerSync.update(syncIdRef.current, {
          page_key: pageKey,
          drawing_data: finalDrawingData,
          texts_data: textPayload,
          updated_at: timestamp
        });
      } else {
        const records = await base44.entities.PlannerSync.filter({ page_key: pageKey, created_by: user.email });
        if (records.length > 0) {
          syncIdRef.current = records[0].id;
          await base44.entities.PlannerSync.update(syncIdRef.current, {
            page_key: pageKey,
            drawing_data: finalDrawingData,
            texts_data: textPayload,
            updated_at: timestamp
          });
        } else {
          const res = await base44.entities.PlannerSync.create({
            page_key: pageKey,
            drawing_data: finalDrawingData,
            texts_data: textPayload,
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
        const dataUrl = getScaledDataUrl();
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
          const dataUrl = getScaledDataUrl();
          localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
          if (onSave) onSave(dataUrl);
          syncToBackend(dataUrl, textsRef.current);
        }
      }
    },
    getDataUrl: () => getScaledDataUrl(),
    convertHandwritingToText: (inputItems) => {
      if (canvasRef.current && ctxRef.current) {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        const w = canvas.width;
        const h = canvas.height;
        
        undoStackRef.current.push(getCanvasSnapshot());
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();

        // Clear all ink
        ctx.clearRect(0, 0, w, h);
        
        // Ensure any pre-existing webp snapshots (like scratchpad backgrounds) are not permanently wiped out from the background canvas if they were part of the previous state
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Redraw transparent background to ensure template lines from CSS remain visible underneath
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, w, h);
        
        const newTexts = [];

        // Ensure inputItems is an array (fallback if string was passed somehow)
        const itemsToProcess = Array.isArray(inputItems) ? inputItems : [{
           text: typeof inputItems === 'string' ? inputItems : '',
           x_percent: 0.1,
           y_percent: 0.1
        }];

        const lineElements = Array.from(document.querySelectorAll(
          '[class*="border-b"], [style*="gradient"], hr'
        )).filter(el => {
           if (el.children.length > 0 && !el.style.backgroundImage) return false;
           if (el.tagName.toLowerCase() === 'button' || el.closest('button')) return false;
           return true;
        });

        itemsToProcess.forEach((item, index) => {
            const textX = (item.x_percent * w) / dpr;
            const textY = (item.y_percent * h) / dpr;

            let startX = textX;
            let snappedY = textY;
            let actualLh = 40;
            let textW = Math.max(100, (rect.width || 800) - textX - 40);
            
            const clientY = textY + rect.top;
            const clientX = textX + rect.left;

            let minDistance = Infinity;
            let bestLine = null;

            for (const el of lineElements) {
              const elRect = el.getBoundingClientRect();
              if (elRect.width === 0 || elRect.height === 0) continue;

              let targetY;
              if (el.style.backgroundSize) {
                 const match = el.style.backgroundSize.match(/(\d+)px/g);
                 if (match && match.length > 0) {
                     const elLh = parseInt(match[match.length - 1]);
                     const relativeY = clientY - elRect.top;
                     const lineIndex = Math.floor(Math.max(0, relativeY) / elLh);
                     
                     let offset = 0;
                     if (el.style.backgroundPosition) {
                        const posMatch = el.style.backgroundPosition.match(/(\d+)px/);
                        if (posMatch && posMatch.length > 1) {
                           offset = parseInt(posMatch[1]);
                        }
                     }
                     
                     targetY = elRect.top + lineIndex * elLh + offset;
                 } else {
                     targetY = elRect.bottom;
                 }
              } else {
                 targetY = elRect.bottom;
              }

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
                 textW = bestRect.right - clientX - 16;
              } else {
                 const lineStart = bestRect.left - rect.left + 8;
                 startX = Math.max(lineStart, textX); 
                 
                 const lineEnd = bestRect.right - rect.left;
                 textW = Math.max(50, lineEnd - startX - 16);
              }
              
              if (bestLine.className && typeof bestLine.className === 'string' && bestLine.className.includes('border')) {
                actualLh = 40;
                snappedY = (bestRect.bottom - rect.top) - 40; 
              } else if (bestLine.style.backgroundSize) {
                 const match = bestLine.style.backgroundSize.match(/(\d+)px/g);
                 if (match && match.length > 0) {
                     actualLh = parseInt(match[match.length - 1]);
                     const relativeY = clientY - bestRect.top;
                     
                     let offset = 0;
                     if (bestLine.style.backgroundPosition) {
                        const posMatch = bestLine.style.backgroundPosition.match(/(\d+)px/);
                        if (posMatch && posMatch.length > 1) {
                           offset = parseInt(posMatch[1]);
                        }
                     }
                     
                     const lineIndex = Math.floor(Math.max(0, relativeY) / actualLh);
                     const targetBaseline = bestRect.top + lineIndex * actualLh + offset;
                     snappedY = targetBaseline - rect.top - actualLh + (actualLh === 40 ? 0 : 8); 
                 }
                 // Allow startX to be accurate to where user wrote it within the line bounds
                 const lineStart = bestRect.left - rect.left + 8;
                 startX = Math.max(lineStart, textX);
                 textW = Math.max(50, bestRect.right - rect.left - startX - 16);
              }
            } else {
               snappedY = Math.round((textY - 16) / 40) * 40;
            }

            newTexts.push({
                id: Date.now().toString() + '_' + index,
                x: startX,
                y: snappedY,
                baselineY: snappedY + actualLh,
                text: item.text,
                isEditing: false,
                lineHeight: actualLh,
                width: `${textW}px`
            });
        });

        updateTextsState(prev => [...prev, ...newTexts]);
        
        const dataUrl = getScaledDataUrl();
        localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
        if (onSave) onSave(dataUrl);
      }
    }
  }));

  useLayoutEffect(() => {
    return () => {
      if (saveTimeout.current && canvasRef.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
        const dataUrl = getScaledDataUrl();
        localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
        if (onSave) onSave(dataUrl);
        syncToBackend(dataUrl, textsRef.current);
      }
    };
  }, [pageKey, onSave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let resizeTimer = null;

    const initCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || (window.innerWidth - 80);
      const height = rect.height || window.innerHeight;

      layoutAnchorRef.current = { x: 0, y: 0 };
      
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
      if (localImageData && localImageData !== "null" && localImageData.length > 50) { // Check length to avoid loading empty broken strings
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) {
            ctx.drawImage(img, 0, 0, img.width, img.height);
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

      let shiftX = 0;
      let shiftY = 0;
      layoutAnchorRef.current = { x: 0, y: 0 };

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
          const oldLogicalWidth = img.width / dpr;
          const oldLogicalHeight = img.height / dpr;
          ctx.drawImage(img, shiftX, shiftY, oldLogicalWidth, oldLogicalHeight);
          
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
    };
  }, [pageKey, savedImageData, onSave]);

  const layoutAnchorRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);
  const [texts, setTexts] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);

  useEffect(() => {
    textsRef.current = texts;
  }, [texts]);

  useEffect(() => {
    let isSubscribed = true;
    syncIdRef.current = null;
    lastLocalUpdateTime.current = parseInt(localStorage.getItem(`planner_updated_at_${pageKey}`) || '0'); // Reset for new page to enforce fresh pull
    
    // First load from local storage for fast feedback
    const saved = localStorage.getItem(`planner_texts_${pageKey}`);
    if (saved) {
      try { setTexts(JSON.parse(saved)); } catch (e) { setTexts([]); }
    } else {
      setTexts([]);
    }

    // Then load from remote
    const loadRemote = async () => {
      if (!user?.email) return;
      try {
        const records = await base44.entities.PlannerSync.filter({ page_key: pageKey, created_by: user.email });
        if (records.length > 0 && isSubscribed) {
          syncIdRef.current = records[0].id;
          if (records[0].updated_at && records[0].updated_at > lastLocalUpdateTime.current) {
            lastLocalUpdateTime.current = records[0].updated_at;
            localStorage.setItem(`planner_updated_at_${pageKey}`, records[0].updated_at.toString());
            if (isDrawing.current) return; // Don't overwrite if user is actively drawing
            if (records[0].drawing_data && canvasRef.current && ctxRef.current) {
               const img = new Image();
               img.crossOrigin = "anonymous";
               img.onload = () => {
                   if (isDrawing.current) return;
                   ctxRef.current.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
                   const dpr = window.devicePixelRatio || 1;
                   ctxRef.current.drawImage(img, 0, 0, img.width, img.height);
                   localStorage.setItem(`planner_drawing_${pageKey}`, records[0].drawing_data);
               };
               img.src = records[0].drawing_data;
            }
            if (records[0].texts_data) {
               try {
                   const parsed = JSON.parse(records[0].texts_data);
                   let textsArray = Array.isArray(parsed) ? parsed : (parsed.texts || []);
                   if (parsed.canvasWidth && canvasRef.current) {
                       // Canvas size is now permanently fixed
                       const dpr = window.devicePixelRatio || 1;
                   }
                   setTexts(textsArray);
                   localStorage.setItem(`planner_texts_${pageKey}`, JSON.stringify(textsArray));
               } catch(e) {}
            }
          }
        }
      } catch(e) {}
    };
    loadRemote();

    const unsub = base44.entities.PlannerSync.subscribe(async (event) => {
        if (!isSubscribed) return;
        
        let recordData = event.data;
        if (!recordData) {
            if (event.id) {
                try { recordData = await base44.entities.PlannerSync.get(event.id); } catch(e) {}
            }
            if (!recordData) return;
        }

        if (recordData.created_by && user && recordData.created_by !== user.email) return;

        if (recordData.page_key === pageKey || (event.id && syncIdRef.current === event.id)) {
            syncIdRef.current = event.id || recordData.id || syncIdRef.current;
            // Use myRecentSaves instead of time offsets to bypass clock skew issues between devices
            if (recordData.updated_at && !myRecentSaves.current.has(recordData.updated_at) && recordData.updated_at > lastLocalUpdateTime.current) {
                lastLocalUpdateTime.current = recordData.updated_at;
                localStorage.setItem(`planner_updated_at_${pageKey}`, recordData.updated_at.toString());
                if (isDrawing.current) return; // Don't interrupt drawing
                if (recordData.drawing_data && canvasRef.current && ctxRef.current) {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        if (isDrawing.current) return;
                        ctxRef.current.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
                        const dpr = window.devicePixelRatio || 1;
                        ctxRef.current.drawImage(img, 0, 0, img.width, img.height);
                        localStorage.setItem(`planner_drawing_${pageKey}`, recordData.drawing_data);
                    };
                    img.src = recordData.drawing_data;
                }
                if (recordData.texts_data) {
                   try {
                       const parsed = JSON.parse(recordData.texts_data);
                       let textsArray = Array.isArray(parsed) ? parsed : (parsed.texts || []);
                       if (parsed.canvasWidth && canvasRef.current) {
                           // Canvas size is now permanently fixed
                           const dpr = window.devicePixelRatio || 1;
                       }
                       textsArray = textsArray.map(incomingText => {
                           const localText = textsRef.current.find(t => t.id === incomingText.id);
                           if (localText && localText.isEditing) {
                               return { ...incomingText, isEditing: true, text: localText.text };
                           }
                           return { ...incomingText, isEditing: false };
                       });
                       setTexts(textsArray);
                       localStorage.setItem(`planner_texts_${pageKey}`, JSON.stringify(textsArray));
                   } catch(e) {}
                }
            }
        }
    });

    return () => {
      isSubscribed = false;
      unsub();
    };
  }, [pageKey, user?.email]);

  const updateTextsState = (action) => {
    setTexts(prev => {
      const updated = typeof action === 'function' ? action(prev) : action;
      textsRef.current = updated;
      localStorage.setItem(`planner_texts_${pageKey}`, JSON.stringify(updated));
      
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (canvasRef.current) {
          const dataUrl = getScaledDataUrl();
          syncToBackend(dataUrl, updated);
        }
      }, 3000);
      
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
           const tHeight = (t.lineHeight || 40) * lines;
           return x >= t.x - 20 && x <= t.x + tWidth + 20 && y >= t.y - 20 && y <= t.y + tHeight + 20;
        });
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
           const lineY = targetText.y + (targetText.lineHeight || 40) * (i + 0.5);
           ctx.moveTo(targetText.x - 10, lineY);
           ctx.lineTo(targetText.x + parseInt(targetText.width || 200) + 10, lineY);
        }
        ctx.stroke();
        ctx.restore();
        
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
          if (canvasRef.current) {
            const dataUrl = getScaledDataUrl();
            localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
            if (onSave) onSave(dataUrl);
            syncToBackend(dataUrl, textsRef.current);
          }
          saveTimeout.current = null;
        }, 3000); 
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
            const dataUrl = getScaledDataUrl();
            localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
            if (onSave) onSave(dataUrl);
            syncToBackend(dataUrl, textsRef.current);
          }
          saveTimeout.current = null;
        }, 3000); 
    }
  };

  const handleDoubleClickAction = (clientX, clientY, pointerType) => {
    if (activeToolRef.current === 'eraser' || isErasingRef.current) return;
    if (pendingDoubleClickRef.current) clearTimeout(pendingDoubleClickRef.current);
    
    pendingDoubleClickRef.current = setTimeout(() => {
      pendingDoubleClickRef.current = null;
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const clickY = clientY - rect.top;
    let snappedY = Math.round((clickY - 16) / 40) * 40;

    let startX = clientX - rect.left;
    let lineHeight = 40;
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
             
             let offset = 0;
             if (el.style.backgroundPosition) {
                const posMatch = el.style.backgroundPosition.match(/(\d+)px/);
                if (posMatch && posMatch.length > 1) {
                   offset = parseInt(posMatch[1]);
                }
             }

             const lineIndex = Math.floor(Math.max(0, relativeY) / lh);
             targetY = elRect.top + lineIndex * lh + offset;
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
         startX = Math.max(0, bestRect.left - rect.left + 8); 
         width = `${Math.max(50, bestRect.width - 16)}px`;
      }
      
      if (bestLine.className && typeof bestLine.className === 'string' && bestLine.className.includes('border')) {
        lineHeight = 40;
        // Align text box to fit exactly above the line
        snappedY = (bestRect.bottom - rect.top) - 40; 
      } else if (bestLine.style.backgroundSize) {
         const match = bestLine.style.backgroundSize.match(/(\d+)px/g);
         if (match && match.length > 0) {
             lineHeight = parseInt(match[match.length - 1]);
             const relativeY = clientY - bestRect.top;
             
             let offset = 0;
             if (bestLine.style.backgroundPosition) {
                const posMatch = bestLine.style.backgroundPosition.match(/(\d+)px/);
                if (posMatch && posMatch.length > 1) {
                   offset = parseInt(posMatch[1]);
                }
             }

             const lineIndex = Math.floor(Math.max(0, relativeY) / lineHeight);
             const targetY = lineIndex * lineHeight + offset;
             
             snappedY = targetY + bestRect.top - rect.top - lineHeight + (lineHeight === 40 ? 0 : 8); 
         }
         startX = Math.max(0, bestRect.left - rect.left + 8);
         width = `${Math.max(50, bestRect.width - 16)}px`;
      }
    }

    updateTextsState(prev => {
      const currentClickX = clientX - rect.left;
      const currentClickY = clientY - rect.top;
      
      const clickedTextIndex = prev.findIndex(t => {
        const tWidth = parseInt(t.width) || 200;
        const lines = t.text ? t.text.split('\n').length : 1;
        const tHeight = (t.lineHeight || 40) * lines;
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
          width
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
    if (document.activeElement && (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT')) {
        document.activeElement.blur();
        return;
    }

    const isPenOrMouse = e.pointerType === 'pen' || e.pointerType === 'mouse';
    if (isPenOrMouse) {
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);
    }
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 500; 

    if (now - lastTapRef.current > DOUBLE_TAP_DELAY) {
      if (ctxRef.current && canvasRef.current) {
        doubleTapSnapshotRef.current = getCanvasSnapshot();
      }
    }

    const dx = Math.abs(e.clientX - lastTapPosRef.current.x);
    const dy = Math.abs(e.clientY - lastTapPosRef.current.y);
    const isSameSpot = dx < 40 && dy < 40;

    if (e.pointerType === 'touch' && isSameSpot && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
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

    if (!isPenOrMouse) {
        if (e.target.hasPointerCapture(e.pointerId)) {
            try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
        }
        return;
    }

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
    lastDrawnIndexRef.current = 0;
    
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

    if (activeToolRef.current === 'eraser') {
       const eraserRadius = (baseWidth / 2) || 15;
       const textsToRemove = [];
       for (const t of textsRef.current) {
          const tWidth = parseInt(t.width) || 200;
          const tLines = t.text ? t.text.split('\n').length : 1;
          const tHeight = (t.lineHeight || 40) * tLines;
          
          const testX = Math.max(t.x, Math.min(x, t.x + tWidth));
          const testY = Math.max(t.y, Math.min(y, t.y + tHeight));
          
          const distX = x - testX;
          const distY = y - testY;
          
          if ((distX * distX) + (distY * distY) <= (eraserRadius * eraserRadius)) {
             textsToRemove.push(t.id);
          }
       }
       if (textsToRemove.length > 0) {
          updateTextsState(prev => prev.filter(t => !textsToRemove.includes(t.id)));
       }
    }
  };

  const draw = (e) => {
    if (!isDrawing.current || !ctxRef.current || !canvasScaleRef.current) return;
    e.stopPropagation();
    const { left, top, scaleX, scaleY } = canvasScaleRef.current;
    
    const nativeEvent = e.nativeEvent || e;
    const events = nativeEvent.getCoalescedEvents ? nativeEvent.getCoalescedEvents() : [nativeEvent];
    
    for (const ev of events) {
      const x = (ev.clientX - left) * scaleX;
      const y = (ev.clientY - top) * scaleY;
      pointsRef.current.push({x, y});
      
      if (ev.pointerType === 'pen' && ev.pressure !== undefined && ev.pressure > 0) {
         if (activeToolRef.current === 'eraser') {
             ctxRef.current.lineWidth = lineWidthRef.current * 0.5 + ev.pressure * lineWidthRef.current * 1.5;
         } else if (activeToolRef.current === 'highlighter') {
             ctxRef.current.lineWidth = lineWidthRef.current;
         } else {
             ctxRef.current.lineWidth = lineWidthRef.current * 0.5 + ev.pressure * lineWidthRef.current * 1.2;
         }
      }

      if (activeToolRef.current === 'eraser') {
         const eraserRadius = (ctxRef.current?.lineWidth / 2) || (lineWidthRef.current / 2) || 15;
         const textsToRemove = [];
         for (const t of textsRef.current) {
            const tWidth = parseInt(t.width) || 200;
            const tLines = t.text ? t.text.split('\n').length : 1;
            const tHeight = (t.lineHeight || 40) * tLines;
            
            const testX = Math.max(t.x, Math.min(x, t.x + tWidth));
            const testY = Math.max(t.y, Math.min(y, t.y + tHeight));
            
            const distX = x - testX;
            const distY = y - testY;
            
            if ((distX * distX) + (distY * distY) <= (eraserRadius * eraserRadius)) {
               textsToRemove.push(t.id);
            }
         }
         if (textsToRemove.length > 0) {
            updateTextsState(prev => prev.filter(t => !textsToRemove.includes(t.id)));
         }
      }
    }

    if (!drawingFrameRef.current) {
      drawingFrameRef.current = requestAnimationFrame(renderPoints);
    }
  };

  const renderPoints = () => {
    if (!ctxRef.current) return;
    
    const pts = pointsRef.current;

    if (activeToolRef.current === 'highlighter') {
      if (preStrokeStateRef.current) {
        putCanvasSnapshot(preStrokeStateRef.current);
      }
      ctxRef.current.beginPath();
      if (pts.length > 0) {
        if (pts.length === 1) {
          ctxRef.current.moveTo(pts[0].x, pts[0].y);
          ctxRef.current.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
        } else {
          ctxRef.current.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) {
            ctxRef.current.lineTo(pts[j].x, pts[j].y);
          }
        }
      }
      ctxRef.current.stroke();
      
      if (!isDrawing.current) {
        drawingFrameRef.current = null;
      } else {
        drawingFrameRef.current = requestAnimationFrame(renderPoints);
      }
      return;
    }

    let i = lastDrawnIndexRef.current;
    
    while (i < pts.length - 2) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const p2 = pts[i + 2];
      
      const midX1 = (p0.x + p1.x) / 2;
      const midY1 = (p0.y + p1.y) / 2;
      const midX2 = (p1.x + p2.x) / 2;
      const midY2 = (p1.y + p2.y) / 2;
      
      ctxRef.current.beginPath();
      if (i === 0) {
        ctxRef.current.moveTo(p0.x, p0.y);
        ctxRef.current.lineTo(midX1, midY1);
      } else {
        ctxRef.current.moveTo(midX1, midY1);
      }
      ctxRef.current.quadraticCurveTo(p1.x, p1.y, midX2, midY2);
      ctxRef.current.stroke();
      
      i++;
    }
    
    lastDrawnIndexRef.current = i;

    if (!isDrawing.current) {
      if (pts.length > 0) {
        ctxRef.current.beginPath();
        if (pts.length === 1) {
          // Only draw dots for pen/touch, prevent accidental dots when clicking with mouse
          // We can use activeToolRef or just not worry about checking e here if we handle the blur properly
          ctxRef.current.moveTo(pts[0].x, pts[0].y);
          ctxRef.current.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
        } else if (pts.length === 2) {
          ctxRef.current.moveTo(pts[0].x, pts[0].y);
          ctxRef.current.lineTo(pts[1].x, pts[1].y);
        } else {
          const p1 = pts[pts.length - 2];
          const p2 = pts[pts.length - 1];
          const midX2 = (p1.x + p2.x) / 2;
          const midY2 = (p1.y + p2.y) / 2;
          ctxRef.current.moveTo(midX2, midY2);
          ctxRef.current.lineTo(p2.x, p2.y);
        }
        ctxRef.current.stroke();
      }
      drawingFrameRef.current = null;
    } else {
      drawingFrameRef.current = requestAnimationFrame(renderPoints);
    }
  };

  const endDrawing = (e) => {
    if (!isDrawing.current) return;
    e.stopPropagation();
    if (e && e.pointerId) {
        try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
    }
    isDrawing.current = false;

    if (drawingFrameRef.current) {
      cancelAnimationFrame(drawingFrameRef.current);
      drawingFrameRef.current = null;
      renderPoints();
    }
    
    const pts = pointsRef.current;
    if (pts.length > 1 && preStrokeStateRef.current) {
        undoStackRef.current.push(preStrokeStateRef.current);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    }
    
    // Reset composite operation just in case
    if (ctxRef.current) {
        ctxRef.current.globalCompositeOperation = 'source-over';
    }

    if (pendingRemoteDrawingRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (canvasRef.current && ctxRef.current) {
          ctxRef.current.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
          const dpr = window.devicePixelRatio || 1;
          ctxRef.current.drawImage(img, 0, 0, img.width, img.height);
          localStorage.setItem(`planner_drawing_${pageKey}`, pendingRemoteDrawingRef.current);
          pendingRemoteDrawingRef.current = null;
        }
      };
      img.src = pendingRemoteDrawingRef.current;
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
                    const textCenterY = t.y + (t.lineHeight || 40) / 2;
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
                        targetY = elRect.bottom - 20; 
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

    if (activeToolRef.current === 'pen' && activeTemplate === 'SCRATCHPAD' && pts.length > 5 && ctxRef.current && canvasRef.current) {
      let pathLength = 0;
      for (let i = 1; i < pts.length; i++) {
        pathLength += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      }

      if (pathLength > 60) {
        const dsq = (p, p1, p2) => {
          let x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
          if (dx !== 0 || dy !== 0) {
            const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) { x = p2.x; y = p2.y; }
            else if (t > 0) { x += dx * t; y += dy * t; }
          }
          dx = p.x - x; dy = p.y - y;
          return dx * dx + dy * dy;
        };

        const simplify = (points, first, last, sqEpsilon, simplified) => {
          let maxSqDist = sqEpsilon, index = -1;
          for (let i = first + 1; i < last; i++) {
            const sqDist = dsq(points[i], points[first], points[last]);
            if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
          }
          if (index > -1) {
            if (index - first > 1) simplify(points, first, index, sqEpsilon, simplified);
            simplified.push(points[index]);
            if (last - index > 1) simplify(points, index, last, sqEpsilon, simplified);
          }
        };

        const simplified = [pts[0]];
        const epsilon = Math.max(15, pathLength * 0.04);
        simplify(pts, 0, pts.length - 1, epsilon * epsilon, simplified);
        simplified.push(pts[pts.length - 1]);

        let simplifiedLength = 0;
        for (let i = 1; i < simplified.length; i++) {
          simplifiedLength += Math.hypot(simplified[i].x - simplified[i-1].x, simplified[i].y - simplified[i-1].y);
        }

        if (simplified.length >= 2 && simplified.length <= 6 && (simplifiedLength / pathLength) > 0.90) {
          const isClosed = Math.hypot(pts[0].x - pts[pts.length-1].x, pts[0].y - pts[pts.length-1].y) < 40;
          let finalPoints = [...simplified];
          if (isClosed && finalPoints.length > 2) {
            finalPoints[finalPoints.length - 1] = finalPoints[0];
          }

          if (preStrokeStateRef.current) {
            putCanvasSnapshot(preStrokeStateRef.current);
          }

          ctxRef.current.globalCompositeOperation = 'source-over';
          ctxRef.current.strokeStyle = '#1e293b';
          ctxRef.current.lineWidth = lineWidthRef.current;
          ctxRef.current.lineCap = 'round';
          ctxRef.current.lineJoin = 'round';

          ctxRef.current.beginPath();
          ctxRef.current.moveTo(finalPoints[0].x, finalPoints[0].y);
          for (let i = 1; i < finalPoints.length; i++) {
            ctxRef.current.lineTo(finalPoints[i].x, finalPoints[i].y);
          }
          ctxRef.current.stroke();
        }
      }
    }

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (canvasRef.current) {
        const dataUrl = getScaledDataUrl();
        localStorage.setItem(`planner_drawing_${pageKey}`, dataUrl);
        if (onSave) onSave(dataUrl);
        syncToBackend(dataUrl, textsRef.current);
      }
      saveTimeout.current = null;
    }, 3000); 
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
        style={{ background: "transparent", display: "block", touchAction: "auto" }}
      />
      {texts.map(textObj => (
        <TextItem 
          key={textObj.id} 
          textObj={textObj} 
          activeTemplate={activeTemplate}
          updateText={(id, updated) => updateTextsState(prev => prev.map(t => t.id === id ? updated : t))}
          deleteText={(id) => updateTextsState(prev => prev.filter(t => t.id !== id))}
          onTripleClick={() => handleTripleClickAction(0, 0, textObj)}
          onFocus={() => setActiveTextId(textObj.id)}
          onTab={() => {
            const lh = textObj.lineHeight || 40;
            const snappedY = textObj.y + lh;
            const startX = textObj.x;
            const width = textObj.width;

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
                  baselineY: snappedY + lh,
                  text: '',
                  isEditing: true,
                  lineHeight: lh,
                  width
                };
                return [...prev, newText];
              }
            });
          }}
        />
      ))}
    </div>
  );
});

const TextItem = ({ textObj, updateText, deleteText, activeTemplate, onTripleClick, onFocus, onTab }) => {
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

  useEffect(() => {
    if (!isEditing && textObj.text !== val) {
      setVal(textObj.text || '');
    }
  }, [textObj.text, isEditing, val]);

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
      const currentBaseline = textObj.baselineY || (textObj.y + (textObj.lineHeight || 40));
      updateText(textObj.id, { 
        ...textObj, 
        text: val, 
        isEditing: false,
        baselineY: currentBaseline
      });
    }
  };

  const lh = textObj.lineHeight || 40;

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
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            if (textareaRef.current) {
              textareaRef.current.blur();
            }
            if (onTab) onTab();
          }
        }}
        className="w-full bg-transparent outline-none resize-none overflow-hidden pr-8"
        style={{
          lineHeight: activeTemplate === 'IDEAL_WEEK' ? '1.2' : `${lh}px`,
          fontSize: activeTemplate === 'IDEAL_WEEK' ? `${idealWeekFontSize}px` : `26px`,
          fontFamily: "'Caveat', cursive, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
          color: textObj.isLoading ? '#94a3b8' : '#1e293b',
          border: isEditing ? '1px dashed #94a3b8' : '1px solid transparent',
          minHeight: `${lh}px`,
          padding: activeTemplate === 'IDEAL_WEEK' ? '4px 4px 4px 8px' : 0,
          margin: 0,
          userSelect: isEditing ? 'auto' : 'none',
          WebkitUserSelect: isEditing ? 'auto' : 'none',
          pointerEvents: isEditing ? 'auto' : 'none'
        }}
        placeholder={isEditing ? "Type here..." : ""}
        readOnly={textObj.isLoading}
      />
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