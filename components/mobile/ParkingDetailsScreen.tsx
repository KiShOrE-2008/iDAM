'use client';

import React, { useState } from 'react';
import { ArrowLeft, Heart, Star, MapPin, Clock, ShieldCheck } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';

interface ParkingDetailsScreenProps {
  location: ParkingLocation;
  onBack: () => void;
  onNext: () => void;
  lang: Language;
}

type Spot = { id: string; taken: boolean; note?: string };

const ROW_A: Spot[] = [
  { id: 'A-01', taken: false },
  { id: 'A-02', taken: false, note: 'EV' },
  { id: 'A-03', taken: true },
  { id: 'A-04', taken: false },
];
const ROW_B: Spot[] = [
  { id: 'B-01', taken: false, note: 'Accessible' },
  { id: 'B-02', taken: true },
  { id: 'B-03', taken: false, note: 'Valet' },
  { id: 'B-04', taken: false },
];

export const ParkingDetailsScreen: React.FC<ParkingDetailsScreenProps> = ({ location, onBack, onNext, lang }) => {
  const [selectedSpot, setSelectedSpot] = useState<string>('A-02');
  const [isFavorite, setIsFavorite] = useState(false);

  const available = location.availableSpots;
  const total = location.totalSpots || Math.max(available, 1);
  const filledPercent = Math.round(((total - available) / total) * 100);
  const name = lang === 'ta' && location.titleTa ? location.titleTa : location.title;
  const distance = location.distanceMeters;

  const SpotButton = ({ spot, flipped }: { spot: Spot; flipped?: boolean }) => {
    const isSelected = selectedSpot === spot.id;
    return (
      <button
        disabled={spot.taken}
        onClick={() => setSelectedSpot(spot.id)}
        aria-pressed={isSelected}
        aria-label={`${spot.id}${spot.note ? `, ${spot.note}` : ''}${spot.taken ? ', taken' : ''}`}
        className={`relative flex-1 h-[72px] border-r-[3px] border-paint flex flex-col ${flipped ? 'justify-start pt-2' : 'justify-end pb-2'} items-center cursor-pointer disabled:cursor-not-allowed ${
          isSelected ? 'bg-paint text-ink' : spot.taken ? 'text-white/35' : 'text-white active:bg-white/10'
        }`}
      >
        <span className="text-sm font-black tabular">{spot.id}</span>
        <span className={`text-[11px] font-semibold ${isSelected ? 'text-ink/75' : 'text-white/60'}`}>
          {spot.taken ? 'Taken' : spot.note || 'Open'}
        </span>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-limewash text-ink relative animate-fade-in">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative h-48 bg-slate-800 shrink-0">
          <img src={location.imageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute top-3 inset-x-3 flex items-center justify-between">
            <button
              onClick={onBack}
              aria-label="Back"
              className="w-10 h-10 rounded-md bg-white flex items-center justify-center text-ink shadow-md active:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              aria-label={isFavorite ? 'Remove from saved' : 'Save place'}
              aria-pressed={isFavorite}
              className="w-10 h-10 rounded-md bg-white flex items-center justify-center shadow-md active:bg-slate-100 cursor-pointer"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-600 text-rose-600' : 'text-ink'}`} />
            </button>
          </div>
        </div>

        <div className="px-4 pt-5 pb-6">
          <h1 className={`text-[1.6rem] font-black leading-tight ${lang === 'ta' && location.titleTa ? 'font-tamil' : ''}`}>{name}</h1>
          <p className="text-[15px] text-slate-600 mt-1.5 flex items-start gap-1.5">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden />
            <span>
              {location.landmark ? `${location.landmark}, ` : ''}
              {location.address}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" aria-hidden />
              <span className="font-bold text-ink tabular">{location.rating}</span>
              <span className="tabular">({location.reviewsCount} reviews)</span>
            </span>
            {distance != null && <span className="tabular">{distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} away</span>}
            {location.isVerified && (
              <span className="inline-flex items-center gap-1 text-brand-700 font-semibold">
                <ShieldCheck className="w-4 h-4" aria-hidden />
                Checked by iDAM
              </span>
            )}
          </div>

          {/* Rates and availability as a fact table */}
          <dl className="grid grid-cols-3 mt-6 border-y-2 border-ink divide-x divide-slate-300">
            <div className="py-3 pr-3">
              <dt className="text-xs text-slate-500">Car</dt>
              <dd className="text-xl font-black tabular">₹{location.hourlyRateCar}<span className="text-sm font-semibold text-slate-500">/hr</span></dd>
            </div>
            <div className="py-3 px-3">
              <dt className="text-xs text-slate-500">Bike</dt>
              <dd className="text-xl font-black tabular">₹{location.hourlyRateBike}<span className="text-sm font-semibold text-slate-500">/hr</span></dd>
            </div>
            <div className="py-3 pl-3">
              <dt className="text-xs text-slate-500">Free now</dt>
              <dd className={`text-xl font-black tabular ${available > 0 ? 'text-go-600' : 'text-rose-600'}`}>
                {available}
                <span className="text-sm font-semibold text-slate-500"> of {total}</span>
              </dd>
            </div>
          </dl>
          <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden" aria-hidden>
            <div className={`h-full ${filledPercent > 80 ? 'bg-rose-500' : 'bg-ink'}`} style={{ width: `${filledPercent}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{filledPercent}% of spaces are in use</p>

          {/* Bay picker drawn like the painted lot */}
          <h2 className="text-base font-black mt-7">Choose a bay</h2>
          <p className="text-sm text-slate-600 mt-0.5">Ground level. The owner keeps this bay for you.</p>
          <div className="asphalt rounded-lg mt-3 overflow-hidden">
            <div className="flex border-l-[3px] border-b-[3px] border-paint">
              {ROW_A.map((s) => (
                <SpotButton key={s.id} spot={s} />
              ))}
            </div>
            <div className="h-9 relative" aria-hidden>
              <div className="absolute inset-x-0 top-1/2 h-[2px] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.7)_0_16px,transparent_16px_30px)]" />
            </div>
            <div className="flex border-l-[3px] border-t-[3px] border-paint">
              {ROW_B.map((s) => (
                <SpotButton key={s.id} spot={s} flipped />
              ))}
            </div>
          </div>

          {location.amenities.length > 0 && (
            <>
              <h2 className="text-base font-black mt-7">At this place</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {location.amenities.map((a) => (
                  <li key={a} className="text-sm font-semibold border border-slate-300 bg-white rounded-md px-2.5 py-1">
                    {a}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-6 flex items-center gap-2 text-[15px]">
            <Clock className="w-4 h-4 text-slate-500" aria-hidden />
            <span className="text-slate-600">Open</span>
            <span className="font-bold">{location.operatingHours || '24 hours'}</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-white border-t border-slate-300">
        <button
          onClick={onNext}
          disabled={available <= 0}
          className="w-full bg-brand-700 active:bg-brand-800 disabled:bg-slate-300 disabled:text-slate-600 text-white rounded-lg py-3.5 px-5 flex items-center justify-between cursor-pointer"
        >
          <span className="text-left">
            <span className="block text-xs text-white/75 font-semibold">Bay {selectedSpot}</span>
            <span className="block text-base font-black">{available <= 0 ? 'No spaces free' : 'Choose a time'}</span>
          </span>
          <span className="text-base font-black tabular">₹{location.hourlyRateCar}/hr</span>
        </button>
      </div>
    </div>
  );
};
