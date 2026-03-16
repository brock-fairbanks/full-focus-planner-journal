import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, getISOWeek, getYear } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle, Trophy, RefreshCw, Target, ArrowRight } from "lucide-react";

const STEPS = [
  { id: "wins",     label: "Big Wins",        icon: Trophy },
  { id: "aar",      label: "After Action Review", icon: RefreshCw },
  { id: "plan",     label: "Plan Next Week",   icon: Target },
];

export default function WeeklyPreviewWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date();
  const weekNum = getISOWeek(today);
  const year = getYear(today);
  const weekLabel = `${year}-W${String(weekNum).padStart(2, "0")}`;

  const [step, setStep] = useState(0);
  const [wins, setWins] = useState(["", "", ""]);
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  const [priorities, setPriorities] = useState(["", "", "", "", ""]);
  const [selectedGoalIds, setSelectedGoalIds] = useState([]);

  const { data: existing = [] } = useQuery({
    queryKey: ["weeklyPreview", weekLabel],
    queryFn: () => base44.entities.WeeklyPreview.filter({ week_label: weekLabel }),
    onSuccess: (data) => {
      if (data[0]) {
        const d = data[0];
        if (d.big_wins?.length) setWins(d.big_wins.concat(["","",""].slice(d.big_wins.length)));
        if (d.after_action_review) setWentWell(d.after_action_review);
        if (d.what_to_improve) setToImprove(d.what_to_improve);
        if (d.top_priorities?.length) setPriorities(d.top_priorities.concat(["","","","",""].slice(d.top_priorities.length)));
        if (d.quarterly_goal_ids?.length) setSelectedGoalIds(d.quarterly_goal_ids);
        if (d.is_completed) setStep(3);
      }
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["qGoals"],
    queryFn: () => base44.entities.QuarterlyGoal.filter({ year, status: "in_progress" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (isComplete) => {
      const payload = {
        week_label: weekLabel,
        year,
        week_number: weekNum,
        big_wins: wins.filter(Boolean),
        after_action_review: wentWell,
        what_to_improve: toImprove,
        top_priorities: priorities.filter(Boolean),
        quarterly_goal_ids: selectedGoalIds,
        is_completed: isComplete,
      };
      if (existing[0]?.id) {
        return base44.entities.WeeklyPreview.update(existing[0].id, payload);
      }
      return base44.entities.WeeklyPreview.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weeklyPreview"] }),
  });

  const handleNext = async () => {
    const isLast = step === STEPS.length - 1;
    await saveMutation.mutateAsync(isLast);
    if (isLast) navigate("/BrandCompass");
    else setStep(s => s + 1);
  };

  const canProceed = () => {
    if (step === 0) return wins.some(Boolean);
    if (step === 1) return wentWell.trim().length > 10;
    if (step === 2) return priorities.some(Boolean) && selectedGoalIds.length > 0;
    return false;
  };

  const toggleGoal = (id) =>
    setSelectedGoalIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const currentQ = Math.ceil((today.getMonth() + 1) / 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-4">
        <Link to="/BrandCompass" className="text-slate-500 hover:text-white">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Weekly Preview Wizard</p>
          <p className="font-semibold text-white">Week {weekNum} · {year}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                i < step ? "bg-green-600 border-green-600 text-white" :
                i === step ? "bg-amber-500 border-amber-500 text-slate-900" :
                "border-slate-700 text-slate-600"
              }`}>
                {i < step ? <CheckCircle size={12} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? "bg-green-600" : "bg-slate-700"}`} />}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Step label */}
          <div className="flex items-center gap-2 mb-6">
            {React.createElement(STEPS[step].icon, { size: 18, className: "text-amber-400" })}
            <h2 className="text-xl font-semibold text-white">{STEPS[step].label}</h2>
          </div>

          {/* STEP 0: Big Wins */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm mb-4">What were your top wins from last week? Celebrate them before moving on.</p>
              {wins.map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-900/40 text-amber-400 text-xs flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  <input
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    placeholder={`Win #${i + 1}`}
                    value={w}
                    onChange={e => setWins(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                  />
                </div>
              ))}
            </div>
          )}

          {/* STEP 1: After Action Review */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-slate-400 text-sm mb-2">Honest reflection before planning. This is your growth loop.</p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">What went well?</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                  rows={4}
                  placeholder="Be specific — what actions produced results?"
                  value={wentWell}
                  onChange={e => setWentWell(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">What to improve?</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                  rows={4}
                  placeholder="One or two honest observations…"
                  value={toImprove}
                  onChange={e => setToImprove(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Plan Next Week */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-slate-400 text-sm">Set up to 5 priorities for the coming week, then link them to at least one Q{currentQ} goal.</p>
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">Top Priorities</label>
                {priorities.map((p, i) => (
                  <input key={i}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    placeholder={`Priority ${i + 1}`}
                    value={p}
                    onChange={e => setPriorities(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                  />
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Link to Quarterly Goals <span className="text-red-400">*</span>
                </label>
                {goals.length === 0 && (
                  <p className="text-sm text-slate-600">No active Q{currentQ} goals found. Create them in the Planner first.</p>
                )}
                <div className="space-y-2">
                  {goals.map(g => (
                    <button key={g.id} onClick={() => toggleGoal(g.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                        selectedGoalIds.includes(g.id)
                          ? "border-amber-500 bg-amber-900/20 text-amber-200"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                      }`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        selectedGoalIds.includes(g.id) ? "border-amber-400 bg-amber-400" : "border-slate-600"
                      }`}>
                        {selectedGoalIds.includes(g.id) && <CheckCircle size={10} className="text-slate-900" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{g.title}</p>
                        {g.pillar && <p className="text-xs text-slate-500">{g.pillar}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-10">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 transition-colors text-sm">
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceed() || saveMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold text-sm transition-colors">
              {step === STEPS.length - 1 ? "Complete & Plan Week" : "Next"}
              {step < STEPS.length - 1 ? <ChevronRight size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}