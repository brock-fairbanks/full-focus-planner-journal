import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Save, AlertCircle, Zap, Star } from "lucide-react";
import RitualsPanel from "../components/brand/RitualsPanel";

export default function DailyPlan() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [form, setForm] = useState({ task_1: "", task_1_goal_id: "", task_2: "", task_2_goal_id: "", task_3: "", task_3_goal_id: "", reflection: "", energy_level: 3 });
  const [loaded, setLoaded] = useState(false);

  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);

  const { data: records = [] } = useQuery({
    queryKey: ["dailyBig3", selectedDate],
    queryFn: () => base44.entities.DailyBig3.filter({ date: selectedDate }),
    onSuccess: (data) => {
      if (!loaded && data[0]) {
        const d = data[0];
        setForm({ task_1: d.task_1 || "", task_1_goal_id: d.task_1_goal_id || "", task_2: d.task_2 || "", task_2_goal_id: d.task_2_goal_id || "", task_3: d.task_3 || "", task_3_goal_id: d.task_3_goal_id || "", reflection: d.reflection || "", energy_level: d.energy_level || 3 });
      }
      setLoaded(true);
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["qGoals"],
    queryFn: () => base44.entities.QuarterlyGoal.list("-year"),
  });

  const record = records[0];

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

  const tasks = [
    { taskKey: "task_1", goalKey: "task_1_goal_id", required: true },
    { taskKey: "task_2", goalKey: "task_2_goal_id", required: false },
    { taskKey: "task_3", goalKey: "task_3_goal_id", required: false },
  ];

  const activeGoals = goals.filter(g => g.status === "in_progress" || g.status === "not_started");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link to="/BrandCompass" className="text-slate-500 hover:text-white">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-400" />
          <span className="font-semibold text-white">Daily Big 3</span>
        </div>
        <div className="flex items-center gap-1 ml-4 rounded-full border border-slate-700 px-2 py-1">
          <button onClick={() => { setLoaded(false); setSelectedDate(d => format(addDays(new Date(d), -1), "yyyy-MM-dd")); }}
            className="text-slate-400 hover:text-white p-1"><ChevronLeft size={14} /></button>
          <span className="text-sm font-medium min-w-[100px] text-center">{format(new Date(selectedDate + "T12:00:00"), "EEE, MMM d")}</span>
          <button onClick={() => { setLoaded(false); setSelectedDate(d => format(addDays(new Date(d), 1), "yyyy-MM-dd")); }}
            className="text-slate-400 hover:text-white p-1"><ChevronRight size={14} /></button>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          <Link to="/BrandCompass" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">Compass</Link>
          <Link to="/WeeklyPreviewWizard" className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">Weekly Wizard</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Big 3 form */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Today's Big 3 Tasks</h2>
          <p className="text-xs text-slate-600 -mt-4">Each task must be linked to a Quarterly Goal to ensure alignment.</p>

          {tasks.map((t, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-amber-900/30 text-amber-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="text-xs font-bold uppercase text-slate-500">{i === 0 ? "Primary Task *" : `Task ${i + 1}`}</span>
              </div>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 mb-3"
                placeholder={i === 0 ? "Your most important task today…" : "Optional task…"}
                value={form[t.taskKey]}
                onChange={e => setForm(p => ({ ...p, [t.taskKey]: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <Star size={12} className={t.required ? "text-amber-400" : "text-slate-600"} />
                <select
                  className={`flex-1 bg-slate-800 border rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 ${
                    t.required && !form[t.goalKey] ? "border-red-800" : "border-slate-700"
                  }`}
                  value={form[t.goalKey]}
                  onChange={e => setForm(p => ({ ...p, [t.goalKey]: e.target.value }))}>
                  <option value="">— Link to a Quarterly Goal{t.required ? " (required)" : ""} —</option>
                  {activeGoals.map(g => (
                    <option key={g.id} value={g.id}>Q{g.quarter} · {g.title}</option>
                  ))}
                </select>
              </div>
              {t.required && !form[t.goalKey] && form[t.taskKey] && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-400">
                  <AlertCircle size={11} /> Task 1 must be linked to a Quarterly Goal
                </div>
              )}
            </div>
          ))}

          {/* Reflection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">End-of-Day Reflection</label>
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
              rows={3}
              placeholder="What happened today? What would you do differently?"
              value={form.reflection}
              onChange={e => setForm(p => ({ ...p, reflection: e.target.value }))}
            />
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-slate-500 uppercase tracking-widest">Energy</span>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setForm(p => ({ ...p, energy_level: n }))}
                  className={`w-7 h-7 rounded-full text-xs font-bold border transition-colors ${
                    form.energy_level >= n ? "bg-amber-500 border-amber-500 text-slate-900" : "border-slate-700 text-slate-600 hover:border-slate-500"
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={!isValid || saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold transition-colors">
            <Save size={16} />
            {saveMutation.isPending ? "Saving…" : "Save Today's Plan"}
          </button>
        </div>

        {/* Right: Rituals */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <RitualsPanel date={selectedDate} />
        </div>
      </main>
    </div>
  );
}