import React from "react";

export default function QuarterlyGoals() {
  return (
    <div className="w-full min-h-full p-8 grid grid-cols-2 gap-8" style={{ background: "#FAF9F6" }}>
      <h1 className="col-span-2 text-3xl font-serif font-bold" style={{ color: "#1e293b" }}>
        Quarterly Goals
      </h1>

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="border rounded-lg p-6"
          style={{ borderColor: "#E2E8F0", background: "#ffffff" }}
        >
          {/* Goal Name */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase mb-2" style={{ color: "#94a3b8" }}>
              Goal {i + 1}
            </p>
            <div className="border-b" style={{ borderColor: "#E2E8F0", height: "24px" }} />
          </div>

          {/* Key Motivations */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase mb-2" style={{ color: "#94a3b8" }}>
              Motivations
            </p>
            {[1, 2, 3].map((n) => (
              <div key={n} className="border-b mb-2" style={{ borderColor: "#E2E8F0", height: "20px" }} />
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
                <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "18px" }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}