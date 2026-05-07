import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If it's already installed, we might get an appinstalled event
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[100] p-4 bg-white border-2 border-orange-200 shadow-2xl rounded-2xl flex items-center gap-4 w-[90%] md:w-auto max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex-1 flex flex-col">
        <span className="font-bold text-slate-800 text-sm">Install Planner App</span>
        <span className="text-xs text-slate-500 leading-tight mt-0.5">Install for a faster, app-like experience</span>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleInstallClick} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm font-bold h-8">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Install
        </Button>
        <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}