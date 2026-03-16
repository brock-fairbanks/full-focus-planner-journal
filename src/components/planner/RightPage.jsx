import React, { useState } from "react";

const TABS = ["Tasks", "Notes"];

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

function TasksTab() {
  return (
    <div className="px-7 pt-5 flex flex-col gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <div key={n} className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-sm border-2 shrink-0" style={{ borderColor: "#1E293B44" }} />
          <div className="flex-1 border-b-2" style={{ borderColor: "#1E293B18", height: 32 }} />
        </div>
      ))}
    </div>
  );
}

function NotesTab() {
  return (
    <div className="px-7 pt-4 flex-1 overflow-hidden h-full">
      <div
        className="w-full h-full"
        style={{
          backgroundImage: "radial-gradient(circle, #1E293B20 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

export default function RightPage() {
  const [activeTab, setActiveTab] = useState("Tasks");

  return (
    <div
      className="h-full overflow-hidden flex flex-col select-none"
      style={{ background: "#FAF9F6", color: "#1E293B" }}
    >
      <TabBar active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {activeTab === "Tasks" && <TasksTab />}
        {activeTab === "Notes" && <NotesTab />}
      </div>
    </div>
  );
}