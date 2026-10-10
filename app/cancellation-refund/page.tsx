'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

export default function CancellationRefundPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="Cancellation & Refund Policy"
      titleTa="முன்பதிவு ரத்து மற்றும் பணத்தைத் திரும்பப் பெறுதல்"
      subtitle="Clear, fair, and transparent cancellation guidelines and instant refund timelines for all iDAM parking reservations."
      subtitleTa="எளிமையான மற்றும் விரைவான பணத்தைத் திரும்பப் பெறும் விதிமுறைகள்."
      badge="Consumer Protection & Guarantee"
      breadcrumbs={[{ label: 'Cancellation & Refund' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
        
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Policy Effective: October 10, 2026 • 100% Instant Refund Guarantee
          </p>
        </div>

        {/* Highlight Banner */}
        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl flex items-start space-x-3 text-emerald-950">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-black text-sm">30-Minute Free Cancellation Guarantee</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Plans change! Cancel your reservation up to 30 minutes before your scheduled arrival time for an immediate 100% refund with zero cancellation fees.
            </p>
          </div>
        </div>

        {/* 1. Cancellation Windows Table */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-black text-slate-900">1. Cancellation Windows & Refund Schedule</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-900">
                  <th className="p-3.5">Time of Cancellation</th>
                  <th className="p-3.5">Refund Percentage</th>
                  <th className="p-3.5">Deduction / Fee</th>
                  <th className="p-3.5">Processing Speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                <tr>
                  <td className="p-3.5 font-bold text-slate-900">&gt; 30 minutes before arrival</td>
                  <td className="p-3.5 text-emerald-700 font-black text-sm">100% Full Refund</td>
                  <td className="p-3.5 text-slate-500">₹0 (Zero fee)</td>
                  <td className="p-3.5 text-emerald-800 font-bold">Instant (within minutes)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-slate-900">Within 30 minutes of arrival</td>
                  <td className="p-3.5 text-amber-700 font-bold">80% Refund</td>
                  <td className="p-3.5 text-slate-500">20% Host retention compensation</td>
                  <td className="p-3.5 text-slate-700">Instant (within minutes)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-slate-900">After scheduled start time / No-Show</td>
                  <td className="p-3.5 text-rose-700 font-bold">Non-refundable</td>
                  <td className="p-3.5 text-slate-500">100% held for reserved spot lock</td>
                  <td className="p-3.5 text-slate-400">N/A</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Refund Processing Methods */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-black text-slate-900">2. How Refunds Are Credited</h2>
          <p>
            When a cancellation is confirmed in the app or website, the refund is initiated automatically by our system via Razorpay:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-900">UPI Payments (GPay, PhonePe, Paytm):</strong> Credited back to the originating bank account within 15 to 30 minutes.</li>
            <li><strong className="text-slate-900">iDAM Wallet:</strong> Credited immediately (0-second turnaround) with updated wallet balance available for your next reservation.</li>
            <li><strong className="text-slate-900">Credit / Debit Cards:</strong> Processed through banking switch networks within 3 to 5 standard banking business days.</li>
            <li><strong className="text-slate-900">Net Banking:</strong> Processed within 2 to 4 business days depending on your bank&apos;s settlement schedule.</li>
          </ul>
        </section>

        {/* 3. Host Cancellation or Inaccessible Spot */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">3. Inaccessible Spot & Host Non-Performance</h2>
          <p>
            If you arrive at the designated parking facility and find the assigned bay occupied, obstructed, or inaccessible due to host error, you are entitled to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>An immediate alternative priority bay at nearby partner locations, OR</li>
            <li>An immediate 100% full refund plus a ₹50 goodwill credit towards your next booking.</li>
          </ul>
        </section>

        {/* 4. How to Request Cancellation */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">4. How to Cancel Your Booking</h2>
          <p>You can execute a cancellation directly from your digital pass in 2 taps:</p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-600">
            <li>Navigate to <strong className="text-slate-900">&quot;My Passes&quot;</strong> in the bottom navigation bar or web menu.</li>
            <li>Select your active pass and tap the red <strong className="text-slate-900">&quot;Cancel Reservation&quot;</strong> button.</li>
            <li>Confirm cancellation. Your refund reference code is generated immediately on screen.</li>
          </ol>
        </section>

        {/* 5. Contact Support for Inquiries */}
        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base sm:text-lg font-black text-slate-900">5. Refund Disputes & Inquiries</h2>
          <p>
            If your refund does not appear in your account statement within the standard banking window, reach out to our billing desk with your Booking ID:
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <Link
              href="/contact"
              className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-black shadow-xs"
            >
              Contact Billing Desk
            </Link>
            <span className="text-xs text-slate-500 font-semibold">Email: refunds@idam.park</span>
          </div>
        </section>

      </div>
    </PageContainer>
  );
}
