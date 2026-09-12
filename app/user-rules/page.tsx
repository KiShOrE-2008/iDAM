'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';

export default function UserRulesPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans text-gray-800">
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Page Header */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200/80 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-bold">
            <Car className="w-4 h-4 text-emerald-700" />
            <span>Driver Guidelines & Safety Rules</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            User / Driver Rules
          </h1>
          <p className="text-xs text-gray-500 font-semibold">
            Last updated: September 2026 • Guidelines for smooth parking across Madurai
          </p>
        </div>

        {/* Rules Cards */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200/80 prose prose-emerald max-w-none text-sm leading-relaxed space-y-6">
          
          <h3 className="text-xl font-extrabold text-gray-900">1. On-Site Parking Etiquette</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 font-medium">
            <li>Park strictly within marked bay lines (Car / Bike designated slots).</li>
            <li>Do not block entry ramps, exit lanes, or EV charging stations unless actively charging.</li>
            <li>Maintain a maximum speed limit of <strong>10 km/h</strong> inside all parking compounds.</li>
          </ul>

          <h3 className="text-xl font-extrabold text-gray-900">2. Digital QR Pass Validation</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 font-medium">
            <li>Present your live digital QR pass at gate entry and exit scanners.</li>
            <li>Ensure entry is made during your valid reservation window.</li>
            <li>Overstaying beyond booked hours will incur standard hourly overstay charges.</li>
          </ul>

          <h3 className="text-xl font-extrabold text-gray-900">3. Vehicle & Personal Safety</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 font-medium">
            <li>Lock all vehicle doors and windows before leaving the compound.</li>
            <li>Do not leave valuable items, electronic devices, or cash visible inside parked vehicles.</li>
          </ul>

          <h3 className="text-xl font-extrabold text-gray-900">4. Zero Tolerance Behavior</h3>
          <p>
            Harassment of parking attendants, property damage, or reckless driving within parking lots will result in immediate permanent suspension from the IDAM platform.
          </p>

        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
