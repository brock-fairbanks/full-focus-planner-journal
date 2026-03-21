import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOUR_STEPS = [
  { path: '/today', text: "Welcome to Planner! This is your Daily canvas. Try drawing something right now with your stylus or mouse, or double-tap anywhere to type!" },
  { path: '/goals', text: "Here is your Quarterly Goals view. Try adding a new goal for this quarter to see how it works!" },
  { path: '/meeting', text: "The Meeting spread! Record your meetings and let AI transcribe them. Try hitting the microphone button to test it out." },
  { path: '/journal', text: "Reflect on your day in the Journal. Go ahead and try writing a quick thought for today." },
  { path: '/scratchpad', text: "Need a quick place to jot things down? The Scratchpad gives you infinite digital paper. Try changing the background pattern!" },
];

export default function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTourActive = new URLSearchParams(location.search).get('tour') === 'true';
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isTourActive) {
      // Auto-navigate if the current path doesn't match the step path
      if (location.pathname !== TOUR_STEPS[currentStep].path) {
        navigate(`${TOUR_STEPS[currentStep].path}?tour=true`, { replace: true });
      }
    }
  }, [isTourActive, currentStep, location.pathname, navigate]);

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
    navigate(location.pathname, { replace: true }); // Remove ?tour=true
  };

  return (
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
  );
}