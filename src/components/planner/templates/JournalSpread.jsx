import React, { useState, useEffect } from "react";
import { Trash2, MapPin, CloudSun, History, Compass, Sparkles, Mail } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";

export default function JournalSpread({ date, onSubSectionChange, onClearCanvas, journalMode = "DAILY" }) {
  const currentDate = date || new Date();
  
  const [currentLocationName, setCurrentLocationName] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState("");
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  useEffect(() => {
    const detectLocation = async () => {
      setIsLocating(true);
      try {
        const locs = await base44.entities.Location.list();
        
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            
            setIsWeatherLoading(true);
            base44.functions.invoke('getWeather', { lat: latitude, lon: longitude })
              .then(res => {
                 if (res.data && res.data.weather && res.data.weather.current) {
                    const temp = res.data.weather.current.temperature_2m;
                    const desc = res.data.weather.current.weather_description;
                    setWeatherInfo(`${Math.round(temp)}°F • ${desc}`);
                 }
              })
              .catch(err => {
                 console.error("Weather fetch error:", err);
                 setWeatherInfo("Unavailable");
              })
              .finally(() => setIsWeatherLoading(false));

            let matchedName = "";
            let minDistance = Infinity;

            for (const loc of locs) {
              if (!loc.address) continue;
              
              try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc.address)}`);
                const data = await res.json();
                if (data && data.length > 0) {
                  const locLat = parseFloat(data[0].lat);
                  const locLon = parseFloat(data[0].lon);
                  
                  const R = 6371e3;
                  const phi1 = latitude * Math.PI/180;
                  const phi2 = locLat * Math.PI/180;
                  const dPhi = (locLat-latitude) * Math.PI/180;
                  const dLam = (locLon-longitude) * Math.PI/180;

                  const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
                            Math.cos(phi1) * Math.cos(phi2) *
                            Math.sin(dLam/2) * Math.sin(dLam/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  const d = R * c;

                  // 500 meters threshold
                  if (d < 500 && d < minDistance) {
                    minDistance = d;
                    matchedName = loc.name;
                  }
                }
                // Be nice to Nominatim AUP
                await new Promise(r => setTimeout(r, 1000));
              } catch (e) {
                console.error(e);
              }
            }
            
            if (matchedName) {
              setCurrentLocationName(matchedName);
            } else {
               const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
               const revData = await revRes.json();
               if (revData && revData.address) {
                 const city = revData.address.city || revData.address.town || revData.address.village || revData.address.county || "";
                 setCurrentLocationName(city);
               }
            }
            setIsLocating(false);
          }, (error) => {
            console.error("Geolocation error:", error);
            setIsLocating(false);
          });
        } else {
          setIsLocating(false);
        }
      } catch (err) {
        console.error(err);
        setIsLocating(false);
      }
    };
    
    detectLocation();
  }, []);

  const layoutMode = journalMode;

  const LAYOUT_TABS = {
    DAILY: ["The Story", "Processing", "Gratitude", "Insights"],
    WEEKEND: ["Life Balance", "Relationships", "Rejuvenation"],
    ANNUAL: ["Year in Review", "The Life Compass", "The Big Vision", "Letter to Self"]
  };

  const [activeSubSection, setActiveSubSection] = useState(LAYOUT_TABS["DAILY"][0]);

  useEffect(() => {
    setActiveSubSection(LAYOUT_TABS[layoutMode][0]);
  }, [layoutMode]);

  useEffect(() => {
    if (onSubSectionChange) {
      onSubSectionChange(`${layoutMode}_${activeSubSection}`);
    }
  }, [activeSubSection, layoutMode, onSubSectionChange]);

  const getTabIcon = (tab) => {
    if (tab === "Year in Review") return <History size={16} className="mr-2 inline" />;
    if (tab === "The Life Compass") return <Compass size={16} className="mr-2 inline" />;
    if (tab === "The Big Vision") return <Sparkles size={16} className="mr-2 inline" />;
    if (tab === "Letter to Self") return <Mail size={16} className="mr-2 inline" />;
    return null;
  };

  const renderCompass = () => {
    const domains = ['Spiritual', 'Intellectual', 'Emotional', 'Physical', 'Marital', 'Parental', 'Social', 'Vocational', 'Financial', 'Avocational'];
    return (
      <div className="mt-2 h-full flex flex-col pointer-events-auto">
        <h2 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>The Life Compass</h2>
        <div className="flex flex-col gap-12 pb-20">
          {domains.map(domain => (
            <div key={domain} className="flex flex-col">
              <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                <h3 className="text-2xl font-serif italic" style={{ color: "#1e293b" }}>{domain}</h3>
                <div className="flex gap-1 md:gap-2">
                   {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <div key={n} className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-[#94a3b8] flex items-center justify-center text-xs text-[#94a3b8]">{n}</div>
                   ))}
                </div>
              </div>
              <p className="text-[#64748b] font-serif italic mb-4">What is the current state of this domain, and where do I want it to be?</p>
              <div
                className="w-full min-h-[250px]"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 38px, #cbd5e1 40px)`,
                  backgroundSize: "100% 40px",
                  backgroundPosition: "0 0",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSection = (title, prompts) => (
    <div className="mt-2 h-full flex flex-col">
      <h2 className="text-4xl font-serif font-bold mb-8" style={{ color: "#1e293b" }}>
        {title}
      </h2>
      <div className="flex-1 flex flex-col gap-8">
        {prompts.map((prompt, idx) => (
          <div key={idx} className="flex-1 flex flex-col min-h-[300px]">
            <h3 className="text-2xl font-serif italic mb-4" style={{ color: "#1e293b" }}>
              {prompt}
            </h3>
            <div
              className="flex-1 w-full"
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 38px, #cbd5e1 40px)`,
                backgroundSize: "100% 40px",
                backgroundPosition: "0 0",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full min-h-full bg-[#FAF9F6]">
      {/* Secondary Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E2E8F0] px-12 h-[72px] shrink-0 bg-[#FAF9F6]">
        <div className="flex gap-4 items-center">
          {LAYOUT_TABS[layoutMode].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubSection(tab)}
              className={`text-base font-serif font-bold transition-all px-4 py-2 rounded-lg select-none shadow-sm flex items-center ${
                activeSubSection === tab 
                  ? "bg-[#1e293b] text-white border border-[#1e293b]" 
                  : "bg-white text-[#94a3b8] border border-[#E2E8F0] hover:bg-[#f8fafc] hover:text-[#1e293b]"
              }`}
            >
              {layoutMode === "ANNUAL" && getTabIcon(tab)}
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center ml-4">
          <button 
            onClick={onClearCanvas}
            className="flex items-center gap-1.5 text-sm font-medium text-[#94a3b8] hover:text-red-500 transition-colors bg-white border border-[#E2E8F0] px-3 py-2 rounded-lg hover:bg-red-50 shadow-sm"
            title="Clear entire page"
          >
            <Trash2 size={16} />
            <span className="inline">Clear Page</span>
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="px-12 py-6 flex flex-wrap gap-8 items-center border-b border-[#E2E8F0]">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase text-[#94a3b8] tracking-wider mb-1">Date</span>
          <span className="font-serif text-xl text-[#1e293b]">{format(currentDate, 'EEEE, MM/dd/yyyy')}</span>
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <span className="text-xs font-bold uppercase text-[#94a3b8] tracking-wider mb-1 flex items-center gap-1"><MapPin size={12}/> Location</span>
          <div className="border-b-2 border-[#cbd5e1] h-7 w-full max-w-[300px] flex items-end pb-1 text-[#334155] font-serif italic text-lg leading-none">
            {isLocating ? <span className="text-sm text-[#94a3b8] animate-pulse not-italic font-sans">Locating...</span> : currentLocationName}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase text-[#94a3b8] tracking-wider mb-1 flex items-center gap-1"><CloudSun size={12}/> Weather</span>
          <div className="border-b-2 border-[#cbd5e1] h-7 min-w-32 flex items-end pb-1 text-[#334155] font-serif italic text-lg leading-none whitespace-nowrap pr-4">
            {isWeatherLoading ? <span className="text-sm text-[#94a3b8] animate-pulse not-italic font-sans">Loading...</span> : weatherInfo}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-10 flex justify-center">
        <div className="w-full max-w-4xl h-full pb-32">
          {layoutMode === "DAILY" && activeSubSection === "The Story" && renderSection("The Story", ["What happened today?"])}
          {layoutMode === "DAILY" && activeSubSection === "Processing" && renderSection("Processing", ["What were my wins?", "What were my losses/lessons?"])}
          {layoutMode === "DAILY" && activeSubSection === "Gratitude" && renderSection("Gratitude", ["What am I grateful for?", "What am I excited about?"])}
          {layoutMode === "DAILY" && activeSubSection === "Insights" && renderSection("Insights", ["What did I learn?", "Where did I see meaning/connection?", "What is one thing I want to remember?"])}

          {layoutMode === "WEEKEND" && activeSubSection === "Life Balance" && renderSection("Life Balance", ["How is my sleep, movement, and nutrition?"])}
          {layoutMode === "WEEKEND" && activeSubSection === "Relationships" && renderSection("Relationships", ["Who did I connect with this weekend?"])}
          {layoutMode === "WEEKEND" && activeSubSection === "Rejuvenation" && renderSection("Rejuvenation", ["What did I do to refuel my tank?"])}

          {layoutMode === "ANNUAL" && activeSubSection === "Year in Review" && renderSection("Year in Review", ["What were my 10 biggest wins?", "What were my 10 biggest lessons?", "What did I not achieve that I wanted to?"])}
          {layoutMode === "ANNUAL" && activeSubSection === "The Life Compass" && renderCompass()}
          {layoutMode === "ANNUAL" && activeSubSection === "The Big Vision" && renderSection("The Big Vision", ["What is my overarching theme for this year?", "If this year were a movie, what would the title be and what happens in the final scene?"])}
          {layoutMode === "ANNUAL" && activeSubSection === "Letter to Self" && renderSection("Letter to Self", ["Write a letter to your future self to be read at the end of this year."])}
        </div>
      </div>
    </div>
  );
}