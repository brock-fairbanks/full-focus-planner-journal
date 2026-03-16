import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sunrise, Moon, Check } from "lucide-react";

const STARTUP_ITEMS = [
  "Review today's Big 3",
  "Check calendar & commitments",
  "Set your top intention",
  "Review Q-goal progress",
];
const SHUTDOWN_ITEMS = [
  "Log today's wins & reflections",
  "Clear inbox to zero",
  "Prep tomorrow's Big 3",
  "Note energy level",
];

export default function RitualsPanel({ date = format(new Date(), "yyyy-MM-dd") }) {
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ["dailyBig3", date],
    queryFn: () => base44.entities.DailyBig3.filter({ date }),
  });

  const record = records[0];

  const toggleMutation = useMutation({
    mutationFn: (patch) =>
      record?.id
        ? base44.entities.DailyBig3.update(record.id, patch)
        : base44.entities.DailyBig3.create({ date, ...patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dailyBig3", date] }),
  });

  const toggle = (field) =>
    toggleMutation.mutate({ [field]: !record?.[field] });

  return (
    <div className="space-y-6">
      {/* Startup */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sunrise size={15} className="text-orange-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Morning Startup</span>
        </div>
        <div className="space-y-2">
          {STARTUP_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                record?.startup_ritual_done && i === 0 ? "bg-green-600 border-green-600" : "border-slate-700"
              }`}>
                {record?.startup_ritual_done && i === 0 && <Check size={10} className="text-white" />}
              </div>
              {item}
            </div>
          ))}
        </div>
        <button
          onClick={() => toggle("startup_ritual_done")}
          className={`mt-3 w-full py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${
            record?.startup_ritual_done
              ? "bg-green-900/30 border-green-800 text-green-400"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-orange-500"
          }`}>
          {record?.startup_ritual_done ? "✓ Startup Done" : "Mark Startup Complete"}
        </button>
      </div>

      {/* Shutdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Moon size={15} className="text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Evening Shutdown</span>
        </div>
        <div className="space-y-2">
          {SHUTDOWN_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                record?.shutdown_ritual_done && i === 0 ? "bg-indigo-600 border-indigo-600" : "border-slate-700"
              }`}>
                {record?.shutdown_ritual_done && i === 0 && <Check size={10} className="text-white" />}
              </div>
              {item}
            </div>
          ))}
        </div>
        <button
          onClick={() => toggle("shutdown_ritual_done")}
          className={`mt-3 w-full py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors ${
            record?.shutdown_ritual_done
              ? "bg-indigo-900/30 border-indigo-800 text-indigo-400"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-indigo-500"
          }`}>
          {record?.shutdown_ritual_done ? "✓ Shutdown Done" : "Mark Shutdown Complete"}
        </button>
      </div>
    </div>
  );
}