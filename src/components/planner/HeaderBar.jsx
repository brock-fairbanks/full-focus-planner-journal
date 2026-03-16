import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderBar({ selectedDate, onDateChange, isSynced, activeTemplate }) {
  const { user } = useAuth();
  
  return (
    <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between pr-8 pointer-events-auto z-50" style={{
      backgroundColor: "#5a3522",
      backgroundImage: "linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url('https://www.transparenttextures.com/patterns/leather.png')",
      borderBottom: "1px solid rgba(0,0,0,0.6)",
      boxShadow: "inset 0 -2px 10px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.5)"
    }}>
      {/* Left: Logo and Title */}
      <div className="flex items-center h-full min-w-[280px]">
        <div 
          className="flex items-center justify-center h-full shrink-0 ml-4 mr-3 w-64 relative overflow-hidden"
          style={{
            maskImage: "radial-gradient(ellipse 85% 75% at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 75% at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)"
          }}
        >
          <img 
            src="https://media.base44.com/images/public/69b75c76e85ef9b64b1a38bb/2603f02b5_unnamed1.jpg"
            alt="Fairbanks Builders"
            className="w-full h-full object-cover scale-[1.1]"
            style={{ 
              filter: "contrast(1.1) brightness(0.95)"
            }}
          />
        </div>
        <div className="flex flex-col z-10 justify-center">
          <span 
            className="text-[10px] uppercase tracking-widest font-bold leading-none mt-1"
            style={{
              color: "#9e2a2b",
              textShadow: "-1px -1px 1px rgba(0,0,0,0.8), 1px 1px 1px rgba(255,255,255,0.2)"
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
          style={{
            color: "rgba(0,0,0,0.5)",
            filter: "drop-shadow(-1px -1px 1px rgba(0,0,0,0.7)) drop-shadow(1px 1px 1px rgba(255,255,255,0.15))"
          }}
          title="Previous"
        >
          <ChevronLeft size={28} />
        </button>
        
        <div className="text-center min-w-[180px]">
          <div style={{
            fontFamily: "'Playfair Display', serif", 
            fontSize: "24px", 
            fontWeight: "600", 
            color: "rgba(0,0,0,0.6)", 
            letterSpacing: "0.5px",
            textShadow: "-1px -1px 1px rgba(0,0,0,0.8), 1px 1px 1px rgba(255,255,255,0.15)"
          }}>
            {format(selectedDate, "EEEE")}
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif", 
            fontSize: "18px", 
            fontWeight: "400", 
            color: "rgba(0,0,0,0.6)", 
            letterSpacing: "0.3px",
            textShadow: "-1px -1px 1px rgba(0,0,0,0.8), 1px 1px 1px rgba(255,255,255,0.15)"
          }}>
            {format(selectedDate, "MMMM d, yyyy")}
          </div>
        </div>

        <button 
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80"
          style={{
            color: "rgba(0,0,0,0.5)",
            filter: "drop-shadow(-1px -1px 1px rgba(0,0,0,0.7)) drop-shadow(1px 1px 1px rgba(255,255,255,0.15))"
          }}
          title="Next"
        >
          <ChevronRight size={28} />
        </button>

        {user?.email && (
          <div className="hidden lg:block absolute left-1/2 ml-[170px] text-sm font-medium" style={{
            color: "rgba(0,0,0,0.6)", 
            fontFamily: "'Playfair Display', serif",
            textShadow: "-1px -1px 1px rgba(0,0,0,0.8), 1px 1px 1px rgba(255,255,255,0.15)"
          }}>
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
              color: "rgba(0,0,0,0.5)",
              filter: "drop-shadow(-1px -1px 1px rgba(0,0,0,0.8)) drop-shadow(1px 1px 1px rgba(255,255,255,0.15))",
              animation: !isSynced ? "pulse 2s ease-in-out infinite" : "none"
            }} 
          />
          <span style={{
            fontSize: "12px", 
            color: "rgba(0,0,0,0.6)", 
            fontWeight: "500",
            textShadow: "-1px -1px 1px rgba(0,0,0,0.8), 1px 1px 1px rgba(255,255,255,0.15)"
          }}>
            {isSynced ? "Synced" : "Syncing..."}
          </span>
        </div>
      </div>
    </div>
  );
}