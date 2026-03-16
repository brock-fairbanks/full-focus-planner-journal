import React from "react";
import DailySpread from "./templates/DailySpread.jsx";
import IdealWeek from "./templates/IdealWeek.jsx";
import QuarterlyGoals from "./templates/QuarterlyGoals.jsx";
import Rituals from "./templates/Rituals.jsx";
import WeeklyReview from "./templates/WeeklyReview.jsx";

export default function TemplateRenderer({ template, date }) {
  const templates = {
    DAILY: <DailySpread date={date} />,
    IDEAL_WEEK: <IdealWeek date={date} />,
    QUARTERLY_GOALS: <QuarterlyGoals date={date} />,
    RITUALS: <Rituals date={date} />,
    WEEKLY_REVIEW: <WeeklyReview date={date} />,
  };

  return templates[template] || null;
}