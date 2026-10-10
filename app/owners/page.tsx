'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Building2, Plus, ShieldCheck, DollarSign, Calendar, Clock, CheckCircle2, QrCode, ArrowRight, HelpCircle, Layers, Sliders, Smartphone } from 'lucide-react';

export default function OwnersPage() {
  const [lang, setLang] = useState<Language>('en');

  const propertyTypes = [
    {
      title: 'Residential Driveways',
      desc: 'Got an empty driveway during working hours or weekends? Monetize 1–2 car slots easily while you are away.',
      idealFor: 'Independent houses near temple areas, markets, or schools'
    },
    {
      title: 'Commercial Basements & Lots',
      desc: 'Offices, marriage halls, and commercial complexes with unused bays on non-peak days or nights.',
      idealFor: 'Shops and complexes on West Masi, North Veli, or Bypass road'
    },
    {
      title: 'Gated Apartment Visitor Bays',
      desc: 'Apartment associations managing surplus visitor parking bays during working weekdays.',
      idealFor: 'Residential societies seeking community revenue'
    },
    {
      title: 'Vacant Land & Open Plots',
      desc: 'Fenced empty urban plots near major transit hubs converted to organized multi-vehicle parking.',
      idealFor: 'Plot owners near Railway Station or Mattuthavani Bus Stand'
    }
  ];

  const managementFeatures = [
    {
      icon: Sliders,
      title: 'Dynamic Yield & Pricing Control',
      desc: 'You set your own hourly and daily rates for cars and two-wheelers. Adjust rates for festival seasons or weekends anytime.'
    },
    {
      icon: Clock,
      title: 'Flexible Operating Schedules',
      desc: 'Define exact opening and closing hours and available days. Need your space back for family? Toggle maintenance mode with 1 tap.'
    },
    {
      icon: QrCode,
      title: 'Smartphone QR Pass Scanner',
      desc: 'Zero hardware costs. Use any standard Android or iOS camera to scan driver QR passes with millisecond validation.'
    },
    {
      icon: ShieldCheck,
      title: 'Verified Drivers & Security',
      desc: 'Every reservation requires authenticated phone and vehicle license plate registration. No unauthorized anonymous parking.'
    }
  ];

  const onboardingSteps = [
    {
      step: '1',
      title: 'Submit Property Details',
      desc: 'Use our 6-step online listing wizard to enter your address, car/bike slot count, operating hours, and photos.'
    },
    {
      step: '2',
      title: 'Safety & Address Verification',
      desc: 'Our operations team reviews your space (status: Pending Review) to ensure safe vehicle ingress/egress.'
    },
    {
      step: '3',
      title: 'Start Receiving Bookings',
      desc: 'Once approved, your space appears on the live map. Drivers discover, reserve, and pay in advance.'
    }
  ];

  return (
    <PageContainer
      title="Monetize Your Parking Space"
      titleTa="உங்கள் பார்க்கிங் இடத்தை வருமானமாக மாற்றுங்கள்"
      subtitle="Join iDAM as a verified parking space partner. Turn underutilized driveways, commercial basements, or vacant plots into steady recurring income."
      subtitleTa="வெற்று பார்க்கிங் இடங்களை பாதுகாப்பான முறையில் வாடகைக்கு விடுங்கள்."
      badge="For Property & Parking Owners"
      breadcrumbs={[{ label: 'For Owners' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="space-y-16">
        
        {/* Hero Value Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
              Zero Upfront Investment
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Turn Empty Pavement into Predictable Daily Earnings
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
              Parking demand in central Madurai consistently exceeds street capacity. By listing your idle parking space on iDAM, you help alleviate city street congestion while generating transparent digital payouts.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/list-your-space"
              className="w-full sm:w-auto text-center bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3.5 rounded-2xl text-xs shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>List Your Space Now</span>
            </Link>

            <Link
              href="/owner"
              className="w-full sm:w-auto text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-6 py-3.5 rounded-2xl text-xs transition-colors"
            >
              Access Owner Portal Demo
            </Link>
          </div>
        </div>

        {/* Suitable Space Types Grid */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              What Kinds of Spaces Can You List?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Whether you have a single car porch or a 50-vehicle commercial basement, iDAM works for every property size.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {propertyTypes.map((pt, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3"
              >
                <div className="flex items-center space-x-2 text-emerald-700 font-black text-sm">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>{pt.title}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {pt.desc}
                </p>
                <div className="text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                  <span className="font-extrabold text-slate-700">Best for:</span> {pt.idealFor}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Management Controls */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Complete Control Over Your Property
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              You decide who parks, when they park, and how much you charge.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {managementFeatures.map((mf, idx) => {
              const Icon = mf.icon;
              return (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900">{mf.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {mf.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification and Approval Process */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Listing Review & Approval Process
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              To ensure safety and reliability for drivers, every new listing undergoes a structured review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {onboardingSteps.map((st, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                <div className="w-8 h-8 rounded-full bg-slate-950 text-white font-black text-xs flex items-center justify-center">
                  {st.step}
                </div>
                <h4 className="font-black text-sm text-slate-900">{st.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Call To Action */}
        <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-2xl font-black">Ready to List Your Space?</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Listing takes less than 3 minutes. Start earning from your empty driveway or lot.
            </p>
          </div>

          <Link
            href="/list-your-space"
            className="inline-flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <span>Start Listing Application</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </PageContainer>
  );
}
