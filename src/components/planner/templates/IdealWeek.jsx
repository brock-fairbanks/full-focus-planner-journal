import React from "react";

export default function IdealWeek() {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const HOURS = Array.from({ length: 19 }, (_, i) => 5 + i); // 5 AM to 11 PM

  return (
    <div className="w-full h-full p-8 overflow-hidden" style={{ background: "#FAF9F6" }}>
      <h1 className="text-3xl font-serif font-bold mb-6" style={{ color: "#1e293b" }}>
        Ideal Week
      </h1>

      <div className="flex gap-2 text-[11px] font-bold">
        {/* Time column */}
        <div className="w-16 shrink-0">
          {HOURS.map((hour) => (
            <div key={hour} className="h-10 flex items-center" style={{ color: "#94a3b8" }}>
              {hour > 12 ? hour - 12 : hour}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((day) => (
          <div key={day} className="flex-1 border-l" style={{ borderColor: "#bfdbfe" }}>
            <div className="h-8 flex items-center font-bold" style={{ color: "#1e293b" }}>
              {day}
            </div>
            {HOURS.map((hour) => (
              <div key={`${day}-${hour}`} className="h-10 border-b" style={{ borderColor: "#bfdbfe" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}