import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Compass, Star, Target, Users, ArrowRight, ChevronRight, Zap } from "lucide-react";
import ContentPillars from "../components/brand/ContentPillars";
import NetworkContacts from "../components/brand/NetworkContacts";

export default function BrandCompass() {
  const { data: visions = [] } = useQuery({
    queryKey: ["annualVision"],
    queryFn: () => base44.entities.AnnualVision.list("-year", 1),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["qGoals"],
    queryFn: () => base44.entities.QuarterlyGoal.list("-year"),
  });
  const { data: dailyList = [] } = useQuery({
    queryKey: ["dailyBig3Today"],
    queryFn: () => base44.entities.DailyBig3.filter({ date: format(new Date(), "yyyy-MM-dd") }),
  });

  const vision = visions[0];
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentQGoals = goals.filter(g => g.quarter === currentQ && g.year === new Date().getFullYear());
  const todayBig3 = dailyList[0];

  const statusColor = { not_started: "#64748b", in_progress: "#f97316", completed: "#22c55e", dropped: "#ef4444" };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Nav */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Compass className="text-amber-400" size={22} />
          <span className="text-lg font-semibold tracking-wide text-white">Brand Compass</span>
        </div>
        <nav className="flex items-center gap-1">
          {[
            { label: "Compass", to: "/BrandCompass" },
            { label: "Daily Plan", to: "/DailyPlan" },
            { label: "Planner", to: "/Planner" },
            { label: "Weekly Wizard", to: "/WeeklyPreviewWizard" },
          ].map(n => (
            <Link key={n.to} to={n.to}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Vision Banner */}
        {vision ? (
          <div className="rounded-2xl border border-amber-900/40 bg-gradient-to-r from-amber-950/60 to-slate-900 p-6 flex items-start gap-4">
            <Star className="text-amber-400 mt-1 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">{vision.year} Annual Vision</p>
              <p className="text-xl font-semibold text-white">{vision.headline}</p>
              {vision.word_of_year && (
                <p className="mt-2 text-sm text-amber-300">Word of the Year: <strong>{vision.word_of_year}</strong></p>
              )}
            </div>
          </div>
        ) : (
          <Link to="/Planner" className="block rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-500 hover:border-amber-500 hover:text-amber-400 transition-colors">
            <Star size={28} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No Annual Vision set — click to open Planner</p>
          </Link>
        )}

        {/* 3-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Q Goals */}
          <div className="col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Q{currentQ} Goals</span>
            </div>
            {currentQGoals.length === 0 && (
              <p className="text-sm text-slate-600">No goals for Q{currentQ} yet.</p>
            )}
            <div className="space-y-3">
              {currentQGoals.map(g => (
                <div key={g.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: statusColor[g.status] }} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{g.title}</p>
                    {g.pillar && <p className="text-xs text-slate-500">{g.pillar}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today Big 3 */}
          <div className="col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Today's Big 3</span>
              <span className="ml-auto text-xs text-slate-600">{format(new Date(), "MMM d")}</span>
            </div>
            {!todayBig3 ? (
              <Link to="/Planner" className="text-sm text-slate-600 hover:text-amber-400 transition-colors flex items-center gap-1">
                Plan today <ArrowRight size={12} />
              </Link>
            ) : (
              <div className="space-y-3">
                {[todayBig3.task_1, todayBig3.task_2, todayBig3.task_3].filter(Boolean).map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-900/40 text-amber-400 text-[10px] flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                    <span className="text-sm text-slate-200">{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rituals quick-status */}
          <div className="col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Daily Rituals</span>
            </div>
            {[
              { label: "Morning Startup", done: todayBig3?.startup_ritual_done },
              { label: "Evening Shutdown", done: todayBig3?.shutdown_ritual_done },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full border-2 ${r.done ? "bg-green-500 border-green-500" : "border-slate-600"}`} />
                <span className="text-sm" style={{ color: r.done ? "#86efac" : "#94a3b8" }}>{r.label}</span>
              </div>
            ))}
            <Link to="/Planner" className="mt-4 flex items-center gap-1 text-xs text-amber-400 hover:underline">
              Open Planner <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Content Pillars */}
        {vision && <ContentPillars vision={vision} />}

        {/* Network */}
        <NetworkContacts />
      </main>
    </div>
  );
}