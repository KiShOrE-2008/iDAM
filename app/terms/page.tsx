'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';

export default function TermsPage() {
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
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs text-gray-500 font-semibold">
            Last updated: September 2026 • Prototype / Demo Platform
          </p>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed font-medium flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block mb-0.5">Demo Platform Notice</strong>
              IDAM is a prototype/demo platform. Parking availability, pricing, locations, and transactions shown in demo environments are for demonstration purposes only.
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200/80 prose prose-emerald max-w-none text-sm leading-relaxed space-y-8">
          
          <div>
            <p className="text-base text-gray-700 leading-relaxed font-medium">
              Welcome to <strong>IDAM | இடம்</strong>. By accessing or using the IDAM website, application, or digital parking discovery services, you agree to be bound by these Terms & Conditions.
            </p>
          </div>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">1. About IDAM</h3>
            <p>
              IDAM is a location-based technology platform designed to help drivers discover, navigate to, and reserve available parking spaces in Madurai.
            </p>
            <p>
              IDAM connects drivers with authorized parking-space owners or commercial parking operators. A parking space may only be listed on IDAM by a person, business, or organization that is legally authorized to offer that space.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">2. User Accounts</h3>
            <p>Users of the IDAM platform are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 font-medium">
              <li>Providing accurate, complete account and vehicle registration information.</li>
              <li>Keeping their OTP verification details and account access secure.</li>
              <li>Using the platform strictly for lawful, non-fraudulent parking purposes.</li>
              <li>Not sharing or transferring their digital parking passes or account access to unauthorized parties.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts involved in fraudulent, abusive, or unauthorized activity.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">3. Parking Listings</h3>
            <p>Parking space owners and operators are responsible for ensuring that:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 font-medium">
              <li>They possess the necessary legal ownership rights, leases, or authorizations to offer the parking space.</li>
              <li>Listing details, vehicle type compatibility, rates, and operating hours are accurate.</li>
              <li>The parking location is safe, accessible, and suitable for normal parking use.</li>
            </ul>
            <p>
              IDAM does not guarantee that every listed parking space will always remain accessible, vacant, or uninterrupted due to unforeseen site conditions or local traffic regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">4. Reservations & Digital Passes</h3>
            <p>
              Upon successful confirmation of a parking booking, the user receives a digital parking pass containing a unique QR code and pass reference (e.g., <code>IDM-82931</code>).
            </p>
            <p>
              Drivers must arrive within their confirmed reservation timeframe and comply with on-site attendant or gate system instructions. A reservation grants temporary vehicle parking permission and does not grant permanent tenancy or property ownership.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">5. Payments</h3>
            <p>
              Applicable hourly tariffs, convenience fees, and taxes are clearly displayed prior to booking confirmation.
            </p>
            <p className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-emerald-950 font-medium">
              <strong>Prototype Notice:</strong> In this prototype version of IDAM, payment functionality is simulated and no real currency or financial transaction is executed. Production versions will integrate regulated payment gateways compliant with RBI guidelines.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">6. Cancellation and Refunds</h3>
            <p>
              Reservation cancellations are governed by the IDAM Cancellation & Refund Policy. IDAM reserves the right to modify or cancel a booking in cases of technical error, inaccurate space availability, or emergency site restrictions.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">7. Prohibited Activities</h3>
            <p>Users must not:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 font-medium">
              <li>Create fake bookings, fraudulent user accounts, or false vehicle registrations.</li>
              <li>Manipulate spot availability counters or pricing data.</li>
              <li>Damage, trespass, or misuse private parking premises.</li>
              <li>Attempt to bypass gate hardware, QR scanners, or software security mechanisms.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">8. Property and Vehicle Responsibility</h3>
            <p>
              Users remain solely responsible for their parked vehicles, personal belongings, and valuables. Unless explicitly required by applicable Indian law, IDAM is not liable for loss, theft, or physical damage to vehicles or belongings occurring within third-party parking premises.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">9. Platform Availability</h3>
            <p>
              We strive to keep IDAM available 24/7. However, services may be temporarily interrupted for system maintenance, network connectivity issues, or third-party mapping/server downtime.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-gray-900">10. Contact</h3>
            <p>
              For queries or grievances regarding these terms, please contact our support team via our <Link href="/contact" className="text-emerald-700 font-bold underline">Contact & Grievance Section</Link>.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-100 font-bold text-gray-900">
            By using IDAM | இடம், you acknowledge that you have read and agreed to these Terms & Conditions.
          </div>

        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
