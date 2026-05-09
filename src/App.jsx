import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Planner from './pages/Planner.jsx';
import TodayWidget from './pages/TodayWidget.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Settings from './pages/Settings.jsx';
import GuidedTour from './components/GuidedTour.jsx';
import AppUpdateManager from './components/app/AppUpdateManager.jsx';
import PWAInstallPrompt from './components/app/PWAInstallPrompt.jsx';

const AuthenticatedApp = () => {
  const { user } = useAuth();
  
  if (user && user.onboarding_completed === false && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      <GuidedTour />
      <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/settings" element={<Settings />} />
      {/* All valid planner paths */}
      <Route path="/Planner" element={<Planner />} />
      <Route path="/today" element={<Planner />} />
      <Route path="/rituals" element={<Planner />} />
      <Route path="/weekly-review" element={<Planner />} />
      <Route path="/ideal-week" element={<Planner />} />
      <Route path="/goals" element={<Planner />} />
      <Route path="/journal" element={<Planner />} />
      <Route path="/meeting" element={<Planner />} />
      <Route path="/chat" element={<Planner />} />
      <Route path="/scratchpad" element={<Planner />} />
      <Route path="/today-widget" element={<TodayWidget />} />
      {/* Safety Fallback */}
      <Route path="*" element={<div className="h-screen w-screen bg-[#F4EFE4] flex items-center justify-center font-serif">Path Not Found</div>} />
    </Routes>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppUpdateManager />
      <PWAInstallPrompt />
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}