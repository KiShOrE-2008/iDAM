'use client';

import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface SplashScreenProps {
  lang: Language;
  onNext: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ lang, onNext }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-b from-emerald-50/50 via-white to-emerald-100/40 text-gray-900 overflow-hidden relative">
      
      {/* Top Brand & Main Logo */}
      <div className="my-auto z-10 space-y-6 text-center">
        <div className="relative mx-auto w-56 sm:w-64 rounded-3xl p-4 bg-white shadow-xl border border-gray-100 flex items-center justify-center">
          <img
            src="/idam-logo.png"
            alt="iDAM | இடம் Logo"
            className="w-full h-auto object-contain"
          />
        </div>

        <div className="space-y-1">
          <p className="text-emerald-800 font-bold text-base font-tamil">
            {t.sloganTamil}
          </p>
          <p className="text-xs text-gray-500 font-semibold">
            Madurai Smart Parking Discovery & Reservation
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="pb-4 z-10">
        <button
          onClick={onNext}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl shadow-lg flex items-center justify-center space-x-2 text-sm transition-all"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
