'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, User, MapPin, Car, Bike, ChevronRight, Home, BookOpen, UserCheck, Sparkles, Filter } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import dynamic from 'next/dynamic';

const RealMapView = dynamic(
  () => import('../web/RealMapView').then((mod) => mod.RealMapView),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-xs font-bold text-gray-400">Loading Real OpenStreetMap...</div> }
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

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onNext,
  lang,
  onNavigateToProfile,
  onNavigateToBookings,
  activeTab = 'home'
}) => {
  const [filter, setFilter] = useState<'near' | 'car' | 'bike'>('near');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'price_low'>('default');

  const baseLocations = locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS;

  const filteredLocations = useMemo(() => {
    return baseLocations.filter(loc => {
      const matchQuery = !searchQuery || 
        loc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.landmark && loc.landmark.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchVehicle = filter === 'near' ? true : 
        filter === 'car' ? loc.hourlyRateCar > 0 :
        filter === 'bike' ? loc.hourlyRateBike > 0 : true;

      return matchQuery && matchVehicle;
    }).sort((a, b) => {
      if (sortOrder === 'price_low') {
        const rateA = filter === 'bike' ? a.hourlyRateBike : a.hourlyRateCar;
        const rateB = filter === 'bike' ? b.hourlyRateBike : b.hourlyRateCar;
        return rateA - rateB;
      }
      return 0;
    });
  }, [baseLocations, searchQuery, filter, sortOrder]);

  const activeLoc = selectedLocation || filteredLocations[0] || baseLocations[0];

  return (
    <div className="h-full flex flex-col justify-between bg-gray-50 relative overflow-hidden animate-fade-in">
      
      {/* Top Header Bar */}
      <div className="pt-3 px-4 pb-2.5 bg-white border-b border-gray-100 shadow-2xs z-20 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-extrabold text-gray-900 text-sm cursor-pointer hover:opacity-80 transition-opacity">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Madurai</span>
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>

          {/* User Profile Avatar Button */}
          <button
            onClick={onNavigateToProfile}
            title="Open Profile & Passes"
            className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 hover:bg-emerald-200 transition-all transform active:scale-95 shadow-xs"
          >
            <User className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Meenakshi Temple, Masi St..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-100 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-0.5 pb-0.5">
          <button
            onClick={() => setFilter('near')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all transform active:scale-95 ${
              filter === 'near'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Near me
          </button>

          <button
            onClick={() => setFilter('car')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all transform active:scale-95 ${
              filter === 'car'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Car className="w-3 h-3" />
            <span>Car</span>
          </button>

          <button
            onClick={() => setFilter('bike')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all transform active:scale-95 ${
              filter === 'bike'
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Bike className="w-3 h-3" />
            <span>Bike</span>
          </button>

          <button
            onClick={() => setSortOrder(sortOrder === 'default' ? 'price_low' : 'default')}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
              sortOrder === 'price_low'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Price: {sortOrder === 'price_low' ? 'Low' : 'All'}</span>
          </button>
        </div>
      </div>

      {/* Real Interactive OpenStreetMap Area */}
      <div className="flex-1 relative bg-slate-100 overflow-hidden">
        
        <RealMapView
          locations={filteredLocations}
          selectedLocation={activeLoc}
          onSelectLocation={onSelectLocation}
          vehicleFilter={filter === 'bike' ? 'bike' : filter === 'car' ? 'car' : 'all'}
        />

        {/* Floating Spot Counter Badge on Map */}
        <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-800 shadow-md border border-gray-200 flex items-center space-x-1 animate-scale-in">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>{filteredLocations.length} Live Spots</span>
        </div>

      </div>

      {/* Bottom Parking Card Preview */}
      <div className="p-3 bg-white/90 backdrop-blur-md border-t border-gray-100 z-20">
        <div
          onClick={onNext}
          className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-md flex items-center justify-between cursor-pointer hover:border-emerald-600 transition-all transform active:scale-98 group"
        >
          <div className="flex items-center space-x-3">
            <img
              src={activeLoc.imageUrl}
              alt={activeLoc.title}
              className="w-12 h-12 rounded-xl object-cover shadow-2xs group-hover:scale-105 transition-transform"
            />
            <div>
              <h4 className="font-extrabold text-gray-900 text-xs group-hover:text-emerald-800 transition-colors truncate max-w-[170px]">
                {activeLoc.title}
              </h4>
              <p className="text-[11px] text-gray-500 flex items-center space-x-1">
                <span>{activeLoc.distanceMeters || 180}m</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">{activeLoc.availableSpots} spaces left</span>
              </p>
              <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                ₹{filter === 'bike' ? activeLoc.hourlyRateBike : activeLoc.hourlyRateCar}/hr
              </p>
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-emerald-900 text-white flex items-center justify-center group-hover:bg-emerald-800 transition-colors shadow-xs">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Bottom App Navigation Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-[11px] font-semibold text-gray-500 z-20">
        
        {/* Home Tab */}
        <button
          onClick={() => {}}
          className={`flex flex-col items-center transition-colors ${
            activeTab === 'home' ? 'text-emerald-800 font-bold scale-105' : 'hover:text-gray-900'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        {/* Bookings / Passes Tab */}
        <button
          onClick={onNavigateToBookings || onNavigateToProfile}
          className={`flex flex-col items-center transition-colors ${
            activeTab === 'bookings' ? 'text-emerald-800 font-bold scale-105' : 'hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Passes</span>
        </button>

        {/* Profile Tab */}
        <button
          onClick={onNavigateToProfile}
          className={`flex flex-col items-center transition-colors ${
            activeTab === 'profile' ? 'text-emerald-800 font-bold scale-105' : 'hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Profile</span>
        </button>

      </div>

    </div>
  );
};

