'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Navigation } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface SplashScreenProps {
  lang: Language;
  onNext: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ lang, onNext }) => {
  const t = TRANSLATIONS[lang];
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + 20;
        if (next >= 100) {
          return 100;
        }
        return next;
      });
    }, 180);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (loadingProgress >= 100) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsReady(true);
    }
  }, [loadingProgress]);

  return (
    <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-900 text-white overflow-hidden relative select-none">
      
      {/* Background Animated Radar Pulse Circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-96 h-96 rounded-full border border-emerald-400/40 animate-ping duration-1000" />
        <div className="w-72 h-72 rounded-full border border-emerald-400/60 animate-pulse duration-700 absolute" />
        <div className="w-48 h-48 rounded-full border border-emerald-300/80 absolute" />
      </div>

      {/* Top Header Pill */}
      <div className="pt-4 z-10 flex justify-center">
        <div className="inline-flex items-center space-x-2 bg-emerald-900/60 backdrop-blur-md border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-extrabold text-emerald-300 shadow-lg animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Madurai Live Parking Network</span>
        </div>
      </div>

      {/* Center Brand Logo & Loading Animation */}
      <div className="my-auto z-10 space-y-6 text-center">
        <div className="relative mx-auto w-56 sm:w-64 rounded-3xl p-5 bg-white/95 backdrop-blur-xl shadow-2xl shadow-emerald-500/20 border-2 border-emerald-400/50 flex flex-col items-center justify-center transform hover:scale-105 transition-all duration-500">
          <img
            src="/idam-logo.png"
            alt="iDAM | இடம் Logo"
            className="w-full h-auto object-contain drop-shadow-md"
          />
          {/* Soft Live Beacon Dot */}
          <span className="absolute -top-2 -right-2 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-white"></span>
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-emerald-300 font-extrabold text-lg tracking-wide font-tamil">
            {t.sloganTamil}
          </p>
          <p className="text-xs text-slate-300 font-medium">
            Smart Parking Spot Discovery & Instant Reservations
          </p>
        </div>

        {/* Animated Loading Progress Bar */}
        <div className="max-w-xs mx-auto space-y-2 pt-2">
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-[11px] font-mono font-bold text-slate-400 flex items-center justify-center space-x-1.5">
            <Navigation className="w-3 h-3 text-emerald-400 animate-spin" />
            <span>
              {loadingProgress < 100
                ? `Scanning spaces near Meenakshi Temple (${loadingProgress}%)...`
                : 'Live Spots Available • Ready!'}
            </span>
          </p>
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div className="pb-4 z-10">
        <button
          onClick={onNext}
          className={`w-full font-extrabold py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-2 text-sm transition-all duration-300 ${
            isReady
              ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-slate-950 shadow-emerald-500/30 scale-102 hover:scale-105 active:scale-95'
              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
          }`}
        >
          <span>Explore Live Parking</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </button>
      </div>

    </div>
  );
};
