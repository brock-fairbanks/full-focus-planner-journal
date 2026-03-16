import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { Users, Plus, X, Clock } from "lucide-react";

const REL_COLORS = {
  mentor: "bg-purple-900/40 text-purple-300 border-purple-700",
  peer: "bg-blue-900/40 text-blue-300 border-blue-700",
  collaborator: "bg-green-900/40 text-green-300 border-green-700",
  prospect: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  champion: "bg-orange-900/40 text-orange-300 border-orange-700",
};

const EMPTY = { name: "", role: "", company: "", relationship_type: "peer", priority: "high", next_action: "", notes: "" };

export default function NetworkContacts() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: contacts = [] } = useQuery({
    queryKey: ["networkContacts"],
    queryFn: () => base44.entities.NetworkContact.filter({ priority: "high" }, "-last_touch_date", 20),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NetworkContact.create(data),
    onSuccess: () => { queryClient.invalidateQueries(["networkContacts"]); setShowForm(false); setForm(EMPTY); },
  });

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    return differenceInDays(new Date(), new Date(dateStr));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-slate-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Network High-Value Contacts</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors">
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? "Cancel" : "Add Contact"}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 p-5 rounded-2xl border border-slate-700 bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: "name", label: "Name *", placeholder: "Full Name" },
            { key: "role", label: "Role", placeholder: "CEO, Author, etc." },
            { key: "company", label: "Company", placeholder: "Organization" },
            { key: "next_action", label: "Next Action", placeholder: "Follow up re: intro call" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{f.label}</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Relationship</label>
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              value={form.relationship_type}
              onChange={e => setForm(p => ({ ...p, relationship_type: e.target.value }))}>
              {["mentor","peer","collaborator","prospect","champion"].map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Notes</label>
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
              rows={2}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold text-sm transition-colors">
              Save Contact
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-slate-600">
          <Users size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Add your high-value network contacts above</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(c => {
          const since = daysSince(c.last_touch_date);
          const urgent = since !== null && since > 14;
          return (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-white text-sm">{c.name}</p>
                  {(c.role || c.company) && (
                    <p className="text-xs text-slate-500">{[c.role, c.company].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${REL_COLORS[c.relationship_type] || REL_COLORS.peer}`}>
                  {c.relationship_type}
                </span>
              </div>
              {c.next_action && (
                <p className="text-xs text-slate-400 mb-2 bg-slate-800 rounded px-2 py-1">{c.next_action}</p>
              )}
              {since !== null && (
                <div className={`flex items-center gap-1 text-[10px] ${urgent ? "text-red-400" : "text-slate-600"}`}>
                  <Clock size={10} />
                  Last touch: {since === 0 ? "Today" : `${since}d ago`}
                  {urgent && " · Overdue!"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}