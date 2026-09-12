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
      
      {/* Top Brand Logo */}
      <div className="pt-8 text-center space-y-1 z-10">
        <div className="inline-flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-md">
            <MapPin className="w-5 h-5 fill-current" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-gray-900">iDAM</span>
        </div>
        <div className="text-sm font-bold text-emerald-800 font-tamil tracking-wider">
          இடம்
        </div>
      </div>

      {/* Center Temple Illustration */}
      <div className="my-auto z-10 space-y-4 text-center">
        <div className="relative mx-auto w-48 h-48 rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-amber-50 flex items-center justify-center">
          <img
            src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=500"
            alt="Madurai Meenakshi Temple"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-gray-900">Find your space.</h2>
          <p className="text-emerald-800 font-bold text-base font-tamil">
            {t.sloganTamil}
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
