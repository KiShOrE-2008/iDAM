'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';
import { MapPin, ShieldCheck, Zap, Users, Building2, Globe, Heart, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans">
      
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <div className="max-w-5xl mx-auto px-4 py-12 w-full flex-1 space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-100 text-emerald-900 px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>IDAM | இடம் Platform Vision</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Transforming Unknown Parking Availability into Searchable Inventory
          </h1>

          <p className="text-gray-600 text-base sm:text-lg">
            The problem isn&apos;t simply &quot;there aren&apos;t enough parking spaces.&quot; Drivers don&apos;t know where available parking exists until they physically search for it. IDAM solves this for Madurai.
          </p>
        </div>

        {/* Example Story Section */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 p-8 sm:p-12 rounded-3xl border border-emerald-100 shadow-xl space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center space-x-2">
            <span>📍 Madurai Meenakshi Temple Example</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-xs space-y-2">
              <div className="font-extrabold text-red-600 text-base">❌ Today Without iDAM:</div>
              <p className="text-gray-600 leading-relaxed">
                🚗 Drive to Temple Area &rarr; Search congested streets &rarr; Ask local shopkeepers &rarr; Circle block 3 times &rarr; Frustrated delay.
              </p>
            </div>

            <div className="bg-emerald-950 text-white p-6 rounded-2xl border border-emerald-800 shadow-md space-y-2">
              <div className="font-extrabold text-emerald-400 text-base">✅ With iDAM | இடம்:</div>
              <p className="text-emerald-100 leading-relaxed">
                📱 Open iDAM &rarr; Search &quot;Meenakshi Temple&quot; &rarr; Choose ₹30/hr spot &rarr; Reserve & Pay &rarr; Navigate directly & Park!
              </p>
            </div>
          </div>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Location Intelligence</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Powered by Supabase & PostGIS spatial indexing to calculate exact distance radii and real-time spot counts.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Digital Parking Passes</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Instant QR code pass generation (`IDM-82931`) with verified gate check-in for seamless entry.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-white flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Owner Monetization</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Enables authorized private space owners and businesses in Madurai to monetize unused capacity effortlessly.
            </p>
          </div>
        </div>

      </div>

      <Footer lang={lang} />

    </div>
  );
}
