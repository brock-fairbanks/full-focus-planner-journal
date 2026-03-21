import React from "react";
import { Sun, Moon, Trash2 } from "lucide-react";

export default function Rituals({ date, onClearCanvas }) {
  return (
    <div className="relative flex flex-row min-h-full w-full gap-0 p-8 bg-[#FAF9F6]">
      <button 
        onClick={onClearCanvas}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
        title="Clear entire page"
      >
        <Trash2 size={16} />
        <span>Clear Page</span>
      </button>
      {/* Morning Startup */}
      <div className="flex-1 flex flex-col border-r border-[#E2E8F0] pr-8">
        <div className="flex items-center gap-3 mb-8">
          <Sun size={28} style={{ color: "#f59e0b" }} />
          <h2 className="text-2xl font-serif font-bold" style={{ color: "#1e293b" }}>
            Morning Startup
          </h2>
        </div>

        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-end gap-3" style={{ height: "40px" }}>
            <input type="checkbox" disabled className="w-4 h-4 shrink-0 mb-1.5" />
            <div className="flex-1 border-b-[2px]" style={{ borderColor: "#cbd5e1", height: "100%" }} />
          </div>
        ))}
      </div>

      {/* Evening Shutdown */}
      <div className="flex-1 flex flex-col pl-8">
        <div className="flex items-center gap-3 mb-8">
          <Moon size={28} style={{ color: "#8b5cf6" }} />
          <h2 className="text-2xl font-serif font-bold" style={{ color: "#1e293b" }}>
            Evening Shutdown
          </h2>
        </div>

        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-end gap-3" style={{ height: "40px" }}>
            <input type="checkbox" disabled className="w-4 h-4 shrink-0 mb-1.5" />
            <div className="flex-1 border-b-[2px]" style={{ borderColor: "#cbd5e1", height: "100%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}