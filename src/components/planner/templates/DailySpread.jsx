import React from "react";

export default function DailySpread() {
  const HOURS = Array.from({ length: 15 }, (_, i) => 6 + i); // 6 AM to 8 PM

  return (
    <div className="flex h-full gap-0">
      {/* LEFT PAGE: Big 3 + Schedule */}
      <div className="flex-1 flex flex-col border-r p-8" style={{ borderColor: "#E2E8F0", background: "#FAF9F6" }}>
        {/* Big 3 Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: "#1e293b" }}>
            Daily Big 3
          </h2>
          {[1, 2, 3].map((n) => (
            <div key={n} className="mb-4 flex items-baseline gap-4">
              <span className="text-xl font-bold" style={{ color: "#f59e0b" }}>
                {n}.
              </span>
              <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "28px" }} />
            </div>
          ))}
        </div>

        {/* Hourly Schedule */}
        <div>
          <h3 className="text-lg font-serif font-bold mb-4" style={{ color: "#1e293b" }}>
            Schedule
          </h3>
          {HOURS.map((hour) => (
            <div key={hour} className="flex gap-3 mb-4">
              <span className="text-xs font-bold w-12 text-right" style={{ color: "#94a3b8" }}>
                {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
              </span>
              <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "24px" }} />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PAGE: Other Tasks + Notes */}
      <div className="flex-1 flex flex-col p-8" style={{ background: "#FAF9F6" }}>
        {/* Other Tasks */}
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold mb-6" style={{ color: "#1e293b" }}>
            Other Tasks
          </h2>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 rounded-full border-2 shrink-0" style={{ borderColor: "#E2E8F0" }} />
              <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "24px" }} />
            </div>
          ))}
        </div>

        {/* Notes with Dot Grid */}
        <div>
          <h3 className="text-lg font-serif font-bold mb-4" style={{ color: "#1e293b" }}>
            Notes
          </h3>
          <div
            className="flex-1"
            style={{
              backgroundImage: `radial-gradient(circle, #E2E8F0 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0",
            }}
          />
        </div>
      </div>
    </div>
  );
}