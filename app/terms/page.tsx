'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { FileText, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TermsPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="Terms of Service"
      titleTa="சேவை விதிமுறைகள் மற்றும் நிபந்தனைகள்"
      subtitle="The contractual terms governing your use of iDAM | இடம் parking reservations, pass issuance, and space listing services."
      subtitleTa="iDAM தளத்தைப் பயன்படுத்துவதற்கான விதிமுறைகள்."
      badge="User Agreement & Platform Rules"
      breadcrumbs={[{ label: 'Terms of Service' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
        
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Last Updated: October 10, 2026 • Applicable to Drivers and Parking Hosts
          </p>
        </div>

        {/* 1. Acceptance */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By creating an account, browsing parking inventory, booking a reservation, or listing a parking space on iDAM | இடம் (&quot;Platform&quot;), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not access or use the platform.
          </p>
        </section>

        {/* 2. Platform Role */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">2. Marketplace Role</h2>
          <p>
            iDAM operates as a technology marketplace that connects independent property/lot owners (&quot;Hosts&quot;) with drivers seeking parking spaces (&quot;Drivers&quot;). Except where explicitly stated otherwise, iDAM does not own, lease, operate, or maintain the physical parking lots, nor do we provide parking valet or custodial security services.
          </p>
        </section>

        {/* 3. Driver Responsibilities */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">3. Driver Rights & Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-900">Accurate Vehicle Information:</strong> Drivers must enter their genuine license plate registration and vehicle type (Car, Bike, SUV, EV). Vehicles not matching the digital pass may be denied entry.</li>
            <li><strong className="text-slate-900">Timely Arrival & Departure:</strong> Drivers must vacate the assigned slot by the end of their booked window. Overstaying beyond 15 minutes of the grace period may incur additional hourly overstay charges.</li>
            <li><strong className="text-slate-900">Safe Vehicle Operation:</strong> Drivers are responsible for operating their vehicles safely within the lot and must not park in undesignated aisles or emergency exits.</li>
            <li><strong className="text-slate-900">Valuables:</strong> Drivers are advised not to leave cash or high-value personal belongings unattended inside parked vehicles.</li>
          </ul>
        </section>

        {/* 4. Space Owner Responsibilities */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">4. Space Owner / Host Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong className="text-slate-900">Authorized Legal Right:</strong> Hosts represent that they hold lawful title, lease, or management authority to permit parking on the listed property.</li>
            <li><strong className="text-slate-900">Slot Availability:</strong> Once a driver booking is confirmed, the host must guarantee that the assigned spot is clean, accessible, and unobstructed.</li>
            <li><strong className="text-slate-900">Pass Verification:</strong> Hosts must verify the driver’s digital QR pass via the iDAM Owner Scanner or verify the alphanumeric code before permitting entry.</li>
            <li><strong className="text-slate-900">Pricing Transparency:</strong> Hosts agree not to demand extra offline cash fees from drivers who have paid through the platform.</li>
          </ul>
        </section>

        {/* 5. Payments & Cancellations */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">5. Payments, Fees & Refunds</h2>
          <p>
            Drivers pay the upfront quoted amount including applicable GST and platform service fee. Free cancellation is permitted up to 30 minutes prior to the start time with an instant 100% refund. Cancellations made inside 30 minutes are subject to our <Link href="/cancellation-refund" className="text-emerald-700 font-bold underline">Cancellation & Refund Policy</Link>.
          </p>
        </section>

        {/* 6. Limitation of Liability */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable Indian law, iDAM shall not be liable for indirect, incidental, or consequential damages resulting from vehicle theft, vehicular collisions on private lots, weather damage, or personal disputes between drivers and property owners. The maximum platform liability shall not exceed the total fees paid by the user for the relevant booking.
          </p>
        </section>

        {/* 7. Dispute Resolution & Governing Law */}
        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base sm:text-lg font-black text-slate-900">7. Governing Law & Jurisdiction</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the competent courts in Madurai, Tamil Nadu.
          </p>
          <p>
            For legal inquiries or notices, write to <a href="mailto:legal@idam.park" className="text-emerald-700 font-bold">legal@idam.park</a>.
          </p>
        </section>

      </div>
    </PageContainer>
  );
}
