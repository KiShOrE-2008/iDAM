'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';

export default function RefundPolicyPage() {
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
            <RefreshCw className="w-4 h-4 text-emerald-700" />
            <span>Fair Cancellation Standards</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-xs text-gray-500 font-semibold">
            Last updated: September 2026 • Prototype / Demo Platform
          </p>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed font-medium flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block mb-0.5">Demo Platform Notice</strong>
              In the IDAM demo environment, booking cancellations and refunds are simulated instantly without actual bank transfers.
            </div>
          </div>
        </div>

        {/* Policy Grid Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              100%
            </div>
            <h3 className="font-extrabold text-gray-900 text-sm">Cancel &gt; 1 Hour Before</h3>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Full refund of parking fare if cancelled more than 60 minutes before start time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              50%
            </div>
            <h3 className="font-extrabold text-gray-900 text-sm">Cancel Within 1 Hour</h3>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              50% refund for cancellations requested within 60 minutes of the reserved arrival slot.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
              100%
            </div>
            <h3 className="font-extrabold text-gray-900 text-sm">Site / Tech Disruption</h3>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Automatic 100% refund if space is occupied or gate malfunction prevents parking.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200/80 prose prose-emerald max-w-none text-sm leading-relaxed space-y-6">
          <h3 className="text-xl font-extrabold text-gray-900">1. User-Initiated Cancellations</h3>
          <p>
            Drivers can cancel their reservation directly from the <Link href="/dashboard" className="text-emerald-700 font-bold underline">Dashboard</Link> or <Link href="/my-bookings" className="text-emerald-700 font-bold underline">My Passes</Link> section prior to check-in.
          </p>

          <h3 className="text-xl font-extrabold text-gray-900">2. Owner / Operator Cancellations</h3>
          <p>
            If a space owner must cancel a confirmed reservation due to maintenance or emergency closure, the driver receives an immediate 100% refund plus priority rebooking options nearby.
          </p>

          <h3 className="text-xl font-extrabold text-gray-900">3. Refund Processing Timelines</h3>
          <p>
            For production transactions, approved refunds are credited back to the original payment method (UPI / Bank Account / Card) within 3-5 business days.
          </p>

          <h3 className="text-xl font-extrabold text-gray-900">4. Support & Disputed Charges</h3>
          <p>
            If you encounter any discrepancy, please log a claim via <Link href="/contact" className="text-emerald-700 font-bold underline">Help & Grievance Support</Link> within 24 hours of your booking slot.
          </p>
        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
