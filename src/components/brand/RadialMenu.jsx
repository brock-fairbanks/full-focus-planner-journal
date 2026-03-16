import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Zap, CalendarDays, BookOpen, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Compass",  to: "/BrandCompass",       icon: Compass,      angle: -90 },
  { label: "Daily",    to: "/DailyPlan",           icon: Zap,          angle: -30 },
  { label: "Weekly",   to: "/WeeklyPreviewWizard", icon: CalendarDays, angle: 30  },
  { label: "Planner",  to: "/Planner",             icon: BookOpen,     angle: 90  },
];

const RADIUS = 80;

export default function RadialMenu() {
  const [open, setOpen] = useState(false);
  const [dragStarted, setDragStarted] = useState(false);
  const triggerRef = useRef(null);
  const dragStart = useRef(null);
  const navigate = useNavigate();

  // Pen-drag detection: pointerdown then move > threshold = open radial
  useEffect(() => {
    const btn = triggerRef.current;
    if (!btn) return;

    const onDown = (e) => {
      dragStart.current = { x: e.clientX, y: e.clientY };
      setDragStarted(false);
    };

    const onMove = (e) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 18 && !dragStarted) {
        setDragStarted(true);
        setOpen(true);
      }
    };

    const onUp = () => {
      dragStart.current = null;
    };

    btn.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      btn.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragStarted]);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (triggerRef.current && !triggerRef.current.closest("[data-radial]")?.contains(e.target)) {
        setOpen(false);
      }
    };
    setTimeout(() => window.addEventListener("pointerdown", close), 100);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  // Haptic helper
  const haptic = (style = "light") => {
    if (navigator.vibrate) navigator.vibrate(style === "medium" ? 40 : 15);
  };

  return (
    <div
      data-radial
      className="fixed z-50"
      style={{ bottom: 28, right: 28 }}
    >
      {/* Radial items */}
      {open && NAV_ITEMS.map((item, i) => {
        const rad = (item.angle * Math.PI) / 180;
        const x = Math.cos(rad) * RADIUS;
        const y = Math.sin(rad) * RADIUS;
        const Icon = item.icon;
        return (
          <button
            key={item.to}
            onClick={() => { haptic("light"); setOpen(false); navigate(item.to); }}
            className="absolute flex flex-col items-center gap-1 group"
            style={{
              bottom: -y,
              right: -x,
              transform: "translate(50%, 50%)",
              animation: `radialPop 0.18s ease ${i * 0.04}s both`,
              touchAction: "none",
              pointerEvents: "auto",
            }}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
              style={{
                background: "rgba(30,41,59,0.85)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(251,191,36,0.35)",
              }}>
              <Icon size={16} className="text-amber-300" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 whitespace-nowrap
              opacity-0 group-hover:opacity-100 transition-opacity">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => { haptic("medium"); setOpen(o => !o); }}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200"
        style={{
          background: open
            ? "rgba(251,191,36,0.2)"
            : "rgba(15,23,42,0.9)",
          backdropFilter: "blur(16px)",
          border: open ? "2px solid rgba(251,191,36,0.6)" : "2px solid rgba(255,255,255,0.1)",
          touchAction: "none",
          pointerEvents: "auto",
        }}
      >
        {open
          ? <X size={20} className="text-amber-300" />
          : <Menu size={20} className="text-slate-300" />
        }
      </button>

      <style>{`
        @keyframes radialPop {
          from { opacity: 0; transform: translate(50%, 50%) scale(0.5); }
          to   { opacity: 1; transform: translate(50%, 50%) scale(1); }
        }
      `}</style>
    </div>
  );
}