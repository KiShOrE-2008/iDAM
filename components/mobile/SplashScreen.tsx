'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface SplashScreenProps {
  lang: Language;
  onNext: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ lang, onNext }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="h-full flex flex-col justify-between p-6 sm:p-8 bg-[#F8F8F5] text-slate-900 relative overflow-hidden select-none animate-fade-in">
      
      {/* Top Subtle Brand Tag */}
      <div className="pt-4 z-10 flex justify-center">
        <div className="inline-flex items-center space-x-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-black text-slate-800 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Madurai Smart Parking</span>
        </div>
      </div>

      {/* Center Warm Minimal iDAM Brand Hero */}
      <div className="my-auto z-10 space-y-6 text-center">
        <div className="relative mx-auto w-52 sm:w-60 rounded-3xl p-5 bg-white shadow-lg border border-slate-200/80 flex flex-col items-center justify-center transform hover:scale-102 transition-all">
          <img
            src="/idam-logo.png"
            alt="iDAM | இடம் Logo"
            className="w-full h-auto object-contain"
          />
        </div>

        <div className="space-y-2 max-w-xs mx-auto">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            iDAM <span className="text-emerald-700 font-tamil font-bold">இடம்</span>
          </h1>
          <p className="text-emerald-800 font-black text-base tracking-wide font-tamil">
            {t.sloganTamil || 'இடம் தேடு. நிறுத்து. போ.'}
          </p>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Find your space. Parking before you arrive.
          </p>
        </div>
      </div>

      {/* Bottom Action CTA */}
      <div className="pb-4 z-10">
        <button
          onClick={onNext}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-md flex items-center justify-center space-x-2 text-xs tracking-wide transition-all transform active:scale-98"
        >
          <span>Get started</span>
          <ArrowRight className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

    </div>
  );
};
