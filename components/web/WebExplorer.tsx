'use client';

import React, { useState, useEffect } from 'react';
import { Car, Bike, Star, Clock, X, Search } from 'lucide-react';
import { ParkingLocation, VehicleType, Language } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { TRANSLATIONS } from '@/lib/i18n/translations';

import dynamic from 'next/dynamic';

const RealMapView = dynamic(
  () => import('./RealMapView').then((mod) => mod.RealMapView),
  { ssr: false, loading: () => <div className="w-full h-full min-h-[420px] bg-slate-200 animate-pulse flex items-center justify-center text-sm text-slate-500">Loading map…</div> }
);

interface WebExplorerProps {
  lang: Language;
  onSelectLocation: (loc: ParkingLocation) => void;
  /** Destination typed in the hero search */
  query?: string;
  onClearQuery?: () => void;
  /** Standalone /explore page: h1 heading and its own search box */
  asPage?: boolean;
}

const COPY = {
  en: {
    heading: 'Parking near the old city',
    sub: 'Free spaces update as drivers check in and out.',
    all: 'All',
    results: (n: number) => `${n} ${n === 1 ? 'place' : 'places'}`,
    resultsFor: (q: string) => `Showing places near “${q}”`,
    clear: 'Clear search',
    none: 'No parking found for that search. Try a nearby landmark or street name.',
    free: 'free',
    full: 'Full',
    away: 'away',
    searchPlaceholder: 'Street, landmark or area',
  },
  ta: {
    heading: 'பழைய நகர் அருகே பார்க்கிங்',
    sub: 'ஓட்டுநர்கள் உள்ளே வரும்போதும் வெளியேறும்போதும் காலி இடங்கள் புதுப்பிக்கப்படும்.',
    all: 'அனைத்தும்',
    results: (n: number) => `${n} இடங்கள்`,
    resultsFor: (q: string) => `“${q}” அருகே உள்ள இடங்கள்`,
    clear: 'தேடலை அழி',
    none: 'இந்தத் தேடலுக்கு பார்க்கிங் இல்லை. அருகிலுள்ள அடையாளம் அல்லது தெருவின் பெயரை முயற்சிக்கவும்.',
    free: 'காலி',
    full: 'நிரம்பியது',
    away: 'தொலைவு',
    searchPlaceholder: 'தெரு, அடையாளம் அல்லது பகுதி',
  },
};

