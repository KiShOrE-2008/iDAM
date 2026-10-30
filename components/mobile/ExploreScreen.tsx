'use client';

import React, { useState, useMemo } from 'react';
import { Search, User, MapPin, Car, Bike, Zap, ArrowDownUp, X } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { AppTabBar } from './AppTabBar';
import dynamic from 'next/dynamic';

const RealMapView = dynamic(
  () => import('../web/RealMapView').then((mod) => mod.RealMapView),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center text-sm text-slate-500">Loading map…</div> }
);

interface ExploreScreenProps {
  locations: ParkingLocation[];
  selectedLocation: ParkingLocation;
  onSelectLocation: (loc: ParkingLocation) => void;
  onNext: () => void;
  lang: Language;
  onNavigateToProfile?: () => void;
  onNavigateToBookings?: () => void;
  activeTab?: 'home' | 'bookings' | 'profile';
}

type Filter = 'near' | 'car' | 'bike' | 'ev';

const formatDistance = (m?: number) => (m == null ? '' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onNext,
  lang,
  onNavigateToProfile,
  onNavigateToBookings,
}) => {
  const { isDemoMode } = useAuth();
  const [filter, setFilter] = useState<Filter>('near');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'price_low'>('default');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const popularLandmarks = ['Meenakshi Temple West Tower', 'South Masi Street', 'Periyar Bus Stand', 'Madurai Railway Station'];

  const baseLocations = locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS;

  const filteredLocations = useMemo(() => {
    return baseLocations
      .filter((loc) => {
        const q = searchQuery.toLowerCase();
        const matchQuery =
          !searchQuery ||
          loc.title.toLowerCase().includes(q) ||
          loc.address.toLowerCase().includes(q) ||
          (loc.landmark && loc.landmark.toLowerCase().includes(q));

        const matchVehicle =
          filter === 'near'
            ? true
            : filter === 'car'
              ? loc.hourlyRateCar > 0
              : filter === 'bike'
                ? loc.hourlyRateBike > 0
                : loc.amenities.some((a) => a.toLowerCase().includes('ev'));

        return matchQuery && matchVehicle;
      })
      .sort((a, b) => {
        if (sortOrder === 'price_low') {
          const rateA = filter === 'bike' ? a.hourlyRateBike : a.hourlyRateCar;
          const rateB = filter === 'bike' ? b.hourlyRateBike : b.hourlyRateCar;
          return rateA - rateB;
        }
        return 0;
      });
  }, [baseLocations, searchQuery, filter, sortOrder]);

  const activeLoc = selectedLocation || filteredLocations[0] || baseLocations[0];
  const rate = filter === 'bike' ? activeLoc.hourlyRateBike : activeLoc.hourlyRateCar;
  const isFull = activeLoc.availableSpots <= 0;

  const filters: { id: Filter; label: string; icon?: React.ReactNode }[] = [
    { id: 'near', label: 'All nearby' },
    { id: 'car', label: 'Car', icon: <Car className="w-4 h-4" aria-hidden /> },
    { id: 'bike', label: 'Bike', icon: <Bike className="w-4 h-4" aria-hidden /> },
    { id: 'ev', label: 'EV charging', icon: <Zap className="w-4 h-4" aria-hidden /> },
  ];

  return (
    <div className="h-full flex flex-col bg-limewash text-ink relative overflow-hidden animate-fade-in">
      <header className="pt-4 px-4 pb-3 bg-limewash border-b border-slate-300 z-30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Parking around</p>
            <p className="text-lg font-black leading-tight flex items-center gap-2">
              Madurai old city
              {isDemoMode && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">Demo</span>
              )}
            </p>
          </div>
          <button
            onClick={onNavigateToProfile}
            aria-label="Account"
            className="w-10 h-10 rounded-md border border-slate-300 bg-white flex items-center justify-center text-ink active:bg-slate-100 cursor-pointer"
          >
            <User className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Where are you going?"
            aria-label="Search for a place"
            className="w-full pl-10 pr-10 py-3 rounded-lg bg-white border-2 border-ink text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-300/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {isSearchFocused && !searchQuery && (
            <div className="absolute top-full mt-1.5 inset-x-0 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-40 animate-scale-in">
              <p className="text-xs text-slate-500 px-3 pt-1 pb-1.5">Often searched</p>
              {popularLandmarks.map((lm) => (
                <button
                  key={lm}
                  onClick={() => setSearchQuery(lm)}
                  className="w-full text-left px-3 py-2.5 active:bg-slate-100 text-[15px] font-semibold flex items-center gap-2.5 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
                  <span className="truncate">{lm}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-3 -mx-4 px-4">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold shrink-0 border cursor-pointer ${
                filter === f.id ? 'bg-ink text-white border-ink' : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setSortOrder(sortOrder === 'default' ? 'price_low' : 'default')}
            aria-pressed={sortOrder === 'price_low'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold shrink-0 border cursor-pointer ${
              sortOrder === 'price_low' ? 'bg-amber-100 text-amber-900 border-amber-400' : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            <ArrowDownUp className="w-4 h-4" aria-hidden />
            Cheapest first
          </button>
        </div>
      </header>

      <div className="flex-1 relative bg-slate-200 overflow-hidden">
        <RealMapView
          locations={filteredLocations}
          selectedLocation={activeLoc}
          onSelectLocation={onSelectLocation}
          vehicleFilter={filter === 'bike' ? 'bike' : filter === 'car' ? 'car' : 'all'}
        />
        <div className="absolute top-3 left-3 z-10 bg-white px-2.5 py-1 rounded-md text-xs font-bold shadow-md border border-slate-200">
          {filteredLocations.length} {filteredLocations.length === 1 ? 'place' : 'places'} on the map
        </div>
      </div>

      {/* Selected place sheet */}
      <div className="bg-white border-t border-slate-300 z-20">
        <button onClick={onNext} className="w-full text-left flex items-stretch cursor-pointer active:bg-slate-50">
          <span className={`w-[84px] shrink-0 flex flex-col items-center justify-center border-r border-slate-200 ${isFull ? 'text-rose-600' : 'text-go-600'}`}>
            {isFull ? (
              <span className="text-base font-black">Full</span>
            ) : (
              <>
                <span className="text-[2rem] font-black leading-none tabular">{activeLoc.availableSpots}</span>
                <span className="text-xs font-bold mt-1">free</span>
              </>
            )}
          </span>
          <span className="flex-1 min-w-0 px-4 py-3.5">
            <span className={`block font-black text-[17px] leading-snug truncate ${lang === 'ta' && activeLoc.titleTa ? 'font-tamil' : ''}`}>
              {lang === 'ta' && activeLoc.titleTa ? activeLoc.titleTa : activeLoc.title}
            </span>
            <span className="block text-sm text-slate-600 truncate mt-0.5">{activeLoc.landmark || activeLoc.address}</span>
            <span className="flex items-baseline gap-3 mt-1.5 text-sm">
              <span className="font-black text-ink tabular">
                ₹{rate}
                <span className="font-semibold text-slate-500">/hr</span>
              </span>
              {activeLoc.distanceMeters != null && <span className="text-slate-500 tabular">{formatDistance(activeLoc.distanceMeters)} away</span>}
            </span>
          </span>
          <span className="self-center pr-4 text-sm font-bold text-brand-700 shrink-0">Details</span>
        </button>
      </div>

      <AppTabBar active="home" onPasses={onNavigateToBookings} onProfile={onNavigateToProfile} />
    </div>
  );
};
