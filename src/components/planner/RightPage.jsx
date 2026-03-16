import React from "react";

export default function RightPage() {
  return (
    <div
      className="h-full overflow-hidden flex flex-col select-none pointer-events-none"
      style={{ background: "#FAF9F6", color: "#1E293B" }}
    >
      {/* Other Tasks */}
      <div className="px-5 pt-4 pb-2">
        <h2
          className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: "#1E293B", opacity: 0.5 }}
        >
          Other Tasks
        </h2>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex items-center gap-3 mb-2">
            <div
              className="w-4 h-4 rounded-sm border-2 shrink-0"
              style={{ borderColor: "#1E293B33" }}
            />
            <div
              className="flex-1 border-b"
              style={{ borderColor: "#1E293B1a", height: 24 }}
            />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-5 border-t" style={{ borderColor: "#1E293B15" }} />

      {/* Notes */}
      <div className="px-5 pt-3 flex-1 overflow-hidden">
        <h2
          className="text-xs font-bold uppercase tracking-[0.2em] mb-2"
          style={{ color: "#1E293B", opacity: 0.5 }}
        >
          Notes
        </h2>
        <div
          className="w-full flex-1"
          style={{
            height: "calc(100% - 28px)",
            backgroundImage:
              "radial-gradient(circle, #1E293B18 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
    </div>
  );
}