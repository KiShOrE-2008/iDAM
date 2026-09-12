'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Car, Bike, Filter, Star, Clock, Shield, CheckCircle2, ChevronRight, Navigation, Sparkles } from 'lucide-react';
import { ParkingLocation, VehicleType, Language } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface WebExplorerProps {
  lang: Language;
  onSelectLocation: (loc: ParkingLocation) => void;
}

export const WebExplorer: React.FC<WebExplorerProps> = ({ lang, onSelectLocation }) => {
  const t = TRANSLATIONS[lang];
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string>('loc-1');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await getParkingLocations({ query: searchQuery, vehicleType: vehicleFilter });
      setLocations(data);
      if (data.length > 0 && !data.find(d => d.id === selectedSpotId)) {
        setSelectedSpotId(data[0].id);
      }
      setIsLoading(false);
    }
    loadData();
  }, [searchQuery, vehicleFilter]);

  const selectedLocation = locations.find(l => l.id === selectedSpotId) || locations[0];

  return (
    <section id="explore" className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Parking Discovery</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Explore Available Spaces in Madurai
            </h2>
          </div>

          {/* Vehicle Type Filter Pills */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-200 shadow-xs">
            <button
              onClick={() => setVehicleFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                vehicleFilter === 'all'
                  ? 'bg-emerald-950 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Vehicles
            </button>
            <button
              onClick={() => setVehicleFilter('car')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                vehicleFilter === 'car'
                  ? 'bg-emerald-950 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{t.car}</span>
            </button>
            <button
              onClick={() => setVehicleFilter('bike')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                vehicleFilter === 'bike'
                  ? 'bg-emerald-950 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>{t.bike}</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Interactive Map + Parking List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Visual Map (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-4 border border-gray-200 shadow-lg relative min-h-[480px] flex flex-col justify-between overflow-hidden">
            
            {/* Map Canvas Header Bar */}
            <div className="flex items-center justify-between z-10 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                <span className="font-bold text-gray-900 text-sm">Madurai Meenakshi Temple Region</span>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full font-bold">
                {locations.length} Spots Active
              </span>
            </div>

            {/* Interactive Map Canvas Simulation */}
            <div className="absolute inset-0 bg-slate-100 overflow-hidden">
              <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                <pattern id="web-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#web-grid)" />
                <path d="M 50 150 Q 200 120 400 200 T 700 180" fill="none" stroke="#94a3b8" strokeWidth="16" />
                <path d="M 250 50 L 250 450" fill="none" stroke="#94a3b8" strokeWidth="12" />
                <path d="M 100 320 L 600 320" fill="none" stroke="#94a3b8" strokeWidth="14" />
              </svg>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-100 border-2 border-amber-500/50 p-4 rounded-3xl text-center shadow-xl z-0">
                <div className="text-2xl">🛕</div>
                <div className="text-[11px] font-bold text-amber-950 font-serif">Meenakshi Temple</div>
                <div className="text-[9px] text-amber-800">Madurai Central</div>
              </div>

              {locations.map((loc, idx) => {
                const positions = [
                  { top: '35%', left: '42%' },
                  { top: '65%', left: '30%' },
                  { top: '30%', left: '68%' },
                  { top: '75%', left: '62%' },
                  { top: '22%', left: '25%' },
                ];
                const pos = positions[idx % positions.length];
                const isSelected = selectedSpotId === loc.id;

                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedSpotId(loc.id)}
                    style={{ top: pos.top, left: pos.left }}
                    className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer ${
                      isSelected ? 'scale-110 z-20' : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full shadow-lg font-extrabold text-xs border transition-all ${
                        isSelected
                          ? 'bg-emerald-950 text-white border-emerald-500 ring-4 ring-emerald-500/20'
                          : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 fill-current" />
                      <span>₹{vehicleFilter === 'bike' ? loc.hourlyRateBike : loc.hourlyRateCar}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedLocation && (
              <div className="relative z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedLocation.imageUrl}
                    alt={selectedLocation.title}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                      {lang === 'ta' && selectedLocation.titleTa ? selectedLocation.titleTa : selectedLocation.title}
                    </h4>
                    <p className="text-xs text-gray-500">{selectedLocation.landmark || selectedLocation.address}</p>
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 pt-0.5">
                      <span className="flex items-center text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                        {selectedLocation.rating} ({selectedLocation.reviewsCount})
                      </span>
                      <span>•</span>
                      <span>{selectedLocation.availableSpots} spots left</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectLocation(selectedLocation)}
                  className="bg-emerald-950 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md whitespace-nowrap transition-all"
                >
                  {t.reserveSpace} &rarr;
                </button>
              </div>
            )}

          </div>

          {/* Right Column: Parking Space List (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-extrabold text-gray-900 text-lg flex items-center justify-between">
              <span>Nearby Parking Places</span>
              <span className="text-xs text-gray-500 font-normal">{locations.length} results</span>
            </h3>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {locations.map((loc) => {
                const isSelected = selectedSpotId === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedSpotId(loc.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-emerald-700 shadow-md ring-2 ring-emerald-700/10'
                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <img
                          src={loc.imageUrl}
                          alt={loc.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">
                            {lang === 'ta' && loc.titleTa ? loc.titleTa : loc.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{loc.address}</p>

                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {loc.amenities.slice(0, 3).map((amenity, i) => (
                              <span key={i} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-semibold">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold text-gray-900">
                          ₹{vehicleFilter === 'bike' ? loc.hourlyRateBike : loc.hourlyRateCar}
                          <span className="text-xs font-normal text-gray-500">{t.perHour}</span>
                        </div>
                        <div className="text-[11px] text-emerald-800 font-bold mt-1">
                          {loc.distanceMeters || 180}m away
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                          🕒 {loc.operatingHours}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLocation(loc);
                          }}
                          className="text-xs font-bold text-emerald-900 hover:text-emerald-700 flex items-center space-x-1"
                        >
                          <span>{t.reserveSpace}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
