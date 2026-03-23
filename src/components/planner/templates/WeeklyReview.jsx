import React from "react";
import { Trash2 } from "lucide-react";

export default function WeeklyReview({ date, onClearCanvas }) {
  return (
    <div className="relative min-h-[1050px] w-full bg-white p-8 md:p-12 shadow-sm border border-[#cbd5e1] flex flex-col">
      <button 
        onClick={onClearCanvas}
        className="absolute top-6 right-6 z-30 flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white/80 backdrop-blur-sm border border-[#E2E8F0] px-3 py-1.5 rounded-md hover:bg-red-50 shadow-sm"
        title="Clear entire page"
      >
        <Trash2 size={16} />
        <span>Clear Page</span>
      </button>

      {/* Header */}
      <h1 className="text-3xl font-serif font-bold tracking-[0.2em] uppercase mb-10" style={{ color: "#1e293b" }}>
        Weekly Preview
      </h1>

      <div className="flex flex-col flex-1 gap-12">
        {/* Section 1: Wins */}
        <div className="flex flex-col flex-1 min-h-[240px]">
          <div className="flex items-baseline gap-3 mb-2 flex-wrap">
            <h2 className="text-base font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
              After-Action Review
            </h2>
            <span className="text-sm font-medium" style={{ color: "#475569" }}>
              List 3-5 of your biggest wins from the week.
            </span>
          </div>
          <div className="flex-1 w-full mt-2 relative">
             <div className="absolute inset-0 border-l border-r border-t border-[#cbd5e1] pointer-events-none" />
             <div className="w-full h-full" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 39px, #cbd5e1 40px)`, backgroundSize: "100% 40px" }} />
          </div>
        </div>

        {/* Section 2: Big 3 Progress */}
        <div className="flex flex-col mb-4">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-base font-medium" style={{ color: "#1e293b" }}>
              How far did you get on your Weekly Big 3?
            </h2>
            <span className="text-base font-bold text-[#1e293b] mr-6">%</span>
          </div>
          <div className="flex flex-col gap-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-end gap-6 h-10">
                <span className="text-base font-bold text-[#1e293b] mb-1">{num}</span>
                <div className="flex-1 border-b border-[#cbd5e1]" />
                <div className="w-20 border-b border-[#cbd5e1]" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: What worked */}
        <div className="flex flex-col flex-1 min-h-[200px]">
          <h2 className="text-base font-medium mb-4" style={{ color: "#1e293b" }}>
            What worked? What didn't? Why?
          </h2>
          <div className="flex-1 w-full mt-2 relative">
             <div className="absolute inset-0 border-l border-r border-t border-[#cbd5e1] pointer-events-none" />
             <div className="w-full h-full" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 39px, #cbd5e1 40px)`, backgroundSize: "100% 40px" }} />
          </div>
        </div>

        {/* Section 4: What will you continue or change */}
        <div className="flex flex-col flex-1 min-h-[200px]">
          <h2 className="text-base font-medium mb-4" style={{ color: "#1e293b" }}>
            What will you continue or change?
          </h2>
          <div className="flex-1 w-full mt-2 relative">
             <div className="absolute inset-0 border-l border-r border-t border-[#cbd5e1] pointer-events-none" />
             <div className="w-full h-full" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 39px, #cbd5e1 40px)`, backgroundSize: "100% 40px" }} />
          </div>
        </div>
        
        {/* Digital Addition: Weekly Sweep & Next Week Setup */}
        <div className="flex flex-col mt-4 pt-10 border-t-2 border-dashed border-slate-200">
           <div className="flex items-baseline gap-3 mb-8 flex-wrap">
             <h2 className="text-2xl font-serif font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
               Weekly Sweep
             </h2>
             <span className="text-sm font-medium" style={{ color: "#475569" }}>
               Clear your mental and physical space.
             </span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
              <div className="flex flex-col gap-6">
                 <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Clear</h3>
                 {['Physical Inbox', 'Email Inbox', 'Desktop / Downloads', 'Notes & Notebooks'].map(item => (
                    <div key={item} className="flex items-center gap-5">
                       <div className="w-6 h-6 border-2 border-slate-300 rounded-md" />
                       <span className="text-lg text-slate-700">{item}</span>
                    </div>
                 ))}
              </div>
              <div className="flex flex-col gap-6">
                 <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Review</h3>
                 {['Previous Week Calendar', 'Upcoming Week Calendar', 'Waiting On List', 'Project Lists'].map(item => (
                    <div key={item} className="flex items-center gap-5">
                       <div className="w-6 h-6 border-2 border-slate-300 rounded-md" />
                       <span className="text-lg text-slate-700">{item}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="flex flex-col mt-2 pt-10 border-t-2 border-dashed border-slate-200">
           <div className="flex items-baseline gap-3 mb-6 flex-wrap">
             <h2 className="text-2xl font-serif font-bold tracking-widest uppercase" style={{ color: "#1e293b" }}>
               Next Week's Big 3
             </h2>
             <span className="text-sm font-medium" style={{ color: "#475569" }}>
               What are the 3 most important outcomes for next week?
             </span>
           </div>
           <div className="flex flex-col gap-8 mb-8">
              {[1, 2, 3].map((num) => (
                 <div key={num} className="flex items-end gap-6 h-12">
                    <span className="text-2xl font-bold text-slate-300 mb-1">{num}</span>
                    <div className="flex-1 border-b-[2px] border-slate-300" />
                 </div>
              ))}
           </div>
           
           <div className="flex flex-col flex-1 min-h-[160px] mt-6">
              <h2 className="text-base font-bold tracking-widest uppercase mb-2" style={{ color: "#1e293b" }}>
                Self-Care & Rejuvenation
              </h2>
              <span className="text-sm font-medium mb-2" style={{ color: "#475569" }}>
                How will you recharge next week?
              </span>
              <div className="flex-1 w-full mt-2 relative">
                 <div className="absolute inset-0 border-l border-r border-t border-[#cbd5e1] pointer-events-none" />
                 <div className="w-full h-full" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 39px, #cbd5e1 40px)`, backgroundSize: "100% 40px" }} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}