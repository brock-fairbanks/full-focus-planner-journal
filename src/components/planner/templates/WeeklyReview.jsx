import React from "react";
import { Trash2 } from "lucide-react";

export default function WeeklyReview({ date, onClearCanvas }) {
  const pages = [
    {
      title: "Biggest Wins",
      subtitle: "What went right this week?",
    },
    {
      title: "After-Action Report",
      subtitle: "What can we improve?",
    },
    {
      title: "The Compass",
      subtitle: "Life Satisfaction by Pillar",
    },
    {
      title: "Weekly Big 3",
      subtitle: "Next week's focus",
    },
  ];

  return (
    <div className="relative grid grid-cols-2 min-h-[800px] w-full gap-0 bg-[#FAF9F6]">
      <button 
        onClick={onClearCanvas}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
        title="Clear entire page"
      >
        <Trash2 size={16} />
        <span>Clear Page</span>
      </button>
      {pages.map((page, idx) => (
        <div
          key={idx}
          className="flex flex-col border-2 border-[#cbd5e1] bg-white p-8"
        >
          <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "#1e293b" }}>
            {page.title}
          </h2>
          <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
            {page.subtitle}
          </p>

          {/* Content area with lines */}
          <div
            className="flex-1 mt-2"
            style={{
              backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 30px, #cbd5e1 32px)`,
              backgroundSize: "100% 32px",
              backgroundPosition: "0 0",
            }}
          />
        </div>
      ))}
    </div>
  );
}