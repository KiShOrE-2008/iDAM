'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Language, ParkingLocation } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

interface HeroProps {
  lang: Language;
  onSearch: (query: string) => void;
  onOpenOwnerModal: () => void;
  /** Live locations to paint into the bay plan; falls back to sample data */
  locations?: ParkingLocation[];
  /** Called when a bay in the plan is chosen */
  onPickLocation?: (loc: ParkingLocation) => void;
}

const COPY = {
  en: {
    heading: ['Park before', 'you arrive.'],
    sub: 'Book a space near Meenakshi Temple, the Masi streets or the bus stands. Pay with UPI and show your QR pass at the gate.',
    placeholder: 'Where are you going?',
    popular: 'Often searched',
    planTitle: 'Around Meenakshi Temple, right now',
    planHint: 'Each bay is a parking place. Pick one to book.',
    free: 'free',
    full: 'Full',
    owner: 'Have an empty driveway or plot?',
    ownerCta: 'List your space',
  },
  ta: {
    heading: ['வருவதற்கு முன்பே', 'இடம் பிடியுங்கள்.'],
    sub: 'மீனாட்சி அம்மன் கோவில், மாசி வீதிகள், பேருந்து நிலையங்கள் அருகே இடம் முன்பதிவு செய்யுங்கள். UPI மூலம் செலுத்தி, வாயிலில் QR பாஸைக் காட்டுங்கள்.',
    placeholder: 'எங்கே செல்கிறீர்கள்?',
    popular: 'அடிக்கடி தேடப்படுபவை',
    planTitle: 'மீனாட்சி கோவில் அருகே, இப்போது',
    planHint: 'ஒவ்வொரு கட்டமும் ஒரு பார்க்கிங் இடம். முன்பதிவு செய்ய ஒன்றைத் தேர்ந்தெடுங்கள்.',
    free: 'காலி',
    full: 'நிரம்பியது',
    owner: 'காலியான இடம் உள்ளதா?',
    ownerCta: 'உங்கள் இடத்தைப் பட்டியலிடுங்கள்',
  },
};

const POPULAR = ['Meenakshi Temple', 'Periyar Bus Stand', 'Mattuthavani', 'Thirumalai Nayakkar Mahal'];

const Bay: React.FC<{
  loc: ParkingLocation;
  lang: Language;
  flipped?: boolean;
  delay: number;
  onPick?: (loc: ParkingLocation) => void;
}> = ({ loc, lang, flipped, delay, onPick }) => {
  const c = COPY[lang];
  const isFull = loc.availableSpots <= 0;
  const name = lang === 'ta' && loc.titleTa ? loc.titleTa : loc.title;
  return (
    <button
      type="button"
      onClick={() => onPick?.(loc)}
      className={`group relative flex-1 min-w-0 h-full px-2.5 sm:px-3 text-left cursor-pointer focus-visible:outline-offset-[-4px] ${
        flipped ? 'flex flex-col justify-end pb-3' : 'flex flex-col justify-start pt-3'
      }`}
    >
      {/* Painted bay line on the right edge */}
      <span
        aria-hidden
        className={`absolute right-0 w-[3px] bg-paint ${flipped ? 'bottom-0 origin-bottom' : 'top-0 origin-top'} h-full motion-safe:animate-[paintIn_0.5s_ease-out_both]`}
        style={{ animationDelay: `${delay}ms` }}
      />
      <span className="absolute inset-1 rounded-sm transition-colors group-hover:bg-white/[0.06] group-focus-visible:bg-white/[0.06]" aria-hidden />
      <span className={`relative block tabular leading-none ${isFull ? 'text-rose-400' : 'text-white'}`}>
        {isFull ? (
          <span className="text-lg sm:text-xl font-black">{c.full}</span>
        ) : (
          <>
            <span className="text-3xl sm:text-[2.6rem] font-black">{loc.availableSpots}</span>
            <span className={`ml-1 text-xs sm:text-sm font-semibold text-white/60 ${lang === 'ta' ? 'font-tamil' : ''}`}>{c.free}</span>
          </>
        )}
      </span>
      <span className={`relative block mt-2 text-[13px] sm:text-sm font-semibold text-white/90 leading-snug line-clamp-2 ${lang === 'ta' ? 'font-tamil' : ''}`}>
        {name}
      </span>
      <span className="relative block mt-1 text-xs sm:text-[13px] text-amber-300 font-bold tabular">
        ₹{loc.hourlyRateCar}/hr
      </span>
    </button>
  );
};

export const Hero: React.FC<HeroProps> = ({ lang, onSearch, onOpenOwnerModal, locations, onPickLocation }) => {
  const t = TRANSLATIONS[lang];
  const c = COPY[lang];
  const [searchQuery, setSearchQuery] = useState('');

  const bays = (locations && locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS).slice(0, 6);
  const top = bays.slice(0, 3);
  const bottom = bays.slice(3, 6);
  // Keep the painted grid at three bays per row even with fewer locations
  const emptyBays = (row: ParkingLocation[]) =>
    Array.from({ length: Math.max(0, 3 - row.length) }, (_, i) => (
      <span key={`empty-${i}`} className="relative flex-1 h-full" aria-hidden>
        <span className="absolute right-0 top-0 h-full w-[3px] bg-paint" />
      </span>
    ));

  const submit = (q: string) => {
    onSearch(q);
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(searchQuery);
  };

  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-5">
          <h1
            className={`text-ink font-black tracking-[-0.02em] leading-[0.98] ${
              lang === 'ta' ? 'font-tamil text-[2.6rem] sm:text-5xl leading-[1.1]' : 'text-[3.2rem] sm:text-[4.2rem] xl:text-[4.8rem]'
            }`}
          >
            {c.heading[0]}
            <br />
            {c.heading[1]}
          </h1>
          <p className="font-tamil text-xl sm:text-2xl font-semibold text-brand-700 mt-4">{t.sloganTamil}</p>
          <p className={`text-slate-600 text-lg leading-relaxed mt-5 max-w-[34rem] ${lang === 'ta' ? 'font-tamil' : ''}`}>
            {c.sub}
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-[34rem]" role="search">
            <label htmlFor="hero-search" className="sr-only">
              {c.placeholder}
            </label>
            <div className="flex items-stretch bg-white border-2 border-ink rounded-lg overflow-hidden focus-within:ring-4 focus-within:ring-amber-300/60">
              <Search className="w-5 h-5 text-slate-500 self-center ml-4 shrink-0" aria-hidden />
              <input
                id="hero-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={c.placeholder}
                className={`flex-1 min-w-0 px-3 py-3.5 text-base text-ink placeholder:text-slate-400 bg-transparent focus:outline-none ${lang === 'ta' ? 'font-tamil' : ''}`}
              />
              <button
                type="submit"
                className={`bg-ink hover:bg-slate-800 text-white px-5 sm:px-6 text-[15px] font-bold whitespace-nowrap cursor-pointer ${lang === 'ta' ? 'font-tamil' : ''}`}
              >
                {t.searchBtn}
              </button>
            </div>
          </form>

          <div className="mt-4 text-sm text-slate-600 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className={`text-slate-500 ${lang === 'ta' ? 'font-tamil' : ''}`}>{c.popular}:</span>
            {POPULAR.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setSearchQuery(p);
                  submit(p);
                }}
                className="font-semibold text-ink underline decoration-slate-300 underline-offset-4 hover:decoration-paint cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Plan view of a parking lot; each bay is a live location */}
        <div className="lg:col-span-7">
          <div className="asphalt rounded-xl overflow-hidden text-white shadow-2xl">
            <div className="flex items-baseline justify-between gap-4 px-4 sm:px-5 pt-4">
              <h2 className={`text-[15px] font-bold ${lang === 'ta' ? 'font-tamil' : ''}`}>{c.planTitle}</h2>
              <span className="flex items-center gap-1.5 text-xs text-white/60 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-go-500" aria-hidden />
                Live
              </span>
            </div>

            <div className="mt-3 border-t-[3px] border-paint">
              <div className="flex h-[150px] sm:h-[170px] border-l-[3px] border-paint">
                {top.map((loc, i) => (
                  <Bay key={loc.id} loc={loc} lang={lang} delay={120 + i * 90} onPick={onPickLocation} />
                ))}
                {emptyBays(top)}
              </div>
            </div>

            {/* Driving lane */}
            <div className="relative h-16 sm:h-20 flex items-center px-4 sm:px-5" aria-hidden>
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.75)_0_26px,transparent_26px_48px)]" />
              <svg viewBox="0 0 60 20" className="relative w-12 h-4 ml-auto mr-[12%] text-white/80">
                <path d="M0 10h44M36 2l12 8-12 8" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="border-b-[3px] border-paint">
              <div className="flex h-[150px] sm:h-[170px] border-l-[3px] border-paint">
                {bottom.map((loc, i) => (
                  <Bay key={loc.id} loc={loc} lang={lang} flipped delay={390 + i * 90} onPick={onPickLocation} />
                ))}
                {emptyBays(bottom)}
              </div>
            </div>

            <p className={`px-4 sm:px-5 py-3 text-[13px] text-white/60 ${lang === 'ta' ? 'font-tamil' : ''}`}>{c.planHint}</p>
          </div>

          <p className={`mt-4 text-sm text-slate-600 ${lang === 'ta' ? 'font-tamil' : ''}`}>
            {c.owner}{' '}
            <button
              type="button"
              onClick={onOpenOwnerModal}
              className="font-bold text-brand-700 underline underline-offset-4 decoration-brand-200 hover:decoration-brand-700 cursor-pointer"
            >
              {c.ownerCta}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};
