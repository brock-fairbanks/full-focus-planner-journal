import React from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { format, addDays } from "date-fns";
import { useAuth } from "@/lib/AuthContext";

export default function HeaderBar({ selectedDate, onDateChange, isSynced, activeTemplate }) {
  const { user } = useAuth();
  
  return (
    <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between pr-8 pointer-events-auto z-50" style={{
      backgroundColor: "#111",
      backgroundImage: "url('https://www.transparenttextures.com/patterns/black-leather.png')",
      borderBottom: "1px dashed rgba(255,255,255,0.15)",
      boxShadow: "inset 0 -2px 10px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.5)"
    }}>
      {/* Left: Logo and Title */}
      <div className="flex items-center h-full min-w-[280px]">
        <div 
          className="flex items-center justify-center h-full shrink-0 ml-4 mr-3 w-56 relative overflow-hidden"
          style={{
            maskImage: "radial-gradient(ellipse 90% 90% at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 90% at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)"
          }}
        >
          <img 
            src="https://media.base44.com/images/public/69b75c76e85ef9b64b1a38bb/ff31a883f_unnamed2.jpg"
            alt="Fairbanks Builders"
            className="w-full h-full object-cover scale-[1.2]"
            style={{ 
              mixBlendMode: "screen",
              filter: "contrast(1.2) brightness(1.1)"
            }}
          />
        </div>
        <div className="flex flex-col z-10 justify-center">
          <span 
            className="text-[10px] uppercase tracking-widest font-bold leading-none mt-1"
            style={{
              color: "#555",
              textShadow: "-1px -1px 2px rgba(0,0,0,1), 1px 1px 1px rgba(255,255,255,0.3)"
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
            color: "#555",
            filter: "drop-shadow(-1px -1px 2px rgba(0,0,0,1)) drop-shadow(1px 1px 1px rgba(255,255,255,0.3))"
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
            color: "#555", 
            letterSpacing: "0.5px",
            textShadow: "-1px -1px 2px rgba(0,0,0,1), 1px 1px 1px rgba(255,255,255,0.3)"
          }}>
            {format(selectedDate, "EEEE")}
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif", 
            fontSize: "18px", 
            fontWeight: "400", 
            color: "#555", 
            letterSpacing: "0.3px",
            textShadow: "-1px -1px 2px rgba(0,0,0,1), 1px 1px 1px rgba(255,255,255,0.3)"
          }}>
            {format(selectedDate, "MMMM d, yyyy")}
          </div>
        </div>

        <button 
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-80"
          style={{
            color: "#555",
            filter: "drop-shadow(-1px -1px 2px rgba(0,0,0,1)) drop-shadow(1px 1px 1px rgba(255,255,255,0.3))"
          }}
          title="Next"
        >
          <ChevronRight size={28} />
        </button>

        {user?.email && (
          <div className="hidden lg:block absolute left-1/2 ml-[170px] text-sm font-medium" style={{
            color: "#555", 
            fontFamily: "'Playfair Display', serif",
            textShadow: "-1px -1px 2px rgba(0,0,0,1), 1px 1px 1px rgba(255,255,255,0.3)"
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
              color: "#555",
              filter: "drop-shadow(-1px -1px 2px rgba(0,0,0,1)) drop-shadow(1px 1px 1px rgba(255,255,255,0.3))",
              animation: !isSynced ? "pulse 2s ease-in-out infinite" : "none"
            }} 
          />
          <span style={{
            fontSize: "12px", 
            color: "#555", 
            fontWeight: "500",
            textShadow: "-1px -1px 2px rgba(0,0,0,1), 1px 1px 1px rgba(255,255,255,0.3)"
          }}>
            {isSynced ? "Synced" : "Syncing..."}
          </span>
        </div>
      </div>
    </div>
  );
}