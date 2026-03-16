import React from "react";
import DailySpread from "./templates/DailySpread";
import IdealWeek from "./templates/IdealWeek";
import QuarterlyGoals from "./templates/QuarterlyGoals";
import Rituals from "./templates/Rituals";
import WeeklyReview from "./templates/WeeklyReview";

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