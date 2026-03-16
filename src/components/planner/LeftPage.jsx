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
      <div className="px-5 pt-4 pb-2">
        <h2
          className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: "#1E293B", opacity: 0.5 }}
        >
          Daily Big 3
        </h2>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="flex items-center gap-3 mb-2"
          >
            <div
              className="w-5 h-5 rounded-full border-2 shrink-0"
              style={{ borderColor: "#1E293B33" }}
            />
            <div
              className="flex-1 border-b"
              style={{ borderColor: "#1E293B1a", height: 28 }}
            />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-5 border-t" style={{ borderColor: "#1E293B15" }} />

      {/* Hourly Schedule */}
      <div className="px-5 pt-3 flex-1 overflow-hidden">
        <h2
          className="text-xs font-bold uppercase tracking-[0.2em] mb-2"
          style={{ color: "#1E293B", opacity: 0.5 }}
        >
          Schedule
        </h2>
        <div className="flex flex-col gap-0">
          {HOURS.map((label) => (
            <div
              key={label}
              className="flex items-center"
              style={{ height: "calc((100% - 20px) / 15)", minHeight: 22 }}
            >
              <span
                className="text-[10px] font-mono shrink-0"
                style={{ width: 60, color: "#1E293B66" }}
              >
                {label}
              </span>
              <div
                className="flex-1 border-b"
                style={{ borderColor: "#1E293B12" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}