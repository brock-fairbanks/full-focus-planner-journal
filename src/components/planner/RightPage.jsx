import React from "react";

export default function RightPage({ dark }) {
  const text = dark ? "#e2e8f0" : "#1e293b";
  const muted = dark ? "#64748b" : "#94a3b8";
  const line = dark ? "#334155" : "#e2e8f0";
  const sectionBg = dark ? "#253247" : "#f8fafc";

  return (
    <div className="flex flex-col h-full select-none" style={{ color: text }}>
      {/* Big 3 */}
      <h3 className="text-xs md:text-sm font-bold tracking-widest uppercase mb-4" style={{ color: muted }}>
        Today's Big 3 <span style={{ color: "#f97316" }}>★★★</span>
      </h3>
      <div className="space-y-3 md:space-y-4 mb-8">
        {[1, 2, 3].map((num) => (
          <div
            key={num}
            className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg border"
            style={{ background: sectionBg, borderColor: line }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: dark ? "#334155" : "#e2e8f0", color: muted }}
            >
              {num}
            </div>
            <div className="flex-1 border-b pb-2" style={{ borderColor: line, height: 40 }} />
          </div>
        ))}
      </div>

      {/* Notes */}
      <h3 className="text-xs md:text-sm font-bold tracking-widest uppercase mb-2" style={{ color: muted }}>
        Notes & Insights
      </h3>
      <div className="flex-1 flex flex-col justify-start">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="flex-1 border-b w-full"
            style={{ borderColor: line, minHeight: 30 }}
          />
        ))}
      </div>
    </div>
  );
}