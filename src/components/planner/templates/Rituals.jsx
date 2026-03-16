import React from "react";
import { Sun, Moon } from "lucide-react";

export default function Rituals() {
  return (
    <div className="flex h-full gap-0" style={{ background: "#FAF9F6" }}>
      {/* Morning Startup */}
      <div className="flex-1 flex flex-col border-r p-8" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex items-center gap-3 mb-8">
          <Sun size={28} style={{ color: "#f59e0b" }} />
          <h2 className="text-2xl font-serif font-bold" style={{ color: "#1e293b" }}>
            Morning Startup
          </h2>
        </div>

        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="mb-4 flex items-baseline gap-3">
            <input type="checkbox" disabled className="w-4 h-4 shrink-0" />
            <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "24px" }} />
          </div>
        ))}
      </div>

      {/* Evening Shutdown */}
      <div className="flex-1 flex flex-col p-8">
        <div className="flex items-center gap-3 mb-8">
          <Moon size={28} style={{ color: "#8b5cf6" }} />
          <h2 className="text-2xl font-serif font-bold" style={{ color: "#1e293b" }}>
            Evening Shutdown
          </h2>
        </div>

        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="mb-4 flex items-baseline gap-3">
            <input type="checkbox" disabled className="w-4 h-4 shrink-0" />
            <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "24px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}