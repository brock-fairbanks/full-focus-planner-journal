import React from "react";
import { Trash2 } from "lucide-react";

export default function IdealWeek({ date, onClearCanvas }) {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const HOURS = Array.from({ length: 19 }, (_, i) => 5 + i); // 5 AM to 11 PM

  return (
    <div className="relative w-full min-h-full p-8" style={{ background: "#FAF9F6" }}>
      <button 
        onClick={onClearCanvas}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
        title="Clear entire page"
      >
        <Trash2 size={16} />
        <span>Clear Page</span>
      </button>
      <h1 className="text-3xl font-serif font-bold mb-6" style={{ color: "#1e293b" }}>
        Ideal Week
      </h1>

      <div className="flex gap-2 text-[11px] font-bold min-w-[800px] md:min-w-0">
        {/* Time column */}
        <div className="w-16 shrink-0">
          {HOURS.map((hour) => (
            <div key={hour} className="h-10 flex items-center" style={{ color: "#94a3b8" }}>
              {hour === 12 ? 12 : hour > 12 ? hour - 12 : hour}{hour >= 12 ? "PM" : "AM"}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((day) => (
          <div key={day} className="flex-1 border-l-2" style={{ borderColor: "#93c5fd" }}>
            <div className="h-8 flex items-center font-bold" style={{ color: "#1e293b" }}>
              {day}
            </div>
            {HOURS.map((hour) => (
              <div key={`${day}-${hour}`} className="h-10 border-b-2" style={{ borderColor: "#93c5fd" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}