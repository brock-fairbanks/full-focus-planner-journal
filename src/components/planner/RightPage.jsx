import React from "react";

export default function RightPage() {
  return (
    <div
      className="h-full overflow-hidden flex flex-col select-none pointer-events-none"
      style={{ background: "#FAF9F6", color: "#1E293B" }}
    >
      {/* Other Tasks */}
      <div className="px-7 pt-6 pb-3">
        <h2
          className="text-sm font-bold uppercase tracking-[0.25em] mb-4"
          style={{ color: "#1E293B", opacity: 0.45 }}
        >
          Other Tasks
        </h2>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="flex items-center gap-4 mb-3">
            <div
              className="w-6 h-6 rounded-sm border-2 shrink-0"
              style={{ borderColor: "#1E293B44" }}
            />
            <div
              className="flex-1 border-b-2"
              style={{ borderColor: "#1E293B18", height: 32 }}
            />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-7 border-t" style={{ borderColor: "#1E293B18" }} />

      {/* Notes */}
      <div className="px-7 pt-4 flex-1 overflow-hidden">
        <h2
          className="text-sm font-bold uppercase tracking-[0.25em] mb-3"
          style={{ color: "#1E293B", opacity: 0.45 }}
        >
          Notes
        </h2>
        <div
          className="w-full"
          style={{
            height: "calc(100% - 36px)",
            backgroundImage:
              "radial-gradient(circle, #1E293B20 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>
    </div>
  );
}