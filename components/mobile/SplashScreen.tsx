'use client';

import React from 'react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface SplashScreenProps {
  lang: Language;
  onNext: () => void;
  onLanguageToggle?: (lang: Language) => void;
}

/** Opens the app on a full-bleed parking sign: blue field, white inset border, இடம் where the P would be */
export const SplashScreen: React.FC<SplashScreenProps> = ({ lang, onNext, onLanguageToggle }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="h-full bg-brand-700 p-3 select-none animate-fade-in">
      <div className="h-full border-[3px] border-white rounded-xl flex flex-col text-white px-6 pt-5 pb-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-black tracking-tight">iDAM</span>
          {onLanguageToggle && (
            <button
              type="button"
              onClick={() => onLanguageToggle(lang === 'en' ? 'ta' : 'en')}
              className={`border border-white/60 rounded-md px-3 py-1.5 text-sm font-bold active:bg-white/10 cursor-pointer ${lang === 'en' ? 'font-tamil' : ''}`}
            >
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
          )}
        </div>

        <div className="my-auto">
          <h1 className="font-tamil font-extrabold text-[6.4rem] leading-[0.9] tracking-tight -ml-1">இடம்</h1>
          <p className="font-tamil text-xl font-semibold mt-6 text-amber-300">{t.sloganTamil}</p>
          <p className="text-lg text-white/85 mt-3 leading-snug max-w-[17rem]">
            Find a space in Madurai and book it before you leave home.
          </p>
        </div>

        <button
          onClick={onNext}
          className={`w-full bg-paint active:bg-amber-400 text-ink font-black py-4 rounded-lg text-base cursor-pointer ${lang === 'ta' ? 'font-tamil' : ''}`}
        >
          {lang === 'ta' ? 'தொடங்குங்கள்' : 'Get started'}
        </button>
      </div>
    </div>
  );
};
