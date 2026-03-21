import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOUR_STEPS = [
  { 
    path: '/today', 
    selector: '#tour-sidebar',
    text: "Welcome to Planner! This is your main navigation. From here you can access your daily, weekly, and monthly views." 
  },
  { 
    path: '/today', 
    selector: '#tour-date-navigator',
    text: "Here is your date navigator. Swipe left/right or click the arrows to move between days." 
  },
  { 
    path: '/today', 
    selector: '#tour-tools',
    text: "Use these tools to draw, highlight, or erase. You can also change the pen thickness or highlighter color!" 
  },
  { 
    path: '/today', 
    selector: '#tour-canvas',
    text: "This is your Daily canvas. Try drawing something, or double-tap anywhere to type! Pro tip: While typing, press the Tab key to easily move to the next line." 
  },
  { 
    path: '/goals', 
    selector: '#tour-goals-grid',
    text: "Here is your Quarterly Goals view. Try adding a new goal for this quarter to see how it works!" 
  },
  { 
    path: '/meeting', 
    selector: '#tour-meeting-tools',
    text: "The Meeting spread! Record your meetings and let AI transcribe them. Try hitting the microphone button to test it out." 
  },
  { 
    path: '/journal', 
    selector: '#tour-journal-modes',
    text: "Reflect on your day in the Journal. Notice the secondary tabs here for Daily, Weekend, and Annual reflections." 
  },
  { 
    path: '/scratchpad', 
    selector: '#tour-scratchpad-tools',
    text: "Need a quick place to jot things down? The Scratchpad gives you infinite digital paper. Try changing the background pattern!" 
  }
];

export default function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTourActive = new URLSearchParams(location.search).get('tour') === 'true';
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState(null);

  const updateSpotlight = () => {
    if (!isTourActive) return;
    const step = TOUR_STEPS[currentStep];
    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Dynamic padding: tighter for the header/sidebar, normal for tools
        const pad = step.selector.includes('sidebar') || step.selector.includes('header') || step.selector.includes('navigator') ? 4 : 12;
        setSpotlightStyle({
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + (pad * 2),
          height: rect.height + (pad * 2),
          borderRadius: '12px'
        });
        return;
      }
    }
    setSpotlightStyle(null);
  };

  useEffect(() => {
    if (isTourActive) {
      if (location.pathname !== TOUR_STEPS[currentStep].path) {
        navigate(`${TOUR_STEPS[currentStep].path}?tour=true`, { replace: true });
      } else {
        const timeoutId = setTimeout(updateSpotlight, 300);
        return () => clearTimeout(timeoutId);
      }
    } else {
      setSpotlightStyle(null);
    }
  }, [isTourActive, currentStep, location.pathname, navigate]);

  useEffect(() => {
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [isTourActive, currentStep]);

  if (!isTourActive) return null;

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      endTour();
    }
  };

  const endTour = () => {
    setCurrentStep(0);
    setSpotlightStyle(null);
    navigate(location.pathname, { replace: true });
  };

  return (
    <>
      <AnimatePresence>
        {isTourActive && spotlightStyle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9998] pointer-events-none transition-all duration-500"
            style={{
              top: spotlightStyle.top,
              left: spotlightStyle.left,
              width: spotlightStyle.width,
              height: spotlightStyle.height,
              borderRadius: spotlightStyle.borderRadius,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 right-8 z-[9999] w-80 md:w-96 pointer-events-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
               <div 
                 className="h-full bg-[#F97316] transition-all duration-300" 
                 style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
               />
            </div>
            
            <button onClick={endTour} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors">
              <X size={18} />
            </button>
            
            <div className="flex items-start gap-4 mt-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="text-[#F97316]" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1e293b] mb-1">AI Guide</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {TOUR_STEPS[currentStep].text}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end mt-5">
              <Button onClick={nextStep} className="bg-[#1e293b] hover:bg-[#0f172a] text-white shadow-md rounded-full px-6">
                {currentStep === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next'} <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}