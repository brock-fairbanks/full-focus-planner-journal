import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import Planner from './pages/Planner.jsx';
import PageNotFound from './lib/PageNotFound';

const AuthenticatedApp = () => {
  // Simple check: Is the URL one of our tabs? If so, show Planner.
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      
      {/* 🛠️ FORCE ALL VALID PATHS TO LOAD THE PLANNER */}
      <Route path="/Planner" element={<Planner />} />
      <Route path="/today" element={<Planner />} />
      <Route path="/rituals" element={<Planner />} />
      <Route path="/weekly-review" element={<Planner />} />
      <Route path="/ideal-week" element={<Planner />} />
      <Route path="/goals" element={<Planner />} />
      
      {/* This MUST have a background color or it will be black */}
      <Route path="*" element={<div className="h-screen w-screen bg-[#F4EFE4] flex items-center justify-center">Route Not Found</div>} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  );
}