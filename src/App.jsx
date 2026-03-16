import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import Planner from './pages/Planner.jsx';

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      {/* All valid planner paths */}
      <Route path="/Planner" element={<Planner />} />
      <Route path="/today" element={<Planner />} />
      <Route path="/rituals" element={<Planner />} />
      <Route path="/weekly-review" element={<Planner />} />
      <Route path="/ideal-week" element={<Planner />} />
      <Route path="/goals" element={<Planner />} />
      <Route path="/journal" element={<Planner />} />
      <Route path="/meeting" element={<Planner />} />
      {/* Safety Fallback */}
      <Route path="*" element={<div className="h-screen w-screen bg-[#F4EFE4] flex items-center justify-center font-serif">Path Not Found</div>} />
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