import React from "react";

export default function WeeklyReview({ date }) {
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
    <div className="grid grid-cols-2 h-full gap-0" style={{ background: "#FAF9F6" }}>
      {pages.map((page, idx) => (
        <div
          key={idx}
          className="flex flex-col border p-8 overflow-auto"
          style={{ borderColor: "#E2E8F0" }}
        >
          <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "#1e293b" }}>
            {page.title}
          </h2>
          <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
            {page.subtitle}
          </p>

          {/* Content area with dot grid */}
          <div
            className="flex-1"
            style={{
              backgroundImage: `radial-gradient(circle, #E2E8F0 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0",
            }}
          />
        </div>
      ))}
    </div>
  );
}