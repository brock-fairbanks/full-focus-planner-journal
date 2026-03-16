import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderBar({ selectedDate, onDateChange, isSynced, activeTemplate }) {
  const { user } = useAuth();
  
  return (
    <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between pr-8 pointer-events-auto z-50 border-b" style={{
      backgroundColor: "#1A120B",
      backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(0,0,0,0.2)), url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E\")",
      borderColor: "#3e2d1d",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
    }}>
      {/* Left: Logo and Title */}
      <div className="flex items-center h-full min-w-[280px]">
        <div className="flex items-center justify-center h-[46px] shrink-0 ml-4 mr-3 px-3 bg-[#FAF9F6] rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-white/10">
          <img 
            src="https://media.base44.com/images/public/69b75c76e85ef9b64b1a38bb/6bc2ee721_fb_textured_bg_1920_1080_1-removebg-preview.png"
            alt="Fairbanks Builders"
            className="h-full w-auto object-contain py-1 scale-110"
            style={{ maxWidth: "200px" }}
          />
        </div>
        <div className="flex flex-col z-10 justify-center">
          <span 
            className="text-[10px] uppercase tracking-widest font-bold leading-none mt-1"
            style={{
              color: "#F97316",
              textShadow: "0 0 8px rgba(249, 115, 22, 0.6)"
            }}
          >
            {activeTemplate === "JOURNAL" ? "Journal" : "Planner"}
          </span>
        </div>
      </div>

      {/* Center: Date with Navigation */}
      <div className="flex flex-1 items-center justify-center gap-4">
        <button 
          onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80"
          style={{color: "#b8956a"}}
          title="Previous"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="text-center min-w-[180px]">
          <div style={{fontFamily: "'Playfair Display', serif", fontSize: "24px", fontWeight: "600", color: "#f5deb3", letterSpacing: "0.5px"}}>
            {format(selectedDate, "EEEE")}
          </div>
          <div style={{fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "400", color: "#c5a87e", letterSpacing: "0.3px"}}>
            {format(selectedDate, "MMMM d, yyyy")}
          </div>
        </div>

        <button 
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80"
          style={{color: "#b8956a"}}
          title="Next"
        >
          <ChevronRight size={28} />
        </button>

        {user?.email && (
          <div className="hidden lg:block absolute left-1/2 ml-[170px] text-sm font-medium" style={{color: "#8B7355", fontFamily: "'Playfair Display', serif"}}>
            {user.email}
          </div>
        )}
      </div>

      {/* Right: Sync Status */}
      <div className="flex items-center justify-end gap-3 min-w-[100px]">
        <div className="flex items-center gap-2 min-h-[44px]">
          <ShieldCheck 
            size={18} 
            style={{
              color: isSynced ? "#B8956A" : "#8B7355",
              animation: !isSynced ? "pulse 2s ease-in-out infinite" : "none"
            }} 
          />
          <span style={{fontSize: "12px", color: isSynced ? "#B8956A" : "#8B7355", fontWeight: "500"}}>
            {isSynced ? "Synced" : "Syncing..."}
          </span>
        </div>
      </div>
    </div>
  );
}