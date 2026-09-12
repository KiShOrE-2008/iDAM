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
    <footer className="bg-slate-950 text-white border-t border-slate-900 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
                <MapPin className="w-5 h-5 fill-current" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">iDAM</span>
              <span className="text-xs font-bold text-emerald-400 font-tamil">இடம்</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Location-based parking marketplace enabling drivers to discover and reserve parking spaces across Madurai.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3">Drivers</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/explore" className="hover:text-emerald-400">Search Parking Map</Link></li>
              <li><Link href="/my-bookings" className="hover:text-emerald-400">My Reservations</Link></li>
              <li><Link href="/#mobile-demo" className="hover:text-emerald-400">Mobile App Demo</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3">Owners</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/owner" className="hover:text-emerald-400">Owner Portal</Link></li>
              <li><Link href="/owner" className="hover:text-emerald-400">List Your Space</Link></li>
              <li><Link href="/about" className="hover:text-emerald-400">Madurai Smart City Vision</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-3">Coverage</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Meenakshi Amman Temple</li>
              <li>Periyar Bus Stand Hub</li>
              <li>Madurai Railway Junction</li>
              <li>Mattuthavani Area</li>
            </ul>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            &copy; 2026 iDAM | இடம் Parking Technologies. All rights reserved.
          </div>
          <div className="flex items-center space-x-1">
            <span>Built for Madurai with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
          </div>
        </div>

      </div>
    </footer>
  );
};
