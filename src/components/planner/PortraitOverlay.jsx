import React, { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function PortraitOverlay() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-white">
      <RotateCcw className="w-20 h-20 text-gray-400 animate-pulse" />
      <p className="text-gray-700 text-2xl font-semibold tracking-wide text-center px-8">
        Please rotate your device to landscape
      </p>
      <p className="text-gray-500 text-sm">
        Executive OS is designed for landscape mode
      </p>
    </div>
  );
}