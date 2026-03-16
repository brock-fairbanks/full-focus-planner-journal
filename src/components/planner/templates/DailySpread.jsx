import React, { useState, useEffect } from "react";

export default function DailySpread({ date, onSubSectionChange }) {
  const HOURS = Array.from({ length: 17 }, (_, i) => 5 + i); // 5 AM to 9 PM
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
      <div className="flex border-b border-[#E2E8F0] px-8 pt-4 md:px-12 md:pt-6 gap-8 h-[64px] md:h-[72px] shrink-0">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubSection(tab)}
            className={`text-lg md:text-xl font-serif font-bold transition-colors pb-3 md:pb-4 border-b-2 h-full flex items-end ${
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
      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center">
        <div className="w-full max-w-4xl">
          {activeSubSection === "Big 3" && (
            <div className="mt-2">
              <h2 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>
                Daily Big 3
              </h2>
              {[1, 2, 3].map((n) => (
                <div key={n} className="mb-14">
                  <div className="flex items-end gap-6 mb-10">
                    <span className="text-4xl font-bold w-10 text-right leading-none" style={{ color: "#f59e0b" }}>
                      {n}.
                    </span>
                    <div className="flex-1 border-b-2" style={{ borderColor: "#E2E8F0" }} />
                  </div>
                  <div className="flex items-end gap-6">
                    <span className="w-10 text-right"></span>
                    <div className="flex-1 border-b-2" style={{ borderColor: "#E2E8F0" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubSection === "Schedule" && (
            <div className="mt-2">
              <h3 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>
                Schedule
              </h3>
              {HOURS.map((hour) => (
                <div key={hour} className="mb-8">
                  <div className="flex gap-6 items-end">
                    <span className="text-xl font-bold w-20 text-right leading-none" style={{ color: "#94a3b8" }}>
                      {hour === 12 ? 12 : hour > 12 ? hour - 12 : hour}{hour >= 12 ? "PM" : "AM"}
                    </span>
                    <div className="flex-1 border-b-2" style={{ borderColor: "#E2E8F0" }} />
                  </div>
                  <div className="flex gap-6 items-end mt-8">
                    <span className="w-20 text-right text-sm text-slate-300 pr-1 leading-none">:30</span>
                    <div className="flex-1 border-b border-dashed" style={{ borderColor: "#E2E8F0" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubSection === "Tasks" && (
            <div className="mt-2">
              <h2 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>
                Other Tasks
              </h2>
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex items-end gap-6 mb-10">
                  <div className="w-8 h-8 rounded-full border-[3px] shrink-0 mb-1" style={{ borderColor: "#E2E8F0" }} />
                  <div className="flex-1 border-b-2" style={{ borderColor: "#E2E8F0" }} />
                </div>
              ))}
            </div>
          )}

          {activeSubSection === "Notes" && (
            <div className="h-full flex flex-col mt-2">
              <h3 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>
                Notes
              </h3>
              <div
                className="flex-1 min-h-[800px]"
                style={{
                  backgroundImage: `radial-gradient(circle, #E2E8F0 2px, transparent 2px)`,
                  backgroundSize: "40px 40px",
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