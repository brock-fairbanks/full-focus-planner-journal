import React, { useState, useEffect } from "react";

export default function DailySpread({ date, onSubSectionChange }) {
  const HOURS = Array.from({ length: 15 }, (_, i) => 6 + i); // 6 AM to 8 PM
  const [activeSubSection, setActiveSubSection] = useState("Big 3");

  useEffect(() => {
    if (onSubSectionChange) {
      onSubSectionChange(activeSubSection);
    }
  }, [activeSubSection, onSubSectionChange]);

  const tabs = ["Big 3", "Schedule", "Tasks", "Notes"];

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF9F6]">
      {/* Secondary Navigation Bar */}
      <div className="flex border-b border-[#E2E8F0] px-12 pt-6 gap-8 h-[72px] shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubSection(tab)}
            className={`text-lg font-serif font-bold transition-colors pb-4 border-b-2 h-full flex items-end ${
              activeSubSection === tab 
                ? "border-[#1e293b] text-[#1e293b]" 
                : "border-transparent text-[#94a3b8] hover:text-[#1e293b]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-12 flex justify-center">
        <div className="w-full max-w-3xl">
          {activeSubSection === "Big 3" && (
            <div className="mt-4">
              <h2 className="text-4xl font-serif font-bold mb-12" style={{ color: "#1e293b" }}>
                Daily Big 3
              </h2>
              {[1, 2, 3].map((n) => (
                <div key={n} className="mb-10 flex items-baseline gap-6">
                  <span className="text-3xl font-bold" style={{ color: "#f59e0b" }}>
                    {n}.
                  </span>
                  <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "40px" }} />
                </div>
              ))}
            </div>
          )}

          {activeSubSection === "Schedule" && (
            <div className="mt-4">
              <h3 className="text-4xl font-serif font-bold mb-12" style={{ color: "#1e293b" }}>
                Schedule
              </h3>
              {HOURS.map((hour) => (
                <div key={hour} className="flex gap-6 mb-8 items-center">
                  <span className="text-lg font-bold w-20 text-right" style={{ color: "#94a3b8" }}>
                    {hour === 12 ? 12 : hour > 12 ? hour - 12 : hour}{hour >= 12 ? "PM" : "AM"}
                  </span>
                  <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "32px" }} />
                </div>
              ))}
            </div>
          )}

          {activeSubSection === "Tasks" && (
            <div className="mt-4">
              <h2 className="text-4xl font-serif font-bold mb-12" style={{ color: "#1e293b" }}>
                Other Tasks
              </h2>
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 mb-8">
                  <div className="w-8 h-8 rounded-full border-[3px] shrink-0" style={{ borderColor: "#E2E8F0" }} />
                  <div className="flex-1 border-b" style={{ borderColor: "#E2E8F0", height: "32px" }} />
                </div>
              ))}
            </div>
          )}

          {activeSubSection === "Notes" && (
            <div className="h-full flex flex-col mt-4">
              <h3 className="text-4xl font-serif font-bold mb-12" style={{ color: "#1e293b" }}>
                Notes
              </h3>
              <div
                className="flex-1 min-h-[600px]"
                style={{
                  backgroundImage: `radial-gradient(circle, #E2E8F0 1.5px, transparent 1.5px)`,
                  backgroundSize: "32px 32px",
                  backgroundPosition: "0 0",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}