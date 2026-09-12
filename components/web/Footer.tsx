'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Heart } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang];

  return (
    <footer className="w-full bg-slate-100/60 py-10 px-4 sm:px-6 lg:px-8 mt-12 border-t border-slate-200/50">
      <div className="max-w-7xl mx-auto bg-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="inline-block bg-white/95 rounded-xl p-2 shadow-sm hover:opacity-90 transition-opacity">
              <img
                src="/idam-logo.png"
                alt="iDAM | இடம் Logo"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <h3 className="text-sm font-extrabold text-white">IDAM | இடம்</h3>
            <p className="text-xs text-emerald-400 font-bold">Find your space.</p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Discover and reserve parking spaces with ease across Madurai. Real-time availability near Meenakshi Temple, Junction, and key transit hubs.
            </p>
          </div>

          {/* Explore Links */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3">Explore</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-semibold">
              <li><Link href="/explore" className="hover:text-emerald-400 transition-colors">Find Parking</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</Link></li>
              <li><Link href="/owner" className="hover:text-emerald-400 transition-colors">For Parking Owners</Link></li>
              <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About IDAM</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3">Legal</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-semibold">
              <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-emerald-400 transition-colors">Cancellation & Refund</Link></li>
              <li><Link href="/owner-policy" className="hover:text-emerald-400 transition-colors">Parking Owner Policy</Link></li>
              <li><Link href="/user-rules" className="hover:text-emerald-400 transition-colors">User/Driver Rules</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3">Support</h4>
            <ul className="space-y-2 text-xs text-slate-400 font-semibold">
              <li><Link href="/help" className="hover:text-emerald-400 transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact Us</Link></li>
              <li><Link href="/report-issue" className="hover:text-emerald-400 transition-colors">Report an Issue</Link></li>
            </ul>
          </div>

        </div>

        {/* Prototype / Demo Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-900 text-xs text-slate-400 space-y-3">
          <p className="italic text-slate-400 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed">
            *IDAM is a prototype/demo platform. Parking availability, pricing, locations, and transactions shown in demo environments are for demonstration purposes only.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 pt-2 font-medium">
            <div>
              &copy; 2026 IDAM | இடம். All rights reserved.
            </div>
            <div className="flex items-center space-x-1">
              <span>Madurai Smart Parking Initiative</span>
              <Heart className="w-3.5 h-3.5 text-emerald-500 fill-current" />
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
