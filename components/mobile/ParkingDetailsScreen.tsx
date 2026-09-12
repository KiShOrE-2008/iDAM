'use client';

import React from 'react';
import { ArrowLeft, Heart, Star, MapPin, Clock, ShieldCheck, Car, Bike, Video, Sun } from 'lucide-react';
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
  return (
    <div className="h-full flex flex-col justify-between bg-white relative overflow-y-auto no-scrollbar">
      
      {/* Cover Image & Header Buttons */}
      <div className="relative h-48 bg-gray-900 shrink-0">
        <img
          src={location.imageUrl}
          alt={location.title}
          className="w-full h-full object-cover opacity-90"
        />

        {/* Floating Top Navigation */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-gray-800 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-rose-500 shadow-md">
            <Heart className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Parking Marker Badge Overlay */}
        <div className="absolute bottom-3 right-3 bg-blue-600 text-white font-extrabold px-3 py-1 rounded-xl shadow-md flex items-center space-x-1 text-xs">
          <span>P</span>
        </div>
      </div>

      {/* Details Body */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* Title & Rating */}
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 leading-tight">
            {location.title}
          </h2>
          <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1 font-semibold">
            <span className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
              {location.rating} ({location.reviewsCount} reviews)
            </span>
            <span>•</span>
            <span className="flex items-center text-gray-500">
              <MapPin className="w-3.5 h-3.5 mr-0.5 text-emerald-700" />
              180 m
            </span>
          </div>
        </div>

        {/* Price Tag */}
        <div className="text-xl font-extrabold text-gray-900">
          ₹{location.hourlyRateCar} <span className="text-xs font-normal text-gray-500">/ hour</span>
        </div>

        {/* Amenity Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg">
            <Car className="w-3 h-3 text-gray-600" />
            <span>Car</span>
          </span>
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg">
            <Bike className="w-3 h-3 text-gray-600" />
            <span>Bike</span>
          </span>
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg">
            <Video className="w-3 h-3 text-gray-600" />
            <span>CCTV</span>
          </span>
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg">
            <Sun className="w-3 h-3 text-gray-600" />
            <span>Well lit</span>
          </span>
        </div>

        {/* Hours */}
        <div className="flex items-center space-x-2 text-xs text-gray-700 font-semibold bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <Clock className="w-4 h-4 text-emerald-800" />
          <span>8:00 AM - 10:00 PM</span>
        </div>

        {/* Description text */}
        <p className="text-xs text-gray-600 leading-relaxed">
          Secure parking near Meenakshi Temple. Easy access, safe and well maintained.
        </p>

        {/* Mini Address Map Card */}
        <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 flex items-start space-x-2 text-xs text-emerald-950 font-semibold">
          <MapPin className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-gray-900">Near Meenakshi Temple</div>
            <div className="text-[11px] text-gray-500 font-normal">Madurai, Tamil Nadu</div>
          </div>
        </div>

      </div>

      {/* Bottom Sticky Action CTA */}
      <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0">
        <button
          onClick={onNext}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl shadow-lg text-xs tracking-wide transition-all flex items-center justify-center space-x-2"
        >
          <span>Reserve this space</span>
          <span>&rarr;</span>
        </button>
      </div>

    </div>
  );
};
