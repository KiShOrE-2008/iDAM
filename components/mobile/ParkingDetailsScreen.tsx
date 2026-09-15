'use client';

import React, { useState } from 'react';
import { ArrowLeft, Heart, Star, MapPin, Clock, ShieldCheck, Car, Bike, Video, Zap, CheckCircle2, Navigation, Layers, Info } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';

interface ParkingDetailsScreenProps {
  location: ParkingLocation;
  onBack: () => void;
  onNext: () => void;
  lang: Language;
}

export const ParkingDetailsScreen: React.FC<ParkingDetailsScreenProps> = ({
  location,
  onBack,
  onNext,
  lang
}) => {
  const [selectedSpot, setSelectedSpot] = useState<string>('A-02');
  const [isFavorite, setIsFavorite] = useState(false);

  const mockSpots = [
    { id: 'A-01', status: 'available', type: 'standard', label: 'A-01' },
    { id: 'A-02', status: 'available', type: 'ev', label: 'A-02 ⚡' },
    { id: 'A-03', status: 'occupied', type: 'standard', label: 'A-03 (Busy)' },
    { id: 'A-04', status: 'available', type: 'standard', label: 'A-04' },
    { id: 'B-01', status: 'available', type: 'disabled', label: 'B-01 ♿' },
    { id: 'B-02', status: 'occupied', type: 'standard', label: 'B-02' },
    { id: 'B-03', status: 'available', type: 'vip', label: 'B-03 🔑' },
    { id: 'B-04', status: 'available', type: 'standard', label: 'B-04' },
  ];

  const spotCountAvailable = location.availableSpots || 12;
  const spotCountTotal = location.totalSpots || 35;
  const occupancyPercent = Math.round(((spotCountTotal - spotCountAvailable) / spotCountTotal) * 100);

  return (
    <div className="h-full flex flex-col justify-between bg-slate-50 relative overflow-y-auto no-scrollbar animate-fade-in">
      
      {/* Cover Image Header */}
      <div className="relative h-44 bg-slate-900 shrink-0">
        <img
          src={location.imageUrl}
          alt={location.title}
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

        {/* Floating Header Buttons */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <button
            onClick={onBack}
            className="w-8.5 h-8.5 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-800 shadow-md active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="w-8.5 h-8.5 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-rose-500 shadow-md active:scale-95 transition-transform"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
          </button>
        </div>

        {/* Verified Badge */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center space-x-1.5 bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>iDAM Verified Parking</span>
        </div>

        {/* Price Tag Badge */}
        <div className="absolute bottom-3 right-3 z-10 bg-emerald-500 text-slate-950 font-black px-3 py-1 rounded-xl shadow-lg text-xs">
          ₹{location.hourlyRateCar}/hr
        </div>
      </div>

      {/* Main Content Details */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* Title, Address & Rating */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {location.title}
            </h2>
            <div className="flex items-center space-x-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span className="text-xs font-black">{location.rating}</span>
              <span className="text-[10px] text-amber-700 font-semibold">({location.reviewsCount})</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 flex items-center space-x-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{location.address}</span>
            <span className="text-emerald-700 font-bold shrink-0">• {location.distanceMeters || 180}m away</span>
          </p>
        </div>

        {/* Live Capacity Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Spot Availability</span>
            </span>
            <span className="font-black text-emerald-700">
              {spotCountAvailable} of {spotCountTotal} left
            </span>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
            <span>{occupancyPercent}% Occupied</span>
            <span className="text-emerald-700 font-bold">Fast entry with iDAM QR</span>
          </div>
        </div>

        {/* Visual Spot Grid Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Select Exact Parking Slot</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Level 1 • Floor A</span>
          </div>

          {/* Spot Grid */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {mockSpots.map((spot) => {
              const isSelected = selectedSpot === spot.id;
              const isOccupied = spot.status === 'occupied';

              return (
                <button
                  key={spot.id}
                  disabled={isOccupied}
                  onClick={() => setSelectedSpot(spot.id)}
                  className={`p-2 rounded-xl text-center border transition-all text-xs relative ${
                    isOccupied
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'bg-emerald-950 text-white border-emerald-700 shadow-md font-extrabold ring-2 ring-emerald-400/40 scale-102'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <div className="text-[11px] truncate font-bold">{spot.label}</div>
                  <div className="text-[9px] mt-0.5 font-medium opacity-80">
                    {isOccupied ? 'Taken' : spot.type === 'ev' ? 'Fast EV' : spot.type === 'vip' ? 'Valet' : 'Open'}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute -top-1 -right-1 bg-slate-950 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-semibold border-t border-slate-100">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Open</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Selected: <strong className="text-slate-900">{selectedSpot}</strong></span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span>Taken</span>
            </span>
          </div>
        </div>

        {/* Amenities Grid */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Parking Amenities & Security
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-800">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
              <Video className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>24/7 CCTV Monitored</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>EV Charging Station</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
              <Car className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Covered Roof Deck</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Guarded Gate Access</span>
            </div>
          </div>
        </div>

        {/* Operating Hours Card */}
        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 font-bold text-emerald-950">
            <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Operating Hours</span>
          </div>
          <span className="font-extrabold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg">
            {location.operatingHours || '24 Hours Open'}
          </span>
        </div>

      </div>

      {/* Sticky Bottom Reserve CTA */}
      <div className="p-3.5 bg-white border-t border-slate-200 sticky bottom-0 z-20 shadow-lg">
        <button
          onClick={onNext}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold py-3.5 rounded-2xl shadow-xl text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-between px-5"
        >
          <div className="text-left">
            <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Slot {selectedSpot} Selected</div>
            <div className="text-sm font-black">₹{location.hourlyRateCar} / hour</div>
          </div>
          <div className="flex items-center space-x-1 text-emerald-300 font-extrabold">
            <span>Proceed to Booking</span>
            <span>&rarr;</span>
          </div>
        </button>
      </div>

    </div>
  );
};
