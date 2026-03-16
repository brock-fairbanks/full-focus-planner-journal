import React, { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { Trash2, MapPin, CloudSun } from "lucide-react";
import { format } from "date-fns";

export default function JournalSpread({ date, onSubSectionChange, onClearCanvas }) {
  const [activeSubSection, setActiveSubSection] = useState("The Story");

  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem("planner_journal_tabs_order");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return ["The Story", "The Review", "The Heart", "The Compass"];
  });

  const handleReorder = (newOrder) => {
    setTabs(newOrder);
    localStorage.setItem("planner_journal_tabs_order", JSON.stringify(newOrder));
  };

  useEffect(() => {
    if (onSubSectionChange) {
      onSubSectionChange(activeSubSection);
    }
  }, [activeSubSection, onSubSectionChange]);

  const renderSection = (title, prompts) => (
    <div className="mt-2 h-full flex flex-col">
      <h2 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>
        {title}
      </h2>
      <div className="flex-1 flex flex-col gap-8">
        {prompts.map((prompt, idx) => (
          <div key={idx} className="flex-1 flex flex-col min-h-[300px]">
            <h3 className="text-2xl font-serif font-semibold mb-4" style={{ color: "#8B7355" }}>
              {prompt}
            </h3>
            <div
              className="flex-1 w-full"
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 39px, #E2E8F0 40px)`,
                backgroundSize: "100% 40px",
                backgroundPosition: "0 0",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full min-h-full bg-[#FAF9F6]">
      {/* Secondary Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E2E8F0] px-8 md:px-12 h-[64px] md:h-[72px] shrink-0 bg-[#FAF9F6]">
        <Reorder.Group 
          axis="x" 
          values={tabs} 
          onReorder={handleReorder}
          className="flex gap-2 md:gap-4 items-center"
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
                className={`text-sm md:text-base font-serif font-bold transition-all px-4 py-2 rounded-lg select-none shadow-sm ${
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
            <span className="hidden md:inline">Clear Page</span>
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="px-8 md:px-12 py-6 flex flex-wrap gap-8 items-center border-b border-[#E2E8F0]">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase text-[#94a3b8] tracking-wider mb-1">Date</span>
          <span className="font-serif text-xl text-[#1e293b]">{format(date || new Date(), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <span className="text-xs font-bold uppercase text-[#94a3b8] tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> Location</span>
          <div className="border-b border-[#E2E8F0] h-7 w-full max-w-[300px]"></div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase text-[#94a3b8] tracking-wider mb-1 flex items-center gap-1"><CloudSun size={12}/> Weather</span>
          <div className="border-b border-[#E2E8F0] h-7 w-32"></div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-10 flex justify-center">
        <div className="w-full max-w-4xl h-full pb-32">
          {activeSubSection === "The Story" && renderSection("The Story", ["What happened today?"])}
          {activeSubSection === "The Review" && renderSection("The Review", ["What were my wins?", "What were my losses/lessons?"])}
          {activeSubSection === "The Heart" && renderSection("The Heart", ["What am I grateful for?", "What am I excited about?"])}
          {activeSubSection === "The Compass" && renderSection("The Compass", ["What did I learn?", "Where did I see meaning/connection?", "What is one thing I want to remember about today?"])}
        </div>
      </div>
    </div>
  );
}