import React, { useRef, useState, useCallback } from "react";
import { Check } from "lucide-react";

export default function GoalSlider({ value = 0, onChange, label, disabled = false }) {
  const trackRef = useRef(null);
  const isDragging = useRef(false);
  const [localValue, setLocalValue] = useState(value);
  const hasFiredHaptic = useRef(false);

  const hapticMedium = () => {
    if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
  };

  const computeValue = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track) return localValue;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * 100);
  }, [localValue]);

  const handlePointerDown = (e) => {
    // Prioritize pen and touch, deprioritize mouse
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    trackRef.current?.setPointerCapture(e.pointerId);
    isDragging.current = true;
    const v = computeValue(e.clientX);
    setLocalValue(v);
    hasFiredHaptic.current = false;
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const v = computeValue(e.clientX);
    setLocalValue(v);
    if (v === 100 && !hasFiredHaptic.current) {
      hapticMedium();
      hasFiredHaptic.current = true;
    }
    if (v < 100) hasFiredHaptic.current = false;
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const v = computeValue(e.clientX);
    setLocalValue(v);
    onChange?.(v);
    if (v === 100) hapticMedium();
  };

  // Also allow click/mouse for desktop
  const handleClick = (e) => {
    const v = computeValue(e.clientX);
    setLocalValue(v);
    onChange?.(v);
    if (v === 100) hapticMedium();
  };

  const pct = Math.max(0, Math.min(100, localValue));
  const isComplete = pct === 100;

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 truncate flex-1">{label}</span>
          <div className="flex items-center gap-1.5">
            {isComplete && <Check size={11} className="text-green-400" />}
            <span className="text-xs font-bold tabular-nums"
              style={{ color: isComplete ? "#4ade80" : pct > 0 ? "#fbbf24" : "#475569" }}>
              {pct}%
            </span>
          </div>
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-2 rounded-full cursor-pointer select-none"
        style={{
          background: "rgba(255,255,255,0.07)",
          touchAction: "none",
          pointerEvents: disabled ? "none" : "auto",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-75"
          style={{
            width: `${pct}%`,
            background: isComplete
              ? "linear-gradient(90deg, #16a34a, #4ade80)"
              : "linear-gradient(90deg, #ea580c, #fbbf24)",
            boxShadow: isComplete ? "0 0 8px rgba(74,222,128,0.5)" : pct > 0 ? "0 0 6px rgba(251,191,36,0.3)" : "none",
          }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg transition-all duration-75"
          style={{
            left: `${pct}%`,
            background: isComplete ? "#4ade80" : "#fbbf24",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: isComplete ? "0 0 10px rgba(74,222,128,0.6)" : "0 0 6px rgba(251,191,36,0.4)",
          }}
        />
      </div>
    </div>
  );
}