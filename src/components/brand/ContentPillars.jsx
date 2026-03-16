import React from "react";
import { Layers } from "lucide-react";

const PILLAR_COLORS = [
  { bg: "#1e3a5f", border: "#3b82f6", text: "#93c5fd", accent: "#60a5fa" },
  { bg: "#1e3a2f", border: "#22c55e", text: "#86efac", accent: "#4ade80" },
  { bg: "#3a1e1e", border: "#ef4444", text: "#fca5a5", accent: "#f87171" },
];

export default function ContentPillars({ vision }) {
  const pillars = [
    { name: vision.pillar_1_name, desc: vision.pillar_1_description },
    { name: vision.pillar_2_name, desc: vision.pillar_2_description },
    { name: vision.pillar_3_name, desc: vision.pillar_3_description },
  ].filter(p => p.name);

  if (pillars.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Layers size={16} className="text-slate-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">3 Core Content Pillars</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pillars.map((p, i) => {
          const c = PILLAR_COLORS[i] || PILLAR_COLORS[0];
          return (
            <div key={i} className="rounded-2xl p-5 border"
              style={{ background: c.bg, borderColor: c.border + "55" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3 text-sm font-bold"
                style={{ background: c.border + "33", color: c.accent }}>
                {i + 1}
              </div>
              <p className="font-semibold text-white text-base mb-1">{p.name}</p>
              {p.desc && <p className="text-sm" style={{ color: c.text }}>{p.desc}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}