import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Save, AlertCircle } from "lucide-react";
import CompassHUD from "../components/brand/CompassHUD";
import LiveInkBig3 from "../components/brand/LiveInkBig3";
import RitualsPanel from "../components/brand/RitualsPanel";
import RadialMenu from "../components/brand/RadialMenu";
import GoalSlider from "../components/brand/GoalSlider";

const glass = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

export default function DailyPlan() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [form, setForm] = useState({
    task_1: "", task_1_goal_id: "",
    task_2: "", task_2_goal_id: "",
    task_3: "", task_3_goal_id: "",
    reflection: "", energy_level: 3,
  });
  const [loaded, setLoaded] = useState(false);

  const { data: records = [] } = useQuery({
    queryKey: ["dailyBig3", selectedDate],
    queryFn: () => base44.entities.DailyBig3.filter({ date: selectedDate }),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["qGoals"],
    queryFn: () => base44.entities.QuarterlyGoal.list("-year"),
  });

  const record = records[0];

  useEffect(() => {
    if (!loaded && record) {
      setForm({
        task_1: record.task_1 || "", task_1_goal_id: record.task_1_goal_id || "",
        task_2: record.task_2 || "", task_2_goal_id: record.task_2_goal_id || "",
        task_3: record.task_3 || "", task_3_goal_id: record.task_3_goal_id || "",
        reflection: record.reflection || "", energy_level: record.energy_level || 3,
      });
      setLoaded(true);
    }
  }, [record, loaded]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      record?.id
        ? base44.entities.DailyBig3.update(record.id, data)
        : base44.entities.DailyBig3.create({ date: selectedDate, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyBig3", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["dailyBig3Today"] });
    },
  });

  const isValid = form.task_1 && form.task_1_goal_id;
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
  const qGoals = goals.filter(g => g.quarter === currentQ && g.year === new Date().getFullYear());

  // Goal progress update
  const updateGoalProgress = (goalId, pct) => {
    const status = pct === 100 ? "completed" : pct > 0 ? "in_progress" : "not_started";
    base44.entities.QuarterlyGoal.update(goalId, { status })
      .then(() => queryClient.invalidateQueries({ queryKey: ["qGoals"] }));
  };

  return (
    <div
      className="min-h-screen text-slate-100 font-sans"
      style={{ background: "linear-gradient(135deg, #080c16 0%, #0d1628 50%, #0a1220 100%)" }}
    >
      {/* Pinned Compass HUD */}
      <CompassHUD />

      {/* Date nav subheader */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <button onClick={() => { setLoaded(false); setSelectedDate(d => format(addDays(new Date(d + "T12:00:00"), -1), "yyyy-MM-dd")); }}
          className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-slate-300 min-w-[110px] text-center">
          {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
        </span>
        <button onClick={() => { setLoaded(false); setSelectedDate(d => format(addDays(new Date(d + "T12:00:00"), 1), "yyyy-MM-dd")); }}
          className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronRight size={16} />
        </button>
        <button onClick={() => { setLoaded(false); setSelectedDate(format(new Date(), "yyyy-MM-dd")); }}
          className="ml-2 text-[10px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-300 transition-colors">
          Today
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Big 3 Ink Zone */}
        <div className="md:col-span-2 space-y-5">
          <div style={glass}>
            <LiveInkBig3 goals={goals} form={form} setForm={setForm} />
            {!isValid && form.task_1 && (
              <div className="flex items-center gap-1.5 mt-4 text-xs text-red-400">
                <AlertCircle size={11} /> Link Task 1 to a Quarterly Goal to save
              </div>
            )}
            <button
              onClick={() => saveMutation.mutate(form)}
              disabled={!isValid || saveMutation.isPending}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
              style={{
                background: isValid ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.06)",
                color: isValid ? "#0f172a" : "#475569",
              }}>
              <Save size={14} />
              {saveMutation.isPending ? "Saving…" : "Save Today's Plan"}
            </button>
          </div>

          {/* Reflection */}
          <div style={glass}>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              End-of-Day Reflection
            </label>
            <textarea
              className="w-full rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              rows={3}
              placeholder="What happened? What would you do differently?"
              value={form.reflection}
              onChange={e => setForm(p => ({ ...p, reflection: e.target.value }))}
            />
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-slate-600 uppercase tracking-widest">Energy</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n}
                  onClick={() => setForm(p => ({ ...p, energy_level: n }))}
                  className="w-7 h-7 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: form.energy_level >= n ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.05)",
                    color: form.energy_level >= n ? "#0f172a" : "#475569",
                    border: form.energy_level >= n ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(255,255,255,0.07)",
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Q Goal sliders */}
          {qGoals.length > 0 && (
            <div style={glass}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Q{currentQ} Goal Progress</p>
              <div className="space-y-5">
                {qGoals.map(g => (
                  <GoalSlider
                    key={g.id}
                    label={g.title}
                    value={g.status === "completed" ? 100 : g.status === "in_progress" ? 50 : 0}
                    onChange={(pct) => updateGoalProgress(g.id, pct)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Rituals */}
        <div style={{ ...glass, alignSelf: "start" }}>
          <RitualsPanel date={selectedDate} />
        </div>
      </main>

      {/* Bottom-corner Radial Menu */}
      <RadialMenu />
    </div>
  );
}