'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { MapPin, ShieldCheck, Zap, Users, Building2, Globe, Heart, ArrowRight, Compass, Clock, CheckCircle2, Cpu } from 'lucide-react';

export default function AboutPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="About iDAM | இடம்"
      titleTa="இடம் பற்றி — எங்கள் பார்வை"
      subtitle="Transforming unknown urban parking availability into searchable, guaranteed inventory for Tamil Nadu."
      subtitleTa="மதுரையின் பார்க்கிங் நெரிசலைத் தீர்க்கும் நவீன ஸ்மார்ட் பார்க்கிங் தளம்."
      badge="Our Mission & Platform Story"
      breadcrumbs={[{ label: 'About Us' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="space-y-12">
        
        {/* The Core Problem */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-5">
          <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>The Urban Challenge</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            The Problem: Hidden Inventory & Street Cruising
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            In dense heritage cities like Madurai, the primary traffic bottleneck isn&apos;t just vehicle volume — it is <strong className="text-slate-900">information asymmetry</strong>. Over 30% of downtown traffic in temple zones consists of drivers circling blocks looking for parking spaces that they cannot see. Meanwhile, private driveways, commercial basements, and community lots sit half-empty behind closed gates.
          </p>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            <strong className="text-slate-900">iDAM (இடம்)</strong> bridges this divide by aggregating private, commercial, and institutional parking inventory into a real-time, searchable marketplace with advance reservations and cryptographic QR passes.
          </p>
        </div>

        {/* Before vs After Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-rose-800 font-black text-sm uppercase tracking-wide">
              <span>❌ The Street Cruising Way</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 font-medium">
              <li className="flex items-start space-x-2">
                <span className="text-rose-500 font-black">•</span>
                <span>Driving to destination blindly hoping to find street curb space.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-500 font-black">•</span>
                <span>Circling congested blocks 3–4 times during peak puja or market hours.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-500 font-black">•</span>
                <span>Unregulated cash fees, no receipts, and anxiety over vehicle safety.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-rose-500 font-black">•</span>
                <span>Wasted fuel, elevated carbon emissions, and 25+ minutes of delay.</span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl border border-emerald-900">
            <div className="flex items-center space-x-2 text-emerald-400 font-black text-sm uppercase tracking-wide">
              <span>✅ The iDAM Smart Way</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-emerald-100 font-medium">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-black">•</span>
                <span>Search destination in advance on live PostGIS spatial map.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-black">•</span>
                <span>Pick dedicated spot (Car, Bike, EV) with upfront pricing breakdown.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-black">•</span>
                <span>Instant payment with instant cryptographic QR pass on phone.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-black">•</span>
                <span>Navigate straight to slot, scan QR at gate, and park with confidence.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Mission & Product Pillars */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Our Core Platform Pillars
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Built on modern engineering principles to ensure trust, speed, and reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-slate-900">Hyper-Local Spatial Indexing</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Utilizing PostgreSQL & PostGIS spatial indexing for instant millisecond distance calculations and walking routes.
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-slate-900">Cryptographic Verification</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each digital pass has high-entropy SHA-256 tokens to prevent pass duplication and ensure authenticated parking access.
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-slate-900">Empowering Local Owners</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enabling homeowners and business lots to monetize empty space effortlessly with live occupancy tracking and dynamic rates.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-2xl font-black">Experience the Future of Parking</h3>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium">
              Explore live parking spots in Madurai or list your private driveway today.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/explore"
              className="bg-white hover:bg-slate-100 text-slate-900 font-black px-5 py-3 rounded-2xl text-xs shadow-md transition-all active:scale-95"
            >
              Find Parking
            </Link>
            <Link
              href="/owners"
              className="bg-slate-950 hover:bg-slate-900 text-white font-black px-5 py-3 rounded-2xl text-xs shadow-md transition-all active:scale-95 border border-emerald-400/40"
            >
              For Owners
            </Link>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
