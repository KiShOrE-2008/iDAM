'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, User, MapPin, Car, Bike, ChevronRight, Home, BookOpen, UserCheck } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';

import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

interface ExploreScreenProps {
  locations: ParkingLocation[];
  selectedLocation: ParkingLocation;
  onSelectLocation: (loc: ParkingLocation) => void;
  onNext: () => void;
  lang: Language;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onNext,
  lang
}) => {
  const [filter, setFilter] = useState<'near' | 'car' | 'bike'>('near');

  const locs = locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS;
  const activeLoc = selectedLocation || locs[0] || MOCK_PARKING_LOCATIONS[0];

  return (
    <div className="h-full flex flex-col justify-between bg-gray-50 relative overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="pt-3 px-4 pb-3 bg-white border-b border-gray-100 shadow-2xs z-20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 font-bold text-gray-900 text-sm cursor-pointer">
            <span>Madurai</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            readOnly
            value="Meenakshi Temple..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-100 text-xs font-medium text-gray-800 focus:outline-none"
          />
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1">
          <button
            onClick={() => setFilter('near')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              filter === 'near'
                ? 'bg-emerald-800 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Near me
          </button>
          <button
            onClick={() => setFilter('car')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              filter === 'car'
                ? 'bg-emerald-800 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Car className="w-3 h-3" />
            <span>Car</span>
          </button>
          <button
            onClick={() => setFilter('bike')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              filter === 'bike'
                ? 'bg-emerald-800 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Bike className="w-3.3 h-3" />
            <span>Bike</span>
          </button>
          <button className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 shrink-0">
            <span>Price</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-200 overflow-hidden">
        {/* Simulated SVG Map Tiles */}
        <svg className="w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
          <pattern id="mobile-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#cbd5e1" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#mobile-grid)" />
          <path d="M 30 180 Q 150 100 320 220" fill="none" stroke="#94a3b8" strokeWidth="14" />
          <path d="M 180 20 L 180 400" fill="none" stroke="#94a3b8" strokeWidth="10" />
        </svg>

        {/* Map Pins matching the 2nd mockup screen */}
        <button
          onClick={() => onSelectLocation(locations[0])}
          className="absolute top-[38%] left-[28%] bg-emerald-800 text-white px-2.5 py-1 rounded-full text-xs font-extrabold shadow-lg flex items-center space-x-1 ring-2 ring-white"
        >
          <MapPin className="w-3 h-3 fill-current text-emerald-300" />
          <span>₹30</span>
        </button>

        <button
          onClick={() => onSelectLocation(locations[1] || locations[0])}
          className="absolute top-[28%] left-[72%] bg-white text-emerald-900 border border-gray-300 px-2.5 py-1 rounded-full text-xs font-extrabold shadow-md flex items-center space-x-1"
        >
          <MapPin className="w-3 h-3 fill-current text-emerald-700" />
          <span>₹35</span>
        </button>

        <button
          onClick={() => onSelectLocation(locations[2] || locations[0])}
          className="absolute top-[62%] left-[60%] bg-white text-emerald-900 border border-gray-300 px-2.5 py-1 rounded-full text-xs font-extrabold shadow-md flex items-center space-x-1"
        >
          <MapPin className="w-3 h-3 fill-current text-red-500" />
          <span>₹25</span>
        </button>

        <button
          onClick={() => onSelectLocation(locations[1] || locations[0])}
          className="absolute top-[50%] left-[45%] bg-white text-emerald-900 border border-gray-300 px-2.5 py-1 rounded-full text-xs font-extrabold shadow-md flex items-center space-x-1"
        >
          <MapPin className="w-3 h-3 fill-current text-blue-500" />
          <span>₹35</span>
        </button>
      </div>

      {/* Bottom Parking Card Preview */}
      <div className="p-3 bg-white/90 backdrop-blur-md border-t border-gray-100 z-20">
        <div
          onClick={onNext}
          className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-md flex items-center justify-between cursor-pointer hover:border-emerald-700 transition-all"
        >
          <div className="flex items-center space-x-3">
            <img
              src={activeLoc.imageUrl}
              alt={activeLoc.title}
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div>
              <h4 className="font-bold text-gray-900 text-xs">
                {activeLoc.title}
              </h4>
              <p className="text-[11px] text-gray-500">
                180 m • <span className="text-emerald-800 font-semibold">3 spaces</span>
              </p>
              <p className="text-xs font-extrabold text-gray-900 mt-0.5">
                ₹{activeLoc.hourlyRateCar}/hour
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Bottom App Navigation Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-[11px] font-semibold text-gray-500 z-20">
        <div className="flex flex-col items-center text-emerald-800 font-bold">
          <Home className="w-4 h-4" />
          <span>Home</span>
        </div>
        <div className="flex flex-col items-center hover:text-gray-900">
          <BookOpen className="w-4 h-4" />
          <span>Bookings</span>
        </div>
        <div className="flex flex-col items-center hover:text-gray-900">
          <UserCheck className="w-4 h-4" />
          <span>Profile</span>
        </div>
      </div>

    </div>
  );
};