const formatDistance = (m?: number) => (m == null ? '' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

export const WebExplorer: React.FC<WebExplorerProps> = ({ lang, onSelectLocation, query: queryProp = '', onClearQuery, asPage = false }) => {
  const [pageQuery, setPageQuery] = useState('');
  const query = asPage ? pageQuery : queryProp;
  const t = TRANSLATIONS[lang];
  const c = COPY[lang];
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      const data = await getParkingLocations({ query, vehicleType: vehicleFilter });
      if (cancelled) return;
      setLocations(data);
      setSelectedSpotId((prev) => (data.find((d) => d.id === prev) ? prev : data[0]?.id || ''));
      setIsLoading(false);
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [query, vehicleFilter]);

  const selectedLocation = locations.find((l) => l.id === selectedSpotId) || locations[0];
  const rateFor = (loc: ParkingLocation) => (vehicleFilter === 'bike' ? loc.hourlyRateBike : loc.hourlyRateCar);
  const nameFor = (loc: ParkingLocation) => (lang === 'ta' && loc.titleTa ? loc.titleTa : loc.title);
  const tamil = lang === 'ta' ? 'font-tamil' : '';

  const filters: { id: VehicleType; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: c.all },
    { id: 'car', label: t.car, icon: <Car className="w-4 h-4" aria-hidden /> },
    { id: 'bike', label: t.bike, icon: <Bike className="w-4 h-4" aria-hidden /> },
  ];

  return (
    <section id="explore" className={asPage ? '' : 'scroll-mt-16 border-t border-slate-300/70 bg-white'}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${asPage ? 'pt-10 pb-16' : 'py-14 lg:py-20'}`}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
          <div>
            {asPage ? (
              <h1 className={`text-4xl sm:text-5xl font-black tracking-tight text-ink leading-tight ${tamil}`}>{c.heading}</h1>
            ) : (
              <h2 className={`text-3xl sm:text-[2.5rem] font-black tracking-tight text-ink leading-tight ${tamil}`}>{c.heading}</h2>
            )}
            <p className={`text-slate-600 mt-2 ${tamil}`}>{c.sub}</p>
            {asPage && (
              <div className="mt-5 relative max-w-md" role="search">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
                <input
                  type="search"
                  value={pageQuery}
                  onChange={(e) => setPageQuery(e.target.value)}
                  placeholder={c.searchPlaceholder}
                  aria-label={c.searchPlaceholder}
                  className={`w-full pl-11 pr-4 py-3 bg-white border-2 border-ink rounded-lg text-base placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-300/60 ${tamil}`}
                />
              </div>
            )}
          </div>

          <div className="inline-flex self-start md:self-auto border border-slate-300 rounded-md overflow-hidden text-sm font-bold" role="group" aria-label="Vehicle">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setVehicleFilter(f.id)}
                aria-pressed={vehicleFilter === f.id}
                className={`flex items-center gap-1.5 px-4 py-2 border-r border-slate-300 last:border-r-0 cursor-pointer ${tamil} ${
                  vehicleFilter === f.id ? 'bg-ink text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {query && !asPage && (
          <div className="mb-5 flex items-center gap-3 text-sm">
            <span className={`font-semibold text-ink ${tamil}`}>{c.resultsFor(query)}</span>
            {onClearQuery && (
              <button onClick={onClearQuery} className="inline-flex items-center gap-1 text-slate-600 hover:text-ink underline underline-offset-4 cursor-pointer">
                <X className="w-3.5 h-3.5" aria-hidden />
                {c.clear}
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-300 rounded-xl overflow-hidden">
          {/* Map + selected place */}
          <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-300">
            <div className="relative flex-1 min-h-[360px] lg:min-h-[480px] bg-slate-200">
              <RealMapView
                locations={locations}
                selectedLocation={selectedLocation}
                onSelectLocation={(loc) => setSelectedSpotId(loc.id)}
                vehicleFilter={vehicleFilter}
              />
            </div>

            {selectedLocation && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 border-t border-slate-300 bg-limewash">
                <div className="flex items-center gap-4 min-w-0">
                  <img src={selectedLocation.imageUrl} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
                  <div className="min-w-0">
                    <h3 className={`font-bold text-ink truncate ${tamil}`}>{nameFor(selectedLocation)}</h3>
                    <p className="text-sm text-slate-600 truncate">{selectedLocation.landmark || selectedLocation.address}</p>
                    <p className="text-sm text-slate-600 flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden />
                        <span className="font-semibold text-ink tabular">{selectedLocation.rating}</span>
                        <span className="tabular">({selectedLocation.reviewsCount})</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden />
                        {selectedLocation.operatingHours}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectLocation(selectedLocation)}
                  disabled={selectedLocation.availableSpots <= 0}
                  className={`bg-brand-700 hover:bg-brand-800 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed text-white px-5 py-3 rounded-md text-[15px] font-bold whitespace-nowrap cursor-pointer ${tamil}`}
                >
                  {selectedLocation.availableSpots <= 0 ? c.full : `${t.reserveSpace}, ₹${rateFor(selectedLocation)}${t.perHour}`}
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-baseline justify-between px-5 py-3 border-b border-slate-300 bg-limewash">
              <span className={`text-sm font-bold text-ink ${tamil}`}>{c.results(locations.length)}</span>
              {isLoading && <span className="text-xs text-slate-500">Updating…</span>}
            </div>
            <ul className="lg:max-h-[560px] overflow-y-auto divide-y divide-slate-200">
              {!isLoading && locations.length === 0 && <li className={`p-6 text-slate-600 ${tamil}`}>{c.none}</li>}
              {locations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                const isFull = loc.availableSpots <= 0;
                return (
                  <li key={loc.id}>
                    <button
                      onClick={() => setSelectedSpotId(loc.id)}
                      onDoubleClick={() => !isFull && onSelectLocation(loc)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full text-left flex items-stretch gap-4 pl-4 pr-5 py-4 border-l-4 cursor-pointer ${
                        isSelected ? 'border-paint bg-amber-50/60' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-14 shrink-0 text-center leading-none pt-0.5 ${isFull ? 'text-rose-600' : 'text-go-600'}`}>
                        {isFull ? (
                          <span className={`block text-sm font-black pt-2 ${tamil}`}>{c.full}</span>
                        ) : (
                          <>
                            <span className="block text-[1.7rem] font-black tabular">{loc.availableSpots}</span>
                            <span className={`block text-xs font-semibold mt-1 ${tamil}`}>{c.free}</span>
                          </>
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block font-bold text-ink leading-snug ${tamil}`}>{nameFor(loc)}</span>
                        <span className="block text-sm text-slate-600 truncate mt-0.5">{loc.landmark || loc.address}</span>
                        <span className="block text-xs text-slate-500 mt-1.5 truncate">{loc.amenities.slice(0, 4).join(', ')}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-lg font-black text-ink tabular leading-none">
                          ₹{rateFor(loc)}
                          <span className="text-xs font-semibold text-slate-500">{t.perHour}</span>
                        </span>
                        {loc.distanceMeters != null && (
                          <span className="block text-xs text-slate-500 mt-1.5 tabular">{formatDistance(loc.distanceMeters)}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
