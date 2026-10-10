'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Cookie, ShieldCheck, Settings, CheckCircle2, Info } from 'lucide-react';

export default function CookiePolicyPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="Cookie & Storage Policy"
      titleTa="குக்கீ மற்றும் சேமிப்பகக் கொள்கை"
      subtitle="How iDAM | இடம் uses local storage and cookies to maintain your session, language preference, and vehicle garage settings without third-party tracking."
      subtitleTa="உங்கள் அமர்வு, மொழி மற்றும் வாகன அமைப்புகளை பராமரிக்க iDAM எவ்வாறு குக்கீகளைப் பயன்படுத்துகிறது."
      badge="Data Privacy"
      breadcrumbs={[{ label: 'Cookie Policy' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
        
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Effective Date: October 10, 2026 • Scope: iDAM Web Platform & Progressive Mobile App
          </p>
        </div>

        {/* 1. What Are Cookies and Local Storage */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Cookie className="w-5 h-5 text-emerald-600" />
            1. What Are Cookies & Local Browser Storage?
          </h2>
          <p>
            Cookies and browser LocalStorage are small data files or key-value entries stored directly on your computer or mobile device when you access <strong>iDAM | இடம்</strong>. They allow our web application to recognize your browser, keep you signed in securely across page reloads, and remember your regional language preferences (English or Tamil).
          </p>
        </section>

        {/* 2. Our No-Ad Tracking Guarantee */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-emerald-950">
            <strong className="font-black">Our Zero Third-Party Advertising Guarantee:</strong>
            <p className="mt-1 text-emerald-800">
              iDAM does not use cross-site tracking pixels, third-party advertising cookies, or behavioral profiling trackers (such as Facebook Pixel or third-party ad networks). We only use strictly necessary and functional storage required to operate parking reservations safely.
            </p>
          </div>
        </div>

        {/* 3. Types of Cookies & Storage We Use */}
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900">2. Categories of Storage We Use</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-900 font-black text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3 border-b border-slate-200">Category</th>
                  <th className="p-3 border-b border-slate-200">Storage Key / Name</th>
                  <th className="p-3 border-b border-slate-200">Purpose</th>
                  <th className="p-3 border-b border-slate-200">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                <tr>
                  <td className="p-3 font-bold text-slate-900">Strictly Necessary</td>
                  <td className="p-3 font-mono text-emerald-700">sb-auth-token</td>
                  <td className="p-3">Maintains authenticated Supabase session and JWT for secure API calls.</td>
                  <td className="p-3">Session / Refresh Token</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Preferences</td>
                  <td className="p-3 font-mono text-emerald-700">idam_language</td>
                  <td className="p-3">Remembers language selection (English vs Tamil) across navigation.</td>
                  <td className="p-3">Persistent (LocalStorage)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Functional</td>
                  <td className="p-3 font-mono text-emerald-700">idam_saved_vehicles</td>
                  <td className="p-3">Saves registered license plates in your local Garage for one-tap slot booking.</td>
                  <td className="p-3">Persistent (LocalStorage)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Demo State</td>
                  <td className="p-3 font-mono text-emerald-700">idam_demo_mode</td>
                  <td className="p-3">Differentiates sandboxed demo sessions from production live data.</td>
                  <td className="p-3">Browser Session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Managing Your Cookies */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            3. How to Control and Manage Cookies
          </h2>
          <p>
            You can modify your browser settings to decline or clear cookies at any time:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Chrome / Android:</strong> Settings → Privacy and Security → Third-party cookies.</li>
            <li><strong>Safari / iOS:</strong> Settings → Safari → Advanced → Block All Cookies.</li>
            <li><strong>Firefox:</strong> Settings → Privacy & Security → Enhanced Tracking Protection.</li>
          </ul>
          <p className="text-slate-500 text-xs">
            <em>Note: Clearing essential authentication tokens will sign you out and require logging back in before reserving parking or retrieving your active QR pass.</em>
          </p>
        </section>

        {/* 5. Related Policies */}
        <section className="border-t border-slate-100 pt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-900">Need more information?</h3>
            <p className="text-slate-500 text-xs">Read how we protect your vehicle plate and contact information.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/privacy-policy"
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors text-xs"
            >
              Privacy Policy
            </Link>
            <Link
              href="/privacy-requests"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-xs"
            >
              Privacy Requests
            </Link>
          </div>
        </section>

      </div>
    </PageContainer>
  );
}
