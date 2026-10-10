'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Shield, Lock, QrCode, Server, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SecurityPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="Security & Pass Integrity"
      titleTa="பாதுகாப்பு மற்றும் நம்பகத்தன்மை"
      subtitle="How iDAM protects parking data, safeguards financial transactions, and enforces cryptographic anti-counterfeit QR pass verification."
      subtitleTa="பார்க்கிங் தரவு பாதுகாப்பு மற்றும் போலி பாஸ்களைத் தடுக்கும் கிரிப்டோகிராஃபிக் சரிபார்ப்பு பற்றிய தகவல்."
      badge="Infrastructure & Trust"
      breadcrumbs={[{ label: 'Security' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
        
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Security Architecture • Last Audited: October 2026 • Environment: Production Hardened
          </p>
        </div>

        {/* 1. Overview */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            1. Security by Design
          </h2>
          <p>
            Parking infrastructure involves physical access to private property, real-time vehicle positioning, and monetary transactions. Security at <strong>iDAM | இடம்</strong> is built from the ground up to prevent unauthorized gate access, counterfeit passes, and data interception.
          </p>
        </section>

        {/* 2. Core Security Pillars */}
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900">2. Security Architecture Pillars</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Cryptographic QR Validation
              </div>
              <p className="text-xs text-slate-600">
                Each digital pass generates an HMAC-SHA-256 signed signature combined with dynamic rotating tokens. This prevents screen recording replay attacks and counterfeit pass duplication at parking entry gates.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Server className="w-4 h-4 text-emerald-600" />
                Database Row-Level Security (RLS)
              </div>
              <p className="text-xs text-slate-600">
                All Supabase PostgreSQL database tables enforce strict tenant-isolated Row Level Security policies. Drivers can only query their own vehicle garage and bookings; space owners can only review passes for their verified lots.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Lock className="w-4 h-4 text-emerald-600" />
                Transport & Rest Encryption
              </div>
              <p className="text-xs text-slate-600">
                All communications between mobile Android clients and cloud endpoints use TLS 1.3 with strict HTTPS enforcement. All database records, storage buckets, and backups are encrypted at rest using AES-256.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Key className="w-4 h-4 text-emerald-600" />
                PCI-DSS Payment Tokenization
              </div>
              <p className="text-xs text-slate-600">
                Online payments are delegated to PCI-DSS Level 1 compliant gateways (Razorpay). No debit/credit card numbers or UPI PINs are ever transmitted or stored on iDAM application servers.
              </p>
            </div>

          </div>
        </section>

        {/* 3. Vulnerability Reporting & Responsible Disclosure */}
        <section className="space-y-4 p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-emerald-700" />
            3. Vulnerability Reporting & Safe Harbor
          </h2>
          <p className="text-slate-700">
            We value independent security research and welcome reports of potential security vulnerabilities. We commit to working with researchers in good faith under our Safe Harbor principles.
          </p>

          <div className="space-y-2 text-xs text-slate-800">
            <p><strong>Rules of Engagement:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Do not compromise privacy or modify data belonging to other users.</li>
              <li>Do not attempt denial-of-service (DoS) attacks or disrupt gate check-in systems.</li>
              <li>Allow us reasonable time (up to 30 days) to resolve issues before public disclosure.</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200/60 pt-3">
            <div>
              <p className="text-xs font-bold text-slate-900">Dedicated Security Contact:</p>
              <a href="mailto:security@idam.park" className="text-emerald-700 font-mono font-black text-xs hover:underline">
                security@idam.park
              </a>
            </div>
            <Link
              href="/contact?category=security"
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors text-xs"
            >
              Report via Secure Form
            </Link>
          </div>
        </section>

        {/* 4. Cross Links */}
        <section className="border-t border-slate-100 pt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
          <span>Related resources:</span>
          <Link href="/privacy-policy" className="text-emerald-700 hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="text-emerald-700 hover:underline">Terms of Service</Link>
          <span>•</span>
          <Link href="/how-it-works" className="text-emerald-700 hover:underline">Pass Architecture in How It Works</Link>
        </section>

      </div>
    </PageContainer>
  );
}
