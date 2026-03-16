import React from "react";
import DailySpread from "./templates/DailySpread.jsx";
import IdealWeek from "./templates/IdealWeek.jsx";
import QuarterlyGoals from "./templates/QuarterlyGoals.jsx";
import Rituals from "./templates/Rituals.jsx";
import WeeklyReview from "./templates/WeeklyReview.jsx";
import JournalSpread from "./templates/JournalSpread.jsx";

export default function TemplateRenderer({ template, date, onSubSectionChange, onClearCanvas, journalMode }) {
  const templates = {
    DAILY: <DailySpread date={date} onSubSectionChange={onSubSectionChange} onClearCanvas={onClearCanvas} />,
    IDEAL_WEEK: <IdealWeek date={date} onClearCanvas={onClearCanvas} />,
    QUARTERLY_GOALS: <QuarterlyGoals date={date} onClearCanvas={onClearCanvas} />,
    RITUALS: <Rituals date={date} onClearCanvas={onClearCanvas} />,
    WEEKLY: <WeeklyReview date={date} onClearCanvas={onClearCanvas} />,
    JOURNAL: <JournalSpread date={date} onSubSectionChange={onSubSectionChange} onClearCanvas={onClearCanvas} journalMode={journalMode} />,
  };

  const component = templates[template];
  
  return (
    <div className="w-full min-h-full bg-[#FAF9F6]">
      {component || <div className="p-10 text-slate-400">Template Loading...</div>}
    </div>
  );
}