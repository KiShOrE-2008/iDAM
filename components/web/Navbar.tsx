'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight, User, LayoutDashboard, LogOut, ChevronDown, Ticket, RefreshCw } from 'lucide-react';
import { Language } from '@/types';
import { TRANSLATIONS } from '@/lib/i18n/translations';
import { AuthModal } from '@/components/shared/AuthModal';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  lang: Language;
  onLanguageToggle: (lang: Language) => void;
  activeView?: 'web' | 'mobile';
  onViewChange?: (view: 'web' | 'mobile') => void;
  onOpenOwnerModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLanguageToggle,
  onOpenOwnerModal,
}) => {
  const router = useRouter();
  const t = TRANSLATIONS[lang];
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, isLoggedIn, logout, switchRole } = useAuth();

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-3 z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4">
      <div className="bg-emerald-100/85 via-emerald-50/90 to-teal-100/85 backdrop-blur-md border-2 border-emerald-300/80 shadow-lg shadow-emerald-950/10 rounded-3xl h-20 px-6 flex items-center justify-between gap-6 transition-all duration-300">
        
        {/* Brand Logo with soft float animation */}
        <Link href="/" className="flex items-center space-x-2 group shrink-0 relative">
          <div className="relative">
            <img
              src="/idam-logo.png"
              alt="iDAM | இடம்"
              className="h-12 w-auto object-contain group-hover:scale-105 group-hover:-translate-y-0.5 transition-all duration-300 drop-shadow-xs"
            />
            {/* Soft Live Indicator Dot */}
            <span className="absolute -top-0.5 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation with Animated Sliding Underline */}
        <nav className="hidden md:flex items-center space-x-3 lg:space-x-5 xl:space-x-6 text-xs lg:text-sm font-bold text-gray-700 whitespace-nowrap">
          <Link href="/" className="relative group/link py-1 hover:text-emerald-900 transition-colors whitespace-nowrap">
            <span>{t.navHome}</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
          {!isLoggedIn && (
            <Link href="/#mobile-demo" className="relative group/link py-1 text-emerald-800 hover:text-emerald-950 font-extrabold flex items-center space-x-1 transition-colors whitespace-nowrap">
              <span className="bg-emerald-200/60 px-2 py-0.5 rounded-full text-xs">📱 Mobile App</span>
            </Link>
          )}
          <Link href="/explore" className="relative group/link py-1 hover:text-emerald-900 transition-colors whitespace-nowrap">
            <span>Explore Map</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
          {isLoggedIn && (
            <>
              <Link href="/dashboard" className="relative group/link py-1 hover:text-emerald-900 transition-colors whitespace-nowrap">
                <span>Dashboard</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
              </Link>
              <Link href="/owner" className="relative group/link py-1 hover:text-emerald-900 transition-colors whitespace-nowrap">
                <span>{t.navForOwners}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
              </Link>
              <Link href="/my-bookings" className="relative group/link py-1 hover:text-emerald-900 transition-colors whitespace-nowrap">
                <span>My Passes</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
              </Link>
            </>
          )}
          <Link href="/about" className="relative group/link py-1 hover:text-emerald-900 transition-colors whitespace-nowrap">
            <span>{t.navAbout}</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-4 shrink-0">
          
          {/* Language Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-full text-xs font-bold border border-gray-200/60">
            <button
              onClick={() => onLanguageToggle('en')}
              className={`px-3 py-1 rounded-full transition-all ${
                lang === 'en'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageToggle('ta')}
              className={`px-3 py-1 rounded-full font-tamil transition-all ${
                lang === 'ta'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {/* List Your Space Button */}
          <button
            onClick={onOpenOwnerModal}
            className="hidden lg:block text-xs font-extrabold text-gray-700 hover:text-emerald-800 px-3 py-2 transition-colors whitespace-nowrap"
          >
            {t.listSpaceBtn}
          </button>

          {isLoggedIn ? (
            /* Profile Option Dropdown */
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200/80 hover:border-emerald-300 text-emerald-950 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-extrabold uppercase">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <span className="max-w-[100px] truncate">{user?.name?.split(' ')[0] || 'User'}</span>
                <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  {user?.role}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
              </button>

              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 text-xs font-bold text-gray-700 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setIsProfileOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-emerald-50/50">
                    <p className="font-extrabold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-gray-500 font-medium truncate">{user?.phone || user?.email}</p>
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/my-bookings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                  >
                    <Ticket className="w-4 h-4 text-emerald-700" />
                    <span>My Passes</span>
                  </Link>

                  <button
                    onClick={() => {
                      switchRole(user?.role === 'driver' ? 'owner' : 'driver');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left flex items-center space-x-2.5 px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border-t border-gray-100"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-700" />
                    <span>Switch to {user?.role === 'driver' ? 'Owner View' : 'Driver View'}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center space-x-2.5 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors border-t border-gray-100"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Sign In Link */}
              <Link
                href="/login"
                className="hidden sm:block text-xs font-extrabold text-gray-700 hover:text-emerald-800 px-3 py-2 transition-colors"
              >
                {t.signIn}
              </Link>
              
              {/* Sign Up / Get Started Button */}
              <Link
                href="/signup"
                className="flex items-center space-x-2 bg-emerald-950 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-emerald-900 shadow-md shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95"
              >
                <span>{t.getStarted}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
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
