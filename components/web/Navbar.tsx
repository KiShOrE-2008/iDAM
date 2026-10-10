'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight, User, LayoutDashboard, LogOut, ChevronDown, Ticket, RefreshCw, Menu, X, HelpCircle, Building2, Compass } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoggedIn, logout, switchRole } = useAuth();
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isProfileOpen]);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-3 z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4">
      <div className="bg-emerald-100/85 via-emerald-50/90 to-teal-100/85 backdrop-blur-md border-2 border-emerald-300/80 shadow-lg shadow-emerald-950/10 rounded-3xl h-20 px-4 sm:px-6 flex items-center justify-between gap-4 transition-all duration-300">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2 group shrink-0 relative">
          <div className="relative">
            <img
              src="/idam-logo.png"
              alt="iDAM | இடம்"
              className="h-11 sm:h-12 w-auto object-contain group-hover:scale-105 group-hover:-translate-y-0.5 transition-all duration-300 drop-shadow-xs"
            />
            {/* Live Indicator Dot */}
            <span className="absolute -top-0.5 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6 text-xs xl:text-sm font-bold text-gray-700 whitespace-nowrap">
          <Link href="/" className="relative group/link py-1 hover:text-emerald-900 transition-colors">
            <span>Home</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
          <Link href="/features" className="relative group/link py-1 hover:text-emerald-900 transition-colors">
            <span>Features</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
          <Link href="/how-it-works" className="relative group/link py-1 hover:text-emerald-900 transition-colors">
            <span>How It Works</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
          <Link href="/owners" className="relative group/link py-1 hover:text-emerald-900 transition-colors">
            <span>For Owners</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
          <Link href="/faq" className="relative group/link py-1 hover:text-emerald-900 transition-colors">
            <span>Help & FAQ</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
          <Link href="/about" className="relative group/link py-1 hover:text-emerald-900 transition-colors">
            <span>About</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-700 group-hover/link:w-full transition-all duration-300 ease-out rounded-full"></span>
          </Link>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          
          {/* Language Switcher */}
          <div className="flex items-center bg-white/90 p-1 rounded-full text-xs font-bold border border-emerald-300/60 shadow-2xs">
            <button
              onClick={() => onLanguageToggle('en')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-emerald-950 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageToggle('ta')}
              className={`px-2.5 py-1 rounded-full font-tamil transition-all cursor-pointer ${
                lang === 'ta'
                  ? 'bg-emerald-950 text-white shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {/* Find Parking CTA (Desktop & Tablet) */}
          <Link
            href="/explore"
            className="hidden sm:inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-2 rounded-full text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Find Parking</span>
          </Link>

          {isLoggedIn ? (
            /* Profile Option Dropdown */
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-300 text-emerald-950 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-extrabold uppercase">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <span className="hidden md:inline max-w-[80px] truncate">{user?.name?.split(' ')[0] || 'User'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 text-xs font-bold text-gray-700 z-50 animate-scale-in">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-emerald-50/50">
                    <p className="font-extrabold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-gray-500 font-medium truncate">{user?.email}</p>
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
                    className="w-full text-left flex items-center space-x-2.5 px-4 py-2.5 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border-t border-gray-100 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-700" />
                    <span>Switch to {user?.role === 'driver' ? 'Owner View' : 'Driver View'}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center space-x-2.5 px-4 py-2.5 hover:bg-rose-50 text-rose-600 transition-colors border-t border-gray-100 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-2">
              <Link
                href="/login"
                className="text-xs font-black text-slate-800 hover:text-emerald-800 px-3 py-2 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex items-center space-x-1 bg-slate-950 text-white px-4 py-2 rounded-full text-xs font-black hover:bg-slate-900 shadow-md transition-all active:scale-95 whitespace-nowrap"
              >
                <span>Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/80 border border-emerald-300/80 text-slate-800 hover:bg-white transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Slide-Down Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-2 bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 animate-scale-in">
          <nav className="flex flex-col space-y-1 text-sm font-black text-slate-800">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/explore"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-between font-black"
            >
              <span>Find Parking</span>
              <Compass className="w-4 h-4 text-emerald-700" />
            </Link>
            <Link
              href="/features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/owners"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              For Parking Owners
            </Link>
            <Link
              href="/faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              Help & FAQ
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              About iDAM
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
            >
              Contact Support
            </Link>
          </nav>

          {!isLoggedIn && (
            <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center bg-slate-950 text-white rounded-xl text-xs font-black transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        lang={lang}
      />
    </header>
  );
};
