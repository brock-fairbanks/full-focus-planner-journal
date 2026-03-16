import React from "react";

const HOURS = [];
for (let h = 6; h <= 20; h++) {
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  HOURS.push(`${display}:00 ${ampm}`);
}

export default function LeftPage() {
  return (
    <div
      className="h-full overflow-hidden flex flex-col select-none pointer-events-none"
      style={{ background: "#FAF9F6", color: "#1E293B" }}
    >
      {/* Daily Big 3 */}
      <div className="px-7 pt-6 pb-3">
        <h2
          className="text-sm font-bold uppercase tracking-[0.25em] mb-4"
          style={{ color: "#1E293B", opacity: 0.45 }}
        >
          Daily Big 3
        </h2>
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-4 mb-4">
            <div
              className="w-7 h-7 rounded-full border-2 shrink-0"
              style={{ borderColor: "#1E293B44" }}
            />
            <div
              className="flex-1 border-b-2"
              style={{ borderColor: "#1E293B18", height: 36 }}
            />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-7 border-t" style={{ borderColor: "#1E293B18" }} />

      {/* Hourly Schedule */}
      <div className="px-7 pt-4 flex-1 overflow-hidden">
        <h2
          className="text-sm font-bold uppercase tracking-[0.25em] mb-3"
          style={{ color: "#1E293B", opacity: 0.45 }}
        >
          Schedule
        </h2>
        <div className="flex flex-col h-[calc(100%-32px)]">
          {HOURS.map((label) => (
            <div
              key={label}
              className="flex items-center flex-1"
              style={{ minHeight: 28 }}
            >
              <span
                className="text-xs font-mono shrink-0"
                style={{ width: 72, color: "#1E293B55", fontSize: 12 }}
              >
                {label}
              </span>
              <div
                className="flex-1 border-b"
                style={{ borderColor: "#1E293B14" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}