import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Star, Target, Zap, ArrowRight } from "lucide-react";
import ContentPillars from "../components/brand/ContentPillars";
import NetworkContacts from "../components/brand/NetworkContacts";
import CompassHUD from "../components/brand/CompassHUD";
import RadialMenu from "../components/brand/RadialMenu";

const glass = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

const STATUS_COLOR = {
  not_started: "#475569",
  in_progress: "#f97316",
  completed: "#22c55e",
  dropped: "#ef4444",
};

export default function BrandCompass() {
  const { data: visions = [] } = useQuery({
    queryKey: ["annualVision"],
    queryFn: () => base44.entities.AnnualVision.list("-year", 1),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["qGoals"],
    queryFn: () => base44.entities.QuarterlyGoal.list("-year"),
    refetchInterval: 15000,
  });
  const { data: dailyList = [] } = useQuery({
    queryKey: ["dailyBig3Today"],
    queryFn: () => base44.entities.DailyBig3.filter({ date: format(new Date(), "yyyy-MM-dd") }),
    refetchInterval: 10000,
  });

  const vision = visions[0];
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentQGoals = goals.filter(g => g.quarter === currentQ && g.year === new Date().getFullYear());
  const todayBig3 = dailyList[0];

  return (
    <div
      className="min-h-screen text-slate-100 font-sans pb-24"
      style={{ background: "linear-gradient(135deg, #080c16 0%, #0d1628 50%, #0a1220 100%)" }}
    >
      {/* Pinned Compass HUD */}
      <CompassHUD />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">

        {/* Vision Banner */}
        {vision ? (
          <div style={{
            ...glass,
            background: "linear-gradient(135deg, rgba(120,53,15,0.3) 0%, rgba(8,12,22,0.6) 100%)",
            border: "1px solid rgba(251,191,36,0.2)",
          }}
            className="flex items-start gap-4">
            <Star className="text-amber-400 mt-0.5 shrink-0" size={18} />
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
                {vision.year} Annual Vision
              </p>
              <p className="text-lg md:text-xl font-semibold text-white leading-snug">{vision.headline}</p>
              {vision.word_of_year && (
                <p className="mt-1.5 text-sm text-amber-300/70">
                  Word of the Year: <strong className="text-amber-300">{vision.word_of_year}</strong>
                </p>
              )}
            </div>
            {vision.core_values?.length > 0 && (
              <div className="hidden md:flex flex-wrap gap-1.5 max-w-[200px]">
                {vision.core_values.slice(0, 4).map(v => (
                  <span key={v} className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                    style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link to="/Planner"
            className="flex items-center justify-center gap-3 rounded-2xl p-6 transition-colors"
            style={{ border: "1px dashed rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
            <Star size={20} className="text-slate-700" />
            <span className="text-sm text-slate-600 hover:text-amber-400 transition-colors">
              No Annual Vision set — click to open Planner
            </span>
          </Link>
        )}

        {/* 3-col card grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Q Goals */}
          <div style={glass}>
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} className="text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Q{currentQ} Goals</span>
              <span className="ml-auto text-[10px] text-slate-600">
                {currentQGoals.filter(g => g.status === "completed").length}/{currentQGoals.length} done
              </span>
            </div>
            {currentQGoals.length === 0 ? (
              <p className="text-xs text-slate-700">No goals for Q{currentQ} yet.</p>
            ) : (
              <div className="space-y-3">
                {currentQGoals.map(g => (
                  <div key={g.id} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: STATUS_COLOR[g.status] }} />
                    <div>
                      <p className="text-sm text-slate-200 leading-tight">{g.title}</p>
                      {g.pillar && <p className="text-[10px] text-slate-600 mt-0.5">{g.pillar}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today Big 3 */}
          <div style={glass}>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Today's Big 3</span>
              <span className="ml-auto text-[10px] text-slate-600">{format(new Date(), "MMM d")}</span>
            </div>
            {!todayBig3 ? (
              <Link to="/DailyPlan"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-amber-400 transition-colors">
                Plan today <ArrowRight size={12} />
              </Link>
            ) : (
              <div className="space-y-3">
                {[todayBig3.task_1, todayBig3.task_2, todayBig3.task_3].filter(Boolean).map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-200 leading-tight">{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rituals */}
          <div style={glass}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Rituals</span>
            </div>
            {[
              { label: "Morning Startup", done: todayBig3?.startup_ritual_done },
              { label: "Evening Shutdown", done: todayBig3?.shutdown_ritual_done },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3 mb-3">
                <div className="w-2.5 h-2.5 rounded-full border-2 transition-colors"
                  style={{
                    background: r.done ? "#22c55e" : "transparent",
                    borderColor: r.done ? "#22c55e" : "#334155",
                  }} />
                <span className="text-sm" style={{ color: r.done ? "#86efac" : "#64748b" }}>{r.label}</span>
              </div>
            ))}
            <Link to="/DailyPlan"
              className="mt-3 text-[10px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-300 transition-colors">
              Open Daily Plan →
            </Link>
          </div>
        </div>

        {/* Content Pillars */}
        {vision && <ContentPillars vision={vision} />}

        {/* Network */}
        <NetworkContacts />
      </main>

      {/* Bottom-corner Radial Menu */}
      <RadialMenu />
    </div>
  );
}