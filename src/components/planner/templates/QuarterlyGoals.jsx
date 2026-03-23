import React from "react";
import { Trash2 } from "lucide-react";

export default function QuarterlyGoals({ date, onClearCanvas }) {
  const domains = [
    { label: "BODY", col: 1 },
    { label: "MIND", col: 1 },
    { label: "SPIRIT", col: 1 },
    { label: "LOVE", col: 2 },
    { label: "FAMILY", col: 2 },
    { label: "COMMUNITY", col: 2 },
    { label: "MONEY", col: 3 },
    { label: "WORK", col: 3 },
    { label: "HOBBIES", col: 3 }
  ];

  return (
    <div id="tour-goals-grid" className="relative w-full min-h-full bg-[#FAF9F6] flex flex-col gap-12 pb-16">
      <button 
        onClick={onClearCanvas}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
        title="Clear entire page"
      >
        <Trash2 size={16} />
        <span>Clear Page</span>
      </button>

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="border border-[#cbd5e1] bg-white p-10 md:p-14 shadow-md w-full mx-auto rounded-3xl"
        >
          {/* Header Row */}
          <div className="flex justify-between items-start mb-12 flex-wrap gap-6">
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-[0.2em] uppercase" style={{ color: "#1e293b" }}>
              Goal Detail {i + 1}
            </h1>
            
            <div className="grid grid-cols-3 gap-x-8 gap-y-3">
              {domains.map(d => (
                <div key={d.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-slate-400" />
                  <span className="text-[10px] md:text-xs font-bold tracking-widest text-slate-500">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-10">
            {/* Goal Statement */}
            <div>
              <div className="flex justify-between items-end mb-2 flex-wrap gap-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
                    Goal Statement
                  </h2>
                  <span className="text-sm font-medium" style={{ color: "#475569" }}>
                    Write your SMARTER Goal.
                  </span>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-slate-400" />
                    <span className="text-[10px] md:text-xs font-bold tracking-widest text-slate-500">ACHIEVEMENT GOAL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-slate-400" />
                    <span className="text-[10px] md:text-xs font-bold tracking-widest text-slate-500">HABIT GOAL</span>
                  </div>
                </div>
              </div>
              <div className="w-full mt-4 relative">
                <div className="w-full" style={{ height: "120px", backgroundImage: `repeating-linear-gradient(to bottom, transparent, #cbd5e1 1px, transparent 1px, transparent 40px)`, backgroundSize: "100% 40px", backgroundPosition: "0 39px" }} />
              </div>
            </div>

            {/* Key Motivations */}
            <div>
              <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
                  Key Motivations
                </h2>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>
                  Write, then rank, your key motivations.
                </span>
              </div>
              <div className="w-full mt-4 relative">
                <div className="w-full" style={{ height: "160px", backgroundImage: `repeating-linear-gradient(to bottom, transparent, #cbd5e1 1px, transparent 1px, transparent 40px)`, backgroundSize: "100% 40px", backgroundPosition: "0 39px" }} />
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
                  Next Steps
                </h2>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>
                  List the first few projects or tasks that make up your goal.
                </span>
              </div>
              <div className="w-full mt-4 relative">
                <div className="w-full" style={{ height: "160px", backgroundImage: `repeating-linear-gradient(to bottom, transparent, #cbd5e1 1px, transparent 1px, transparent 40px)`, backgroundSize: "100% 40px", backgroundPosition: "0 39px" }} />
              </div>
            </div>

            {/* Celebration */}
            <div>
              <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
                  Celebration
                </h2>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>
                  Decide how you'll celebrate your success.
                </span>
              </div>
              <div className="w-full mt-4 relative">
                <div className="w-full" style={{ height: "80px", backgroundImage: `repeating-linear-gradient(to bottom, transparent, #cbd5e1 1px, transparent 1px, transparent 40px)`, backgroundSize: "100% 40px", backgroundPosition: "0 39px" }} />
              </div>
            </div>

            {/* Goal Progress */}
            <div>
              <div className="flex items-baseline gap-3 mb-6 flex-wrap">
                <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
                  Goal Progress
                </h2>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>
                  Track your achievement-goal progress.
                </span>
              </div>
              <div className="flex items-center gap-4 px-2">
                <span className="text-xs font-bold">0%</span>
                <div className="flex-1 border-b-[2px] border-slate-300" />
                <span className="text-xs font-bold">100%</span>
              </div>
            </div>

            {/* Streaktracker */}
            <div>
              <div className="flex items-baseline gap-3 mb-6 flex-wrap">
                <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
                  Streaktracker&trade;
                </h2>
                <span className="text-sm font-medium" style={{ color: "#475569" }}>
                  Track your habit-goal progress.
                </span>
              </div>
              <div className="flex flex-col gap-5 px-2">
                {['M1', 'M2', 'M3'].map((month) => (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-sm font-bold w-8">{month}</span>
                    {Array.from({ length: 31 }).map((_, d) => (
                      <span key={d} className="text-[10px] md:text-xs font-medium text-slate-500 w-4 text-center">
                        {d + 1}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}