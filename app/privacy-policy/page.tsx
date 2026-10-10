'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Shield, Lock, FileText, UserCheck, Eye, Database, ArrowRight } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="Privacy Policy"
      titleTa="தனியுரிமைக் கொள்கை"
      subtitle="How iDAM | இடம் collects, uses, protects, and handles your personal data in accordance with the Digital Personal Data Protection (DPDP) Act."
      subtitleTa="உங்கள் தனிப்பட்ட தகவல்கள் எவ்வாறு பாதுகாக்கப்படுகின்றன என்பது பற்றிய தகவல்."
      badge="Legal & Data Governance"
      breadcrumbs={[{ label: 'Privacy Policy' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
        
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Effective Date: October 10, 2026 • Platform: iDAM Mobile App & Web Portal
          </p>
        </div>

        {/* 1. Introduction */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">1. Introduction & Scope</h2>
          <p>
            iDAM | இடம் (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates a smart parking discovery and advance reservation technology platform. This Privacy Policy governs the collection, processing, and protection of personal data provided by drivers, vehicle owners, and space owners (&quot;Users&quot;) across our mobile applications, web portals, and APIs.
          </p>
          <p>
            We are committed to transparent data practices under the Indian Digital Personal Data Protection (DPDP) Act and applicable Information Technology laws.
          </p>
        </section>

        {/* 2. Data We Collect */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-black text-slate-900">2. Personal Data We Collect</h2>
          <p>We collect only data necessary to fulfill parking reservations and gate verification:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-900">Identity & Contact Data:</strong> Full name, verified mobile phone number, email address.</li>
            <li><strong className="text-slate-900">Vehicle Data:</strong> Motor vehicle registration plate numbers (e.g. TN 59 AB 1234), vehicle category (Car, Bike, SUV, EV), and optional vehicle nickname saved in your private Garage.</li>
            <li><strong className="text-slate-900">Location Data:</strong> Device geographic coordinates (only when permitted by browser/OS permissions) used to compute walking distances and nearby parking spots. We do not track your location in the background when the app is closed.</li>
            <li><strong className="text-slate-900">Reservation & Transaction History:</strong> Booking timestamps, selected parking slots, payment reference IDs (Razorpay transaction IDs), and pass tokens.</li>
            <li><strong className="text-slate-900">Parking Space Listing Data:</strong> For property owners, property address, slot capacity, photos, and payout bank/UPI details.</li>
          </ul>
        </section>

        {/* 3. Payment Data */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">3. Payment & Financial Data</h2>
          <p>
            All online monetary transactions are handled by PCI-DSS Level 1 certified payment gateways (such as Razorpay). <strong className="text-slate-900">iDAM does not store full credit card numbers, CVVs, or bank net banking passwords on our servers.</strong> We store only tokenized payment reference identifiers to confirm booking settlement and issue refunds.
          </p>
        </section>

        {/* 4. Purpose of Processing */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">4. Purpose of Data Processing</h2>
          <p>Your data is processed strictly for the following operational purposes:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>To match drivers with available parking spaces in Madurai.</li>
            <li>To generate cryptographically signed digital QR passes and verify vehicle plate identity at entrance gates.</li>
            <li>To process instant booking cancellations and 100% refunds.</li>
            <li>To facilitate customer support tickets and dispute resolution.</li>
            <li>To detect fraudulent pass duplication or unauthorized lot access.</li>
          </ul>
        </section>

        {/* 5. Data Sharing */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">5. Data Sharing & Third Parties</h2>
          <p>
            <strong className="text-slate-900">We do not sell, rent, or trade personal data to third-party advertisers.</strong> Data is shared only with:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-900">Parking Lot Attendants / Owners:</strong> Only your vehicle plate and pass reference code are displayed to the attendant during QR check-in to confirm authorization.</li>
            <li><strong className="text-slate-900">Payment Processors:</strong> Razorpay for transaction authorization and settlement.</li>
            <li><strong className="text-slate-900">Cloud Infrastructure:</strong> Supabase and PostgreSQL with strict encryption and Row-Level Security (RLS) enforcement.</li>
          </ul>
        </section>

        {/* 6. Data Retention and Deletion */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">6. Data Retention & User Rights</h2>
          <p>
            We retain booking logs for statutory tax compliance. You have the right to request access, correction, or permanent erasure of your personal data and vehicle garage records at any time.
          </p>
          <p>
            To submit an erasure request, visit our <Link href="/account-deletion" className="text-emerald-700 font-black underline">Account Deletion Page</Link> or email <a href="mailto:privacy@idam.park" className="text-emerald-700 font-black underline">privacy@idam.park</a>.
          </p>
        </section>

        {/* 7. Contact */}
        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base sm:text-lg font-black text-slate-900">7. Data Protection Officer Contact</h2>
          <p>
            For inquiries regarding privacy, data rights, or DPDP Act compliance, contact:
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 space-y-1">
            <p className="font-black text-slate-900">Data Protection Officer, iDAM | இடம்</p>
            <p>124 West Masi Street, Madurai, Tamil Nadu 625001, India</p>
            <p>Email: <a href="mailto:privacy@idam.park" className="text-emerald-700 font-bold">privacy@idam.park</a></p>
          </div>
        </section>

      </div>
    </PageContainer>
  );
}
