'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';

export default function OwnerPolicyPage() {
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
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>Owner & Partner Standards</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Parking Owner Policy
          </h1>
          <p className="text-xs text-gray-500 font-semibold">
            Last updated: September 2026 • Applies to all registered parking space owners & operators
          </p>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed font-medium flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block mb-0.5">Demo Platform Notice</strong>
              The IDAM prototype may contain fictional or demonstration parking listings. Demo listings do not represent actual commercial partnerships.
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200/80 prose prose-emerald max-w-none text-sm leading-relaxed space-y-8">
          
          <p className="text-base text-gray-700 font-medium">
            This policy applies to individuals, private space owners, commercial building operators, and organizations that list parking spaces on <strong>IDAM | இடம்</strong> across Madurai.
          </p>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">1. Right to List a Parking Space</h3>
            <p>
              Parking owners must possess full legal ownership, authorization, or property lease permissions to offer the parking space.
            </p>
            <p className="text-red-700 font-semibold">Owners must not list:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 font-medium">
              <li>Unauthorized private parking property.</li>
              <li>Public roads, municipal footpaths, or restricted zones without official Madurai Corporation clearance.</li>
              <li>Spaces where commercial vehicular parking is legally prohibited.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">2. Accurate Information & Pricing</h3>
            <p>
              Owners must maintain accurate listing data including precise location, total spot capacity, hourly rates (Car/Bike), operating hours, and entry instructions. Owners must not demand undisclosed cash charges at gate entry.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">3. Parking Space Condition & Safety</h3>
            <p>
              Spaces must be reasonably accessible, clear of physical hazards, and safe for standard driver entry. Security features like CCTV, gated barrier gates, lighting, or valet support should be accurately stated.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">4. Confirmed Reservations</h3>
            <p>
              Once a reservation is confirmed by a driver, the owner must guarantee spot availability. Unjustified cancellations or double-booking may result in account penalties or temporary listing suspension.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">5. Earnings & Payouts</h3>
            <p>
              Owners receive accumulated parking earnings directly to their bank account or UPI according to weekly or monthly payout cycles, subject to applicable platform fees and statutory taxes.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">6. Identity & Property Verification</h3>
            <p>
              IDAM may request property document proof or location site verification photos to maintain high platform safety and prevent fraudulent listings.
            </p>
          </section>

        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
