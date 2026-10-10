'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { MapPin, QrCode, ShieldCheck, Zap, Sliders, Smartphone, CheckCircle2, Clock, Car, Bike, Sparkles, ArrowRight, Shield } from 'lucide-react';

export default function FeaturesPage() {
  const [lang, setLang] = useState<Language>('en');

  const coreFeatures = [
    {
      icon: MapPin,
      badge: 'Active & Live',
      title: 'Hyper-Local Spot Discovery & Spatial Map',
      description: 'Search any landmark across Madurai. Built with PostGIS spatial computing to calculate real walking distance, walking duration, and verified parking availability.',
      highlights: ['Interactive Leaflet map with custom status markers', 'Filter by vehicle: Car, Bike, SUV, EV Charging', 'Real-time street walking distance & turn directions']
    },
    {
      icon: Sliders,
      badge: 'Active & Live',
      title: 'Spot Picker & Transparent Upfront Quotes',
      description: 'Choose your specific spot (e.g. Slot A-02, Slot B-04). See upfront pricing with itemized GST, platform protection, and instant discount codes before paying.',
      highlights: ['Visual spot grid showing available vs. occupied bays', 'Custom duration selection from 1 to 12 hours', 'Itemized receipt quotes with zero hidden charges']
    },
    {
      icon: QrCode,
      badge: 'Active & Live',
      title: 'Cryptographic QR Digital Parking Pass',
      description: 'Instant generation of tamper-proof digital passes. Passes use high-entropy 32-character tokens (IDAM:v2:...) verified against SHA-256 hashes on the server.',
      highlights: ['Instant in-app pass with high-contrast QR display', 'Live arrival countdown and navigation directions', 'Direct 1-tap pass cancellation with 100% instant refund']
    },
    {
      icon: Smartphone,
      badge: 'Active & Live',
      title: 'Owner QR Scanner with Physical Device Polish',
      description: 'Attendants and owners scan incoming passes with low latency. Features camera permission on mount, hardware flashlight toggle, and physical haptic vibration.',
      highlights: ['Real-time jsQR video frame decoding with scan reticle', 'Hardware torch/flashlight toggle for night-time lots', 'Manual alphanumeric code entry fallback (#IDM-82931)', 'Automatic camera stream release on navigation']
    },
    {
      icon: ShieldCheck,
      badge: 'Active & Live',
      title: 'One-Tap Check-In & Live Occupancy Tracking',
      description: 'Owners verify driver vehicle plate match, check in arriving cars with 1 tap, track live lot occupancy count, and perform check-out upon exit.',
      highlights: ['Instant plate match validation on scan', 'Live Currently Parked count with timestamp tracking', '1-tap check-out releasing spots back to live search']
    },
    {
      icon: Car,
      badge: 'Active & Live',
      title: 'User Garage & iDAM Wallet Quick Top-Up',
      description: 'Register multiple family vehicles with license plates and nicknames. Select your primary default vehicle for seamless 1-tap reservations.',
      highlights: ['Registered vehicle garage (Car, Bike, SUV, EV)', 'Default vehicle auto-fill during reservation', 'iDAM Wallet with instant UPI presets (₹100, ₹200, ₹500, ₹1000)']
    }
  ];

  const roadmapFeatures = [
    {
      title: 'ANPR Automatic Number Plate Recognition',
      status: 'In Development',
      desc: 'Automated camera-based barrier gate opening without manual scanning for enterprise parking lots.'
    },
    {
      title: 'EV Dynamic Smart Charging Integration',
      status: 'Coming Soon',
      desc: 'Real-time kilowatt-hour monitoring and automated charger scheduling linked with parking slot booking.'
    },
    {
      title: 'Monthly Subscriptions & Corporate Passes',
      status: 'Planned',
      desc: 'Recurring monthly parking passes for daily commuters and business employees around Madurai Junction.'
    }
  ];

  return (
    <PageContainer
      title="Platform Features & Capabilities"
      titleTa="iDAM வசதிகள் மற்றும் சிறப்பம்சங்கள்"
      subtitle="Engineered for drivers and parking owners: guaranteed spot reservations, cryptographic QR passes, and live occupancy yield management."
      subtitleTa="பாதுகாப்பான QR பாஸ், துல்லியமான மேப், மற்றும் பார்க்கிங் உரிமையாளர் மேலாண்மை."
      badge="Comprehensive Feature Tour"
      breadcrumbs={[{ label: 'Features' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="space-y-16">
        
        {/* Core Live Features Grid */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Production & Investor Demo Features
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Every feature listed below is fully implemented, verified, and operational in the iDAM application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coreFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md space-y-4 hover:border-emerald-400/60 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      {feat.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-slate-900">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {feat.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {feat.highlights.map((item, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs text-slate-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Future Roadmap Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Future Innovation Roadmap</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Upcoming Capabilities (Post-MVP)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Clearly differentiated from our existing live features for investor and user transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {roadmapFeatures.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md inline-block uppercase">
                  {item.status}
                </span>
                <h4 className="font-black text-sm text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-2xl font-black">Try the Interactive Features Today</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Explore parking near Meenakshi Temple or test the Owner Scanner simulator.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/explore"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs shadow-md transition-all active:scale-95"
            >
              Explore Live Map
            </Link>
            <Link
              href="/how-it-works"
              className="bg-slate-800 hover:bg-slate-700 text-white font-black px-5 py-3 rounded-2xl text-xs transition-all active:scale-95"
            >
              See How It Works
            </Link>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
