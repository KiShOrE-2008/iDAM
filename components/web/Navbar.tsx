'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Globe, Sparkles, Smartphone, PlusCircle, User } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';
import { AuthModal } from '@/components/shared/AuthModal';

interface NavbarProps {
  lang: Language;
  onLanguageToggle: (lang: Language) => void;
  activeView: 'web' | 'mobile';
  onViewChange: (view: 'web' | 'mobile') => void;
  onOpenOwnerModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLanguageToggle,
  activeView,
  onViewChange,
  onOpenOwnerModal,
}) => {
  const t = TRANSLATIONS[lang];
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <MapPin className="w-6 h-6 fill-current text-emerald-100" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-2xl tracking-tight text-gray-900">iDAM</span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 tracking-wider font-tamil -mt-1">
              இடம்
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-7 text-sm font-semibold text-gray-600">
          <Link href="/" className="hover:text-emerald-700 transition-colors">
            {t.navHome}
          </Link>
          <Link href="/explore" className="hover:text-emerald-700 transition-colors">
            Explore Map
          </Link>
          <Link href="/owner" className="hover:text-emerald-700 transition-colors">
            {t.navForOwners}
          </Link>
          <Link href="/my-bookings" className="hover:text-emerald-700 transition-colors">
            My Passes
          </Link>
          <Link href="/about" className="hover:text-emerald-700 transition-colors">
            {t.navAbout}
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Mobile Simulator View Toggle */}
          <button
            onClick={() => onViewChange(activeView === 'web' ? 'mobile' : 'web')}
            className={`hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeView === 'mobile'
                ? 'bg-emerald-50 border-emerald-700 text-emerald-800 shadow-sm'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-700" />
            <span>{t.toggleMobileView}</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => onLanguageToggle('en')}
              className={`px-2.5 py-1 rounded-full transition-all ${
                lang === 'en'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageToggle('ta')}
              className={`px-2.5 py-1 rounded-full font-tamil transition-all ${
                lang === 'ta'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {/* Owner Portal CTA */}
          <button
            onClick={onOpenOwnerModal}
            className="hidden lg:flex items-center space-x-1.5 px-4 py-2 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700" />
            <span>{t.listSpaceBtn}</span>
          </button>

          {/* Sign In & Get Started */}
          <button
            onClick={() => setIsAuthOpen(true)}
            className="hidden sm:block text-sm font-semibold text-gray-700 hover:text-gray-900 px-3 py-2"
          >
            {t.signIn}
          </button>
          
          <Link
            href="/explore"
            className="flex items-center space-x-2 bg-emerald-950 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-emerald-900 shadow-md shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>{t.getStarted}</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        lang={lang}
      />
    </header>
  );
};
