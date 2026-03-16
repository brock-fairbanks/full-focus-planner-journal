import React from "react";

export default function PageSelector({ leftLabel, rightLabel, currentPage, onPageChange }) {
  return (
    <div
      className="flex items-center justify-center py-3 gap-3 shrink-0"
      style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid #57534e" }}
    >
      {[
        { key: "left", label: leftLabel },
        { key: "right", label: rightLabel },
      ].map((p) => (
        <button
          key={p.key}
          onClick={() => onPageChange(p.key)}
          className="px-5 py-2 rounded-full text-sm font-bold transition-all uppercase tracking-wider"
          style={{
            background: currentPage === p.key ? "#d4a843" : "rgba(255,255,255,0.08)",
            color: currentPage === p.key ? "#1c1007" : "#d4a843",
            border: `2px solid ${currentPage === p.key ? "#d4a843" : "rgba(212,168,67,0.25)"}`,
            boxShadow: currentPage === p.key ? "0 4px 12px rgba(212,168,67,0.3)" : "none",
            fontFamily: "Georgia, serif",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}