'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Navigation } from 'lucide-react';

interface AppLoadingSplashProps {
  onComplete?: () => void;
}

export const AppLoadingSplash: React.FC<AppLoadingSplashProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
              setIsVisible(false);
              if (onComplete) onComplete();
            }, 600);
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white transition-opacity duration-500 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Animated Radar Scanning Pulse Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[500px] h-[500px] rounded-full border-2 border-emerald-400 animate-ping duration-1000" />
        <div className="w-[350px] h-[350px] rounded-full border border-emerald-500 animate-pulse duration-700 absolute" />
      </div>

      <div className="relative z-10 text-center space-y-6 max-w-sm px-4">
        {/* Animated Brand Badge */}
        <div className="relative inline-block">
          <div className="p-5 bg-white rounded-3xl shadow-2xl shadow-emerald-500/20 border-2 border-emerald-400/60 transform hover:scale-105 transition-all">
            <img
              src="/idam-logo.png"
              alt="iDAM | இடம்"
              className="h-14 w-auto object-contain"
            />
          </div>
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
          </span>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            iDAM | <span className="text-emerald-400 font-tamil">இடம்</span> Smart Parking
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Connecting Madurai Drivers with Live Available Spaces
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs font-mono font-bold text-slate-400">
            <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Scanning live parking locations... ({progress}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
