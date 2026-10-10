'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Search, MapPin, Calendar, CreditCard, QrCode, CheckCircle2, Building2, Sliders, Smartphone, ArrowRight, ShieldCheck, Clock, Car } from 'lucide-react';

export default function HowItWorksPage() {
  const [lang, setLang] = useState<Language>('en');

  const driverSteps = [
    {
      step: '01',
      title: 'Search & Discover Destination',
      description: 'Enter your destination (e.g. Meenakshi Temple, Madurai Junction, Mattuthavani). View available lots with walking distance and real-time bay availability.',
      icon: Search,
      actionText: 'Explore Map',
      actionHref: '/explore'
    },
    {
      step: '02',
      title: 'Select Spot & Add-Ons',
      description: 'Choose your preferred bay (Car, Bike, SUV, or EV Charging). Select your arrival time and duration. Add EV fast charging or express wash if needed.',
      icon: Sliders
    },
    {
      step: '03',
      title: 'Transparent Payment & Instant Pass',
      description: 'Review the itemized quote with zero surge charges. Pay securely with Razorpay or Instant UPI. Your cryptographically signed QR pass is generated immediately.',
      icon: CreditCard
    },
    {
      step: '04',
      title: 'Navigate & Scan In at Gate',
      description: 'Get turn-by-turn navigation straight to your assigned parking bay. Present your digital QR pass to the attendant or gate scanner for instant verification and entry.',
      icon: QrCode
    }
  ];

  const ownerSteps = [
    {
      step: '01',
      title: 'Apply & Describe Your Property',
      description: 'Tell us about your driveway, commercial lot, or basement. Submit your address, capacity (cars & bikes), operating hours, and photos in our 6-step wizard.',
      icon: Building2,
      actionText: 'List Your Space',
      actionHref: '/list-your-space'
    },
    {
      step: '02',
      title: 'Review & Live Activation',
      description: 'Our operations team verifies location coordinates and access safety. Once approved, your listing goes live to thousands of drivers looking for spots nearby.',
      icon: ShieldCheck
    },
    {
      step: '03',
      title: 'Manage Dynamic Rates & Occupancy',
      description: 'Access the Owner Portal dashboard. Track Today\'s Revenue, view expected arrivals, and adjust hourly rates or toggle maintenance mode at any time.',
      icon: Clock
    },
    {
      step: '04',
      title: 'Scan Passes & Collect Payouts',
      description: 'Use the Owner QR Scanner on any smartphone. Validate passes in milliseconds with haptic feedback, check in vehicles, and receive guaranteed digital payouts.',
      icon: Smartphone
    }
  ];

  return (
    <PageContainer
      title="How iDAM | இடம் Works"
      titleTa="iDAM எவ்வாறு செயல்படுகிறது?"
      subtitle="A seamless two-sided marketplace designed to end parking uncertainty for drivers while generating predictable revenue for space owners."
      subtitleTa="ஓட்டுநர்கள் மற்றும் பார்க்கிங் உரிமையாளர்களுக்கான எளிய வழிகாட்டி."
      badge="Step-by-Step Experience Guide"
      breadcrumbs={[{ label: 'How It Works' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="space-y-16">

        {/* DRIVER JOURNEY SECTION */}
        <div className="space-y-8">
          <div className="space-y-2 border-b border-slate-200/80 pb-4">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              For Drivers
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
              Find, Reserve, and Park in 4 Simple Steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Eliminate street cruising anxiety with advance reservations and verifiable digital passes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {driverSteps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-slate-400 font-mono">
                        STEP {s.step}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {s.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {s.description}
                    </p>
                  </div>

                  {s.actionText && s.actionHref && (
                    <div className="pt-2">
                      <Link
                        href={s.actionHref}
                        className="inline-flex items-center space-x-1.5 text-xs font-black text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        <span>{s.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* OWNER JOURNEY SECTION */}
        <div className="space-y-8">
          <div className="space-y-2 border-b border-slate-200/80 pb-4">
            <span className="text-xs font-black text-amber-800 uppercase tracking-wider bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              For Parking Owners
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
              Monetize Empty Spaces with Zero Hardware Friction
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Transform residential driveways or commercial lots into passive recurring income.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ownerSteps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-slate-400 font-mono">
                        STEP {s.step}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {s.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {s.description}
                    </p>
                  </div>

                  {s.actionText && s.actionHref && (
                    <div className="pt-2">
                      <Link
                        href={s.actionHref}
                        className="inline-flex items-center space-x-1.5 text-xs font-black text-amber-700 hover:text-amber-900 hover:underline"
                      >
                        <span>{s.actionText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cryptographic Pass Security Explainer */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-5 border border-slate-700">
          <div className="flex items-center space-x-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Pass Security Architecture</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white">
            Why iDAM Parking Passes Cannot Be Forged or Reused
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 text-xs leading-relaxed text-slate-300">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-700 space-y-1.5">
              <span className="text-emerald-400 font-black block">1. High-Entropy Tokens</span>
              <p>Every pass encodes a cryptographic 32-character hexadecimal token (e.g. IDAM:v2:...). No predictable sequential numbers.</p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-700 space-y-1.5">
              <span className="text-emerald-400 font-black block">2. SHA-256 Hash Matching</span>
              <p>The database stores only one-way SHA-256 hashes. Scanned tokens are verified mathematically against active reservations.</p>
            </div>
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-700 space-y-1.5">
              <span className="text-emerald-400 font-black block">3. Single-Use Check-In Lock</span>
              <p>Once scanned and verified, the booking is instantly locked as &apos;checked_in&apos;. Screenshots or duplicate scans are flagged immediately.</p>
            </div>
          </div>
        </div>

        {/* Dual Call to Action */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
            <h3 className="text-xl font-black text-slate-900">Need to Park Today?</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Find guaranteed parking spots in Madurai. Check availability and reserve your spot in under 60 seconds.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95"
            >
              <span>Explore Live Parking</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
            <h3 className="text-xl font-black text-slate-900">Have an Empty Space?</h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              List your driveway, empty plot, or business lot. Start accepting verified driver reservations.
            </p>
            <Link
              href="/list-your-space"
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95"
            >
              <span>List Your Space</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
