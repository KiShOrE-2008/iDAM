'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, X } from 'lucide-react';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('idam_cookie_consent');
      if (!consent) {
        // Slight delay so it doesn't jarringly pop during initial load
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // Ignore if localStorage unavailable
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('idam_cookie_consent', 'accepted');
    } catch (e) {}
    setIsVisible(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('idam_cookie_consent', 'dismissed');
    } catch (e) {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in"
    >
      <div className="bg-slate-950/95 backdrop-blur-md text-white border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wide text-white">Cookie & Privacy Notice</h4>
              <p className="text-[11px] text-emerald-400 font-bold">Zero Advertising Trackers</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss cookie notice"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-medium">
          iDAM uses essential browser storage to preserve your login session, vehicle garage, and English/Tamil language choice. We never use ad networks or sell your data.
        </p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Link
            href="/cookie-policy"
            className="text-xs text-emerald-400 font-bold hover:underline"
          >
            Learn More
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
