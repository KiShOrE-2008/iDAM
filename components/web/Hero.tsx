'use client';

import React, { useState } from 'react';
import { Search, MapPin, Calendar, CreditCard, ShieldCheck, ArrowRight, Building2, Sparkles } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface HeroProps {
  lang: Language;
  onSearch: (query: string) => void;
  onOpenOwnerModal: () => void;
}

export const Hero: React.FC<HeroProps> = ({ lang, onSearch, onOpenOwnerModal }) => {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-gray-50/50 pt-8 pb-16 lg:pt-12 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid: Left Copy + Right Art */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-8 z-10">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center space-x-2 bg-emerald-100/80 border border-emerald-200/80 text-emerald-900 px-4 py-1.5 rounded-full text-xs font-semibold shadow-xs">
              <span className="text-base">🌱</span>
              <span>{t.tagline}</span>
            </div>

            {/* Headings */}
            <div className="space-y-3">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.08]">
                {t.heroHeading}
              </h1>
              <h2 className="text-2xl sm:text-3xl font-bold text-emerald-800 font-tamil tracking-wide">
                {t.sloganTamil}
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed max-w-xl font-normal pt-2">
                {t.heroSubHeading}
              </p>
            </div>

            {/* Quick Search & Owner Actions */}
            <form onSubmit={handleSearchSubmit} className="space-y-4 max-w-lg">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full flex-1">
                  <Search className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm text-gray-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-emerald-950 hover:bg-emerald-900 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.02] active:scale-98 whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  <span>{t.searchBtn}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="flex items-center space-x-4 pt-1">
                <button
                  type="button"
                  onClick={onOpenOwnerModal}
                  className="flex items-center space-x-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-2xs"
                >
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>{t.listSpaceBtn}</span>
                </button>
                <span className="text-xs text-gray-500 hidden sm:inline">
                  ⚡ Monetize your parking spot in minutes
                </span>
              </div>
            </form>

            {/* 4 Process Icons Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{t.stepSearchTitle}</h4>
                  <p className="text-[11px] text-gray-500">{t.stepSearchDesc}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{t.stepReserveTitle}</h4>
                  <p className="text-[11px] text-gray-500">{t.stepReserveDesc}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{t.stepPayTitle}</h4>
                  <p className="text-[11px] text-gray-500">{t.stepPayDesc}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{t.stepParkTitle}</h4>
                  <p className="text-[11px] text-gray-500">{t.stepParkDesc}</p>
                </div>
              </div>
            </div>

            {/* Key Statistics Row */}
            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-100">
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{t.statSpaces}</div>
                <div className="text-xs text-gray-500">{t.statSpacesLabel}</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{t.statDrivers}</div>
                <div className="text-xs text-gray-500">{t.statDriversLabel}</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-gray-900">{t.statPartners}</div>
                <div className="text-xs text-gray-500">{t.statPartnersLabel}</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-700">{t.statGreen}</div>
                <div className="text-xs text-gray-500">{t.statGreenLabel}</div>
              </div>
            </div>

          </div>

          {/* Right Hero Illustration Backdrop */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-tr from-amber-50/50 via-emerald-50/30 to-blue-50/50 border border-emerald-100 p-4 sm:p-6">
              
              {/* Art Canvas Container */}
              <div className="relative rounded-2xl overflow-hidden bg-emerald-900/10 min-h-[380px] sm:min-h-[440px] flex flex-col justify-between p-6">
                
                {/* Background Temple Backdrop Image */}
                <div className="absolute inset-0 z-0">
                  <img
                    src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=1200"
                    alt="Madurai Meenakshi Temple Architecture"
                    className="w-full h-full object-cover opacity-90 filter brightness-95 contrast-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-900/30 to-transparent" />
                </div>

                {/* Top Badge Overlay */}
                <div className="relative z-10 flex justify-between items-start">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/40">
                    <span className="text-xs font-serif font-bold italic text-emerald-900">
                      &quot;A Better City Finds Space&quot;
                    </span>
                  </div>

                  <div className="bg-emerald-800/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-xs flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Madurai Inventory</span>
                  </div>
                </div>

                {/* Center Madurai Signboard Art */}
                <div className="relative z-10 my-auto text-center py-6">
                  <div className="inline-block bg-amber-50/90 backdrop-blur-md border-2 border-amber-800/30 p-5 rounded-2xl shadow-xl transform -rotate-1 hover:rotate-0 transition-transform">
                    <h3 className="font-serif text-amber-950 font-bold tracking-wider text-xl sm:text-2xl uppercase">
                      Madurai
                    </h3>
                    <p className="font-sans font-extrabold text-emerald-800 text-sm tracking-widest uppercase">
                      PARKS BETTER TOGETHER
                    </p>
                  </div>
                </div>

                {/* Bottom Floating Parking Spot Card */}
                <div className="relative z-10">
                  <a
                    href="#explore"
                    className="flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-white/60 hover:bg-white transition-all transform hover:-translate-y-1"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative bg-emerald-100">
                        <img
                          src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=200"
                          alt="Meenakshi Temple Parking"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          Reserve. Park. Explore Madurai.
                        </div>
                        <div className="font-bold text-gray-900 text-sm sm:text-base">
                          Meenakshi Temple Area
                        </div>
                        <div className="text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                          <span>📍 2 min away</span>
                          <span>•</span>
                          <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded">₹30/hr</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-full bg-emerald-950 text-white flex items-center justify-center shrink-0 ml-2">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </a>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
