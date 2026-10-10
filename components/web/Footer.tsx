'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Heart, Shield, Lock, ExternalLink } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <footer className="w-full bg-slate-100/60 py-10 px-4 sm:px-6 lg:px-8 mt-12 border-t border-slate-200/50">
      <div className="max-w-7xl mx-auto bg-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800 space-y-10">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Brand Info */}
          <div className="sm:col-span-2 space-y-3">
            <Link href="/" className="inline-block bg-white rounded-2xl p-2.5 shadow-sm hover:opacity-95 transition-opacity">
              <img
                src="/idam-logo.png"
                alt="iDAM | இடம் Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <h3 className="text-sm font-black text-white tracking-wide">IDAM | இடம்</h3>
            <p className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider">Find your space.</p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Smart parking discovery and advance reservation platform in Madurai. Real-time availability near Meenakshi Amman Temple, railway station, and city commercial hubs.
            </p>
          </div>

          {/* Company & Product */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 mb-3.5">Company</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-semibold">
              <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About iDAM</Link></li>
              <li><Link href="/features" className="hover:text-emerald-400 transition-colors">Product Features</Link></li>
              <li><Link href="/how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</Link></li>
              <li><Link href="/owners" className="hover:text-emerald-400 transition-colors">For Parking Owners</Link></li>
              <li><Link href="/list-your-space" className="hover:text-emerald-400 transition-colors">List Your Space</Link></li>
            </ul>
          </div>

          {/* Support & Help */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 mb-3.5">Help & Contact</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-semibold">
              <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">Help & FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact Support</Link></li>
              <li><Link href="/accessibility" className="hover:text-emerald-400 transition-colors">Accessibility Statement</Link></li>
              <li><Link href="/security" className="hover:text-emerald-400 transition-colors">Security & Vulnerability</Link></li>
              <li><Link href="/explore" className="hover:text-emerald-400 transition-colors">Explore Live Map</Link></li>
            </ul>
          </div>

          {/* Legal & Privacy */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 mb-3.5">Legal & Privacy</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-semibold">
              <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cancellation-refund" className="hover:text-emerald-400 transition-colors">Cancellation & Refunds</Link></li>
              <li><Link href="/account-deletion" className="hover:text-emerald-400 transition-colors">Account Deletion</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-emerald-400 transition-colors">Cookie Policy</Link></li>
              <li><Link href="/privacy-requests" className="hover:text-emerald-400 transition-colors">Privacy Requests</Link></li>
            </ul>
          </div>

        </div>

        {/* Prototype / Demo Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-900 text-xs text-slate-400 space-y-3">
          <p className="italic text-slate-400 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 leading-relaxed">
            *iDAM | இடம் is a parking technology platform built for Tamil Nadu urban centers. Parking availability, pricing, slots, and transactions shown in demo mode are for evaluation and demonstration purposes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 pt-2 font-medium">
            <div>
              &copy; 2026 iDAM | இடம். All rights reserved.
            </div>
            <div className="flex items-center space-x-1">
              <span>Smart Parking for Madurai</span>
              <Heart className="w-3.5 h-3.5 text-emerald-500 fill-current" />
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
