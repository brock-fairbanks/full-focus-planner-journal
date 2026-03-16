import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { format, addDays } from "date-fns";

export default function HeaderBar({ selectedDate, onDateChange, isSynced }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 border-b bg-white border-gray-200 pointer-events-auto">
      <h1 className="text-lg font-semibold text-gray-900">Executive OS</h1>

      <div className="flex items-center gap-4">
        <button
          className="px-3 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </button>

        <button className="p-1 hover:bg-gray-100 rounded" onClick={() => onDateChange(addDays(selectedDate, -1))}>
          <ChevronLeft size={20} className="text-gray-600" />
        </button>

        <span className="min-w-[120px] text-center text-sm font-medium text-gray-900">
          {format(selectedDate, "EEE, MMM d")}
        </span>

        <button className="p-1 hover:bg-gray-100 rounded" onClick={() => onDateChange(addDays(selectedDate, 1))}>
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isSynced ? (
          <ShieldCheck size={18} className="text-green-600" style={{ animation: "pulse 2s infinite" }} />
        ) : (
          <span className="text-xs font-medium text-amber-600">Saving...</span>
        )}
      </div>
    </div>
  );
}