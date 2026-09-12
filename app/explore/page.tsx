'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WebBookingModal } from '@/components/WebBookingModal';
import { AuthModal } from '@/components/AuthModal';
import { ParkingLocation, Language, VehicleType } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { Search, MapPin, Car, Bike, Filter, Star, Clock, ShieldCheck, ChevronRight, Sparkles, Navigation } from 'lucide-react';

export default function ExplorePage() {
  const [lang, setLang] = useState<Language>('en');
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleType>('all');
  const [maxPrice, setMaxPrice] = useState<number>(50);
  const [selectedSpot, setSelectedSpot] = useState<ParkingLocation | null>(null);
  const [bookingSpot, setBookingSpot] = useState<ParkingLocation | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const data = await getParkingLocations({
        query: searchQuery,
        vehicleType: vehicleFilter,
        maxPrice: maxPrice
      });
      setLocations(data);
      if (data.length > 0 && !selectedSpot) {
        setSelectedSpot(data[0]);
      }
    }
    loadData();
  }, [searchQuery, vehicleFilter, maxPrice]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Location Discovery</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">Find Parking in Madurai</h1>
            <p className="text-xs text-gray-500 mt-1">Real-time availability near Meenakshi Temple, Periyar & Junction</p>
          </div>

          {/* Controls & Search Input */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area e.g. West Tower..."
                className="pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-semibold bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Vehicle Selector */}
            <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setVehicleFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  vehicleFilter === 'all' ? 'bg-emerald-950 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setVehicleFilter('car')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl transition-all ${
                  vehicleFilter === 'car' ? 'bg-emerald-950 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Car</span>
              </button>
              <button
                onClick={() => setVehicleFilter('bike')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl transition-all ${
                  vehicleFilter === 'bike' ? 'bg-emerald-950 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Bike</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Interactive Canvas Map & Side Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Map Section (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-4 border border-gray-200 shadow-md relative min-h-[550px] flex flex-col justify-between overflow-hidden">
            
            <div className="flex items-center justify-between z-10 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-900">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Madurai City Map View</span>
              </div>
              <span className="text-[11px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                {locations.length} Locations Active
              </span>
            </div>

            {/* Canvas Map Art */}
            <div className="absolute inset-0 bg-slate-100 overflow-hidden">
              <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                <pattern id="explore-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#explore-grid)" />
                <path d="M 60 160 Q 220 100 450 220 T 750 190" fill="none" stroke="#94a3b8" strokeWidth="18" />
                <path d="M 280 40 L 280 500" fill="none" stroke="#94a3b8" strokeWidth="12" />
                <path d="M 120 340 L 680 340" fill="none" stroke="#94a3b8" strokeWidth="16" />
              </svg>

              {/* Central Gopuram Art */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-50 border-2 border-amber-500/50 p-4 rounded-3xl text-center shadow-xl">
                <div className="text-3xl">🛕</div>
                <div className="text-xs font-extrabold text-amber-950 font-serif">Meenakshi Temple</div>
                <div className="text-[10px] text-amber-800">Madurai Central</div>
              </div>

              {/* Pins */}
              {locations.map((loc, idx) => {
                const positions = [
                  { top: '35%', left: '42%' },
                  { top: '65%', left: '30%' },
                  { top: '30%', left: '68%' },
                  { top: '75%', left: '62%' },
                  { top: '22%', left: '25%' },
                ];
                const pos = positions[idx % positions.length];
                const isSelected = selectedSpot?.id === loc.id;

                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedSpot(loc)}
                    style={{ top: pos.top, left: pos.left }}
                    className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer ${
                      isSelected ? 'scale-110 z-20' : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full shadow-lg font-extrabold text-xs border ${
                        isSelected
                          ? 'bg-emerald-950 text-white border-emerald-500 ring-4 ring-emerald-500/20'
                          : 'bg-white text-emerald-950 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 fill-current" />
                      <span>₹{vehicleFilter === 'bike' ? loc.hourlyRateBike : loc.hourlyRateCar}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Spot Bottom Card */}
            {selectedSpot && (
              <div className="relative z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-xl flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedSpot.imageUrl}
                    alt={selectedSpot.title}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                      {selectedSpot.title}
                    </h4>
                    <p className="text-xs text-gray-500">{selectedSpot.landmark || selectedSpot.address}</p>
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800 pt-0.5">
                      <span className="flex items-center text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                        {selectedSpot.rating} ({selectedSpot.reviewsCount})
                      </span>
                      <span>•</span>
                      <span className="text-emerald-900 font-bold">{selectedSpot.availableSpots} spots available</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setBookingSpot(selectedSpot)}
                  className="bg-emerald-950 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md whitespace-nowrap transition-all"
                >
                  Reserve Now &rarr;
                </button>
              </div>
            )}

          </div>

          {/* Parking List & Filter Sidebar (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-extrabold text-gray-900 text-lg flex items-center justify-between">
              <span>Available Parking Spaces</span>
              <span className="text-xs text-gray-500 font-normal">{locations.length} spots</span>
            </h3>

            <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
              {locations.map((loc) => {
                const isSelected = selectedSpot?.id === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedSpot(loc)}
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
                          <h4 className="font-bold text-gray-900 text-sm">{loc.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{loc.address}</p>

                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {loc.amenities.map((amenity, i) => (
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
                          <span className="text-xs font-normal text-gray-500">/hr</span>
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
                            setBookingSpot(loc);
                          }}
                          className="bg-emerald-950 hover:bg-emerald-900 text-white px-4 py-1.5 rounded-xl text-xs font-bold"
                        >
                          Book Space
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

      <Footer lang={lang} />

      {/* Web Checkout Modal */}
      <WebBookingModal
        location={bookingSpot}
        isOpen={Boolean(bookingSpot)}
        onClose={() => setBookingSpot(null)}
        lang={lang}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        lang={lang}
      />

    </div>
  );
}
