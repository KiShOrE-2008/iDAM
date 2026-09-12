'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';

export default function PrivacyPage() {
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
            <Lock className="w-4 h-4 text-emerald-700" />
            <span>Data Protection & Privacy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-gray-500 font-semibold">
            Last updated: September 2026 • Prototype / Demo Platform
          </p>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed font-medium flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block mb-0.5">Demo Platform Notice</strong>
              IDAM is a prototype/demo platform. Privacy and data retention policies shown here reflect platform standards for demonstration purposes.
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200/80 prose prose-emerald max-w-none text-sm leading-relaxed space-y-8">
          
          <p className="text-base text-gray-700 font-medium">
            <strong>IDAM | இடம்</strong> respects user privacy and is committed to protecting personal data. This Privacy Policy explains what information may be collected when you use the IDAM web or mobile platform and how it is processed.
          </p>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">Information We May Collect</h3>
            <p>Depending on the features you use, IDAM may collect:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 font-medium">
              <li>Full Name, Phone Number, and Email Address</li>
              <li>Vehicle Registration Number and Vehicle Category (Car / Bike)</li>
              <li>Approximate or Precise Geographic Location (for parking map discovery near Meenakshi Temple, etc.)</li>
              <li>Reservation History, Digital Pass Tokens, and Transaction Timestamps</li>
              <li>User Reviews, Ratings, and Support Feedback</li>
              <li>Device type, browser version, and IP address for security logging</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">How We Use Information</h3>
            <p>Collected information is utilized to:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 font-medium">
              <li>Authenticate users via secure Mobile OTP.</li>
              <li>Display nearby real-time parking spaces on OpenStreetMap.</li>
              <li>Generate digital QR parking passes and itemized tax invoice bills.</li>
              <li>Process simulated transactions and sync gate entries.</li>
              <li>Prevent fraudulent bookings or unauthorized space access.</li>
              <li>Provide dedicated customer support and handle grievances.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">Location Data Permissions</h3>
            <p>
              IDAM uses device location data to center the interactive OpenStreetMap around your current location or destination in Madurai. You can enable or disable location permissions at any time via your browser or mobile settings.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">Payment Security</h3>
            <p>
              IDAM does not store sensitive payment card details or CVVs. All production transactions are directed through PCI-DSS compliant third-party payment gateways (UPI, GPay, Net Banking).
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">Data Sharing & Third Parties</h3>
            <p>
              We do not sell personal data. Information is shared strictly with necessary infrastructure providers (hosting, map tiles, SMS gateways) or authorized parking space operators to fulfill confirmed reservations.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">Data Security & Retention</h3>
            <p>
              IDAM employs SSL/TLS encryption and strict access controls. Data is retained only as long as necessary to fulfill operational, legal, or accounting requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">Contact Privacy Officer</h3>
            <p>
              For privacy requests, data deletion inquiries, or feedback, please reach out via our <Link href="/contact" className="text-emerald-700 font-bold underline">Contact Us</Link> page.
            </p>
          </section>

        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
