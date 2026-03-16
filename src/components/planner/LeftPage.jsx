import React, { useState } from "react";

const HOURS = [];
for (let h = 6; h <= 20; h++) {
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  HOURS.push(`${display}:00 ${ampm}`);
}

const TABS = ["Schedule", "Big 3", "Brain Dump"];

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-b shrink-0" style={{ borderColor: "#1E293B18" }}>
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="flex-1 py-2.5 text-sm font-semibold transition-all duration-150 pointer-events-auto"
          style={{
            color: active === t ? "#1E293B" : "#1E293B55",
            borderBottom: active === t ? "2px solid #1E293B" : "2px solid transparent",
            background: "transparent",
            marginBottom: -1,
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ScheduleTab() {
  return (
    <div className="flex flex-col h-full overflow-hidden px-7 pt-4">
      <div className="flex flex-col h-full">
        {HOURS.map((label) => (
          <div key={label} className="flex items-center flex-1" style={{ minHeight: 28 }}>
            <span className="text-xs font-mono shrink-0" style={{ width: 72, color: "#1E293B55" }}>
              {label}
            </span>
            <div className="flex-1 border-b" style={{ borderColor: "#1E293B14" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BigThreeTab() {
  return (
    <div className="px-7 pt-5 flex flex-col gap-5">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center"
              style={{ borderColor: "#1E293B44" }}>
              <span className="text-xs font-bold" style={{ color: "#1E293B66" }}>{n}</span>
            </div>
            <div className="flex-1 border-b-2" style={{ borderColor: "#1E293B18", height: 40 }} />
          </div>
          <div className="ml-12 border-b" style={{ borderColor: "#1E293B0f", height: 32 }} />
        </div>
      ))}
    </div>
  );
}

function BrainDumpTab() {
  return (
    <div className="px-7 pt-4 flex-1 overflow-hidden">
      <div
        className="w-full"
        style={{
          height: "100%",
          backgroundImage: "repeating-linear-gradient(transparent, transparent 35px, #1E293B18 35px, #1E293B18 36px)",
          backgroundSize: "100% 36px",
        }}
      />
    </div>
  );
}

export default function LeftPage() {
  const [activeTab, setActiveTab] = useState("Schedule");

  return (
    <div
      className="h-full overflow-hidden flex flex-col select-none"
      style={{ background: "#FAF9F6", color: "#1E293B" }}
    >
      <TabBar active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {activeTab === "Schedule" && <ScheduleTab />}
        {activeTab === "Big 3" && <BigThreeTab />}
        {activeTab === "Brain Dump" && <BrainDumpTab />}
      </div>
    </div>
  );
}