'use client';

import React from 'react';
import { Search, MapPin, Calendar, CreditCard, QrCode, PlusCircle, DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface HowItWorksProps {
  lang: Language;
  onOpenOwnerModal: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ lang, onOpenOwnerModal }) => {
  const t = TRANSLATIONS[lang];

  return (
    <section id="how-it-works" className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            <span>The Parking Marketplace Solution</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Turning Unknown Parking Availability into Searchable Inventory
          </h2>
          <p className="text-gray-600 text-base sm:text-lg">
            Instead of driving around Madurai endlessly searching for parking, reserve your space before you even leave home.
          </p>
        </div>

        {/* Driver Workflow Cards */}
        <div className="space-y-6">
          <h3 className="text-xl font-extrabold text-gray-900 flex items-center space-x-2">
            <span>🚗 For Drivers: Search → Reserve → Pay → Park</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-gray-900 text-base">Search</h4>
              <p className="text-xs text-gray-600">Enter destination like Meenakshi Temple or Periyar Bus Stand.</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-gray-900 text-base">Discover</h4>
              <p className="text-xs text-gray-600">See real-time available parking spaces on an interactive map.</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-gray-900 text-base">Reserve</h4>
              <p className="text-xs text-gray-600">Choose date, arrival time, and duration for Car or Bike.</p>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h4 className="font-bold text-gray-900 text-base">Pay</h4>
              <p className="text-xs text-gray-600">Instant payment via UPI, Cards, or Net Banking.</p>
            </div>

            <div className="p-5 rounded-3xl bg-emerald-900 text-white border border-emerald-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400 text-emerald-950 flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h4 className="font-bold text-white text-base">Digital Pass</h4>
              <p className="text-xs text-emerald-100">Scan QR code upon arrival at space and park stress-free!</p>
            </div>
          </div>
        </div>

        {/* Owner Monetization Banner */}
        <div id="for-owners" className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-800/80 text-emerald-100 px-3 py-1 rounded-full text-xs font-bold">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>🅿️ For Parking Space Owners</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Have an authorized parking space in Madurai? Monetize unused capacity.
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-emerald-100">
                <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs">
                  <span className="block font-bold text-white text-sm mb-0.5">1. List Space</span>
                  Add address, photos & rates
                </div>
                <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs">
                  <span className="block font-bold text-white text-sm mb-0.5">2. Set Availability</span>
                  Define hourly open times
                </div>
                <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs">
                  <span className="block font-bold text-white text-sm mb-0.5">3. Receive Bookings</span>
                  Automated driver requests
                </div>
                <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-xs">
                  <span className="block font-bold text-emerald-400 text-sm mb-0.5">4. Earn ₹</span>
                  Direct daily payouts
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 text-center lg:text-right">
              <button
                onClick={onOpenOwnerModal}
                className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                List Your Space Now &rarr;
              </button>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
