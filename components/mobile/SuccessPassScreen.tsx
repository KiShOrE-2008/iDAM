'use client';

import React, { useEffect } from 'react';
import { Check, MapPin, Calendar, Clock, Navigation, Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { ParkingLocation, Language } from '@/types';

interface SuccessPassScreenProps {
  location: ParkingLocation;
  bookingDetails: { date: string; time: string; duration: number; total: number };
  onReset: () => void;
  lang: Language;
}

export const SuccessPassScreen: React.FC<SuccessPassScreenProps> = ({
  location,
  bookingDetails,
  onReset,
  lang
}) => {
  const passCode = 'IDM-82931';

  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.4 }
      });
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div className="h-full flex flex-col justify-between bg-emerald-50/40 p-4 text-center relative overflow-y-auto no-scrollbar">
      
      {/* Top Confetti / Success Header */}
      <div className="pt-4 space-y-2">
        <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30 animate-bounce">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">All set!</h2>
        <p className="text-xs text-gray-600">Your parking is confirmed.</p>
      </div>

      {/* Main Digital iDAM Parking Pass Card */}
      <div className="my-auto bg-white p-5 rounded-3xl border border-emerald-100 shadow-xl space-y-4 max-w-xs mx-auto w-full">
        
        {/* Pass Header */}
        <div className="border-b border-gray-100 pb-3">
          <div className="text-[11px] font-extrabold tracking-widest text-emerald-950 uppercase">
            iDAM
          </div>
          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            PARKING PASS
          </div>
        </div>

        {/* QR Code Container */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/80 inline-block mx-auto">
          <QRCodeSVG
            value={`IDAM_PASS:${passCode}_${location.id}`}
            size={120}
            level="H"
            className="mx-auto"
          />
          <div className="font-mono text-xs font-bold text-gray-800 mt-2 tracking-wider">
            {passCode}
          </div>
        </div>

        {/* Location & Time Info */}
        <div className="text-left space-y-2 text-xs border-t border-gray-100 pt-3">
          <div className="flex items-center space-x-2 text-gray-800 font-bold">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate">{location.title}</span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{bookingDetails.date} 2024</span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{bookingDetails.time} AM - 12:00 PM</span>
          </div>
        </div>

        {/* Confirmed Pill */}
        <div>
          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            CONFIRMED
          </span>
        </div>

      </div>

      {/* Bottom Action Buttons */}
      <div className="pb-2 grid grid-cols-2 gap-2 text-xs font-bold">
        <button
          onClick={onReset}
          className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-3 rounded-2xl shadow-2xs flex items-center justify-center space-x-1.5"
        >
          <Eye className="w-3.5 h-3.5 text-gray-600" />
          <span>View Pass</span>
        </button>

        <button
          onClick={() => alert(`Opening Google Maps navigation to ${location.title}...`)}
          className="bg-emerald-950 hover:bg-emerald-900 text-white py-3 rounded-2xl shadow-md flex items-center justify-center space-x-1.5"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-300" />
          <span>Navigate</span>
        </button>
      </div>

    </div>
  );
};
