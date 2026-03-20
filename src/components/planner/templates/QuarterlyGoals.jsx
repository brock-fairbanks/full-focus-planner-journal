import React from "react";
import { Trash2 } from "lucide-react";

export default function QuarterlyGoals({ date, onClearCanvas }) {
  return (
    <div className="relative w-full min-h-full p-8 grid grid-cols-2 gap-8" style={{ background: "#FAF9F6" }}>
      <button 
        onClick={onClearCanvas}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
        title="Clear entire page"
      >
        <Trash2 size={16} />
        <span>Clear Page</span>
      </button>
      <h1 className="col-span-2 text-3xl font-serif font-bold" style={{ color: "#1e293b" }}>
        Quarterly Goals
      </h1>

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="border-2 rounded-lg p-6"
          style={{ borderColor: "#cbd5e1", background: "#ffffff" }}
        >
          {/* Goal Name */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase mb-2" style={{ color: "#94a3b8" }}>
              Goal {i + 1}
            </p>
            <div className="border-b-2" style={{ borderColor: "#cbd5e1", height: "24px" }} />
          </div>

          {/* Key Motivations */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase mb-2" style={{ color: "#94a3b8" }}>
              Motivations
            </p>
            {[1, 2, 3].map((n) => (
              <div key={n} className="border-b-2 mb-2" style={{ borderColor: "#cbd5e1", height: "20px" }} />
            ))}
          </div>

          {/* Next Steps */}
          <div>
            <p className="text-xs font-bold uppercase mb-2" style={{ color: "#94a3b8" }}>
              Next Steps
            </p>
            {[1, 2].map((n) => (
              <div key={n} className="flex items-center gap-2 mb-2">
                <input type="checkbox" className="w-4 h-4" disabled />
                <div className="flex-1 border-b-2" style={{ borderColor: "#cbd5e1", height: "18px" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}