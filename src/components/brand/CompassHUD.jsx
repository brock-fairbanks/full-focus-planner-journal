import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Compass, Zap } from "lucide-react";

const STATUS_DOT = {
  not_started: "#475569",
  in_progress: "#f97316",
  completed: "#22c55e",
  dropped: "#ef4444",
};

export default function CompassHUD() {
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);

  const { data: goals = [] } = useQuery({
    queryKey: ["qGoals"],
    queryFn: () => base44.entities.QuarterlyGoal.list("-year"),
    refetchInterval: 15000, // real-time-ish
  });

  const { data: dailyList = [] } = useQuery({
    queryKey: ["dailyBig3Today"],
    queryFn: () => base44.entities.DailyBig3.filter({ date: format(new Date(), "yyyy-MM-dd") }),
    refetchInterval: 10000,
  });

  const { data: visions = [] } = useQuery({
    queryKey: ["annualVision"],
    queryFn: () => base44.entities.AnnualVision.list("-year", 1),
  });

  const qGoals = goals.filter(g => g.quarter === currentQ && g.year === new Date().getFullYear());
  const todayBig3 = dailyList[0];
  const vision = visions[0];

  const completedCount = qGoals.filter(g => g.status === "completed").length;
  const progressPct = qGoals.length ? Math.round((completedCount / qGoals.length) * 100) : 0;

  return (
    <div
      className="sticky top-0 z-40 w-full flex items-center gap-4 px-5 py-2.5 border-b"
      style={{
        background: "rgba(8, 12, 22, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <Compass size={15} className="text-amber-400" />
        <span className="text-xs font-bold tracking-widest uppercase text-amber-300 hidden md:block">
          {vision?.word_of_year || "Executive OS"}
        </span>
      </div>

      <div className="w-px h-5 bg-white/10 hidden md:block" />

      {/* Q Progress bar */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold uppercase text-slate-500 hidden md:block">Q{currentQ}</span>
        <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: progressPct === 100 ? "#22c55e" : "#f97316" }} />
        </div>
        <span className="text-[10px] font-bold text-slate-400">{progressPct}%</span>
      </div>

      {/* Q Goals pills */}
      <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
        {qGoals.slice(0, 4).map(g => (
          <div key={g.id} className="flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[g.status] }} />
            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{g.title}</span>
          </div>
        ))}
        {qGoals.length > 4 && (
          <span className="text-[10px] text-slate-600">+{qGoals.length - 4}</span>
        )}
      </div>

      {/* Today Big 3 status */}
      <div className="flex items-center gap-1.5 shrink-0 hidden md:flex">
        <Zap size={11} className="text-amber-400" />
        {todayBig3 ? (
          <span className="text-[10px] text-slate-400">
            {[todayBig3.task_1, todayBig3.task_2, todayBig3.task_3].filter(Boolean).length}/3 tasks
          </span>
        ) : (
          <span className="text-[10px] text-slate-700">No plan yet</span>
        )}
      </div>

      {/* Date */}
      <span className="text-[10px] text-slate-600 shrink-0 hidden md:block">
        {format(new Date(), "EEE MMM d")}
      </span>
    </div>
  );
}