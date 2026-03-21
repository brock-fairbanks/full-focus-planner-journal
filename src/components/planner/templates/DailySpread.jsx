import React, { useState, useEffect } from "react";
import { Reorder } from "framer-motion";

import { Trash2 } from "lucide-react";

export default function DailySpread({ date, onSubSectionChange, onClearCanvas }) {
  const HOURS = Array.from({ length: 17 }, (_, i) => 5 + i); // 5 AM to 9 PM
  const [activeSubSection, setActiveSubSection] = useState("Schedule");

  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem("planner_daily_tabs_order");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return ["Schedule", "Big 3", "Tasks", "Notes"];
  });

  const handleReorder = (newOrder) => {
    setTabs(newOrder);
    localStorage.setItem("planner_daily_tabs_order", JSON.stringify(newOrder));
  };

  useEffect(() => {
    if (onSubSectionChange) {
      onSubSectionChange(activeSubSection);
    }
  }, [activeSubSection, onSubSectionChange]);

  return (
    <div className="flex flex-col w-full min-h-full bg-[#FAF9F6]">
      {/* Secondary Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E2E8F0] px-12 h-[72px] shrink-0 bg-[#FAF9F6]">
        <Reorder.Group 
          axis="x" 
          values={tabs} 
          onReorder={handleReorder}
          className="flex gap-4 items-center"
        >
          {tabs.map(tab => (
            <Reorder.Item 
              key={tab} 
              value={tab}
              className="flex items-center cursor-grab active:cursor-grabbing"
              dragConstraints={{ left: 0, right: 0 }}
            >
              <button
                onClick={() => setActiveSubSection(tab)}
                className={`text-base font-serif font-bold transition-all px-4 py-2 rounded-lg select-none shadow-sm ${
                  activeSubSection === tab 
                    ? "bg-[#1e293b] text-white border border-[#1e293b]" 
                    : "bg-white text-[#94a3b8] border border-[#E2E8F0] hover:bg-[#f8fafc] hover:text-[#1e293b]"
                }`}
              >
                {tab}
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <div className="flex items-center ml-4">
          <button 
            onClick={onClearCanvas}
            className="flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg hover:bg-red-50 shadow-sm"
            title="Clear entire page"
          >
            <Trash2 size={16} />
            <span className="inline">Clear Page</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-10 flex justify-center">
        <div className="w-full max-w-4xl">
          {activeSubSection === "Big 3" && (
            <div className="mt-2">
              <h2 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>
                Daily Big 3
              </h2>
              {[1, 2, 3].map((n) => (
                <div key={n} className="mb-10">
                  <div className="flex items-end gap-6" style={{ height: "40px" }}>
                    <span className="text-4xl font-bold w-10 text-right leading-none pb-1" style={{ color: "#f59e0b" }}>
                      {n}.
                    </span>
                    <div className="flex-1 border-b-[3px]" style={{ borderColor: "#cbd5e1", height: "100%" }} />
                  </div>
                  <div className="flex items-end gap-6" style={{ height: "40px" }}>
                    <span className="w-10 text-right"></span>
                    <div className="flex-1 border-b-[3px]" style={{ borderColor: "#cbd5e1", height: "100%" }} />
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
                <div key={hour}>
                  <div className="flex gap-6 items-end" style={{ height: "40px" }}>
                    <span className="text-xl font-bold w-20 text-right leading-none pb-1" style={{ color: "#94a3b8" }}>
                      {hour === 12 ? 12 : hour > 12 ? hour - 12 : hour}{hour >= 12 ? "PM" : "AM"}
                    </span>
                    <div className="flex-1 border-b-[3px]" style={{ borderColor: "#cbd5e1", height: "100%" }} />
                  </div>
                  <div className="flex gap-6 items-end" style={{ height: "40px" }}>
                    <span className="w-20 text-right text-sm text-slate-300 pr-1 leading-none pb-1">:30</span>
                    <div className="flex-1 border-b-2 border-dashed" style={{ borderColor: "#cbd5e1", height: "100%" }} />
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
                <div key={i} className="flex items-end gap-6" style={{ height: "40px" }}>
                  <div className="w-8 h-8 rounded-full border-[3px] shrink-0 mb-1" style={{ borderColor: "#cbd5e1" }} />
                  <div className="flex-1 border-b-[3px]" style={{ borderColor: "#cbd5e1", height: "100%" }} />
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
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 38px, #cbd5e1 40px)`,
                  backgroundSize: "100% 40px",
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