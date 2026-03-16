import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Compass } from "lucide-react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderBar({ selectedDate, onDateChange, isSynced, activeTemplate }) {
  const { user } = useAuth();
  
  return (
    <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between pr-8 pointer-events-auto z-50 border-b shadow-md" style={{background: "#1A120B", borderColor: "#3e2d1d"}}>
      {/* Left: Logo and Title */}
      <div className="flex items-center h-full min-w-[280px]">
        <div className="flex items-center justify-center w-56 h-full shrink-0 relative overflow-hidden" style={{
           maskImage: "linear-gradient(to right, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)",
           WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)"
        }}>
          <img 
            src="https://media.base44.com/images/public/69b75c76e85ef9b64b1a38bb/8fdb2cd49_Gemini_Generated_Image_u8sxr4u8sxr4u8sx1920x1080.png" 
            alt="Fairbanks Builders" 
            className="absolute w-[180%] h-[300%] object-cover object-center max-w-none"
            style={{ 
              mixBlendMode: "screen",
              filter: "contrast(1.3) brightness(0.9) saturate(1.2)"
            }}
          />
        </div>
        <div className="flex flex-col ml-[-20px] z-10">
          <span className="text-[#f5deb3] font-serif font-bold text-lg leading-tight tracking-wide whitespace-nowrap drop-shadow-md">
            Fairbanks Builders
          </span>
          <span 
            className="text-[10px] uppercase tracking-widest font-bold leading-none"
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