import React from "react";
import DailySpread from "./templates/DailySpread.jsx";
import IdealWeek from "./templates/IdealWeek.jsx";
import QuarterlyGoals from "./templates/QuarterlyGoals.jsx";
import Rituals from "./templates/Rituals.jsx";
import WeeklyReview from "./templates/WeeklyReview.jsx";

export default function TemplateRenderer({ template, date, onSubSectionChange }) {
  const templates = {
    DAILY: <DailySpread date={date} onSubSectionChange={onSubSectionChange} />,
    IDEAL_WEEK: <IdealWeek date={date} />,
    QUARTERLY_GOALS: <QuarterlyGoals date={date} />,
    RITUALS: <Rituals date={date} />,
    WEEKLY: <WeeklyReview date={date} />,
  };

  const component = templates[template];
  
  return (
    <div className="w-full min-h-full bg-[#FAF9F6]">
      {component || <div className="p-10 text-slate-400">Template Loading...</div>}
    </div>
  );
}