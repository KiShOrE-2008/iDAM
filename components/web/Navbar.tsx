'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { loginUrlReturningTo } from '@/lib/auth/redirect';
import { LayoutDashboard, LogOut, ChevronDown, Ticket, RefreshCw, Menu, X } from 'lucide-react';
import { Language } from '@/types';
import { AuthModal } from '@/components/shared/AuthModal';
import { BrandMark } from '@/components/shared/BrandMark';
import { useAuth } from '@/context/AuthContext';

interface NavbarProps {
  lang: Language;
  onLanguageToggle: (lang: Language) => void;
  activeView?: 'web' | 'mobile';
  onViewChange?: (view: 'web' | 'mobile') => void;
  onOpenOwnerModal: () => void;
}

const NAV_LINKS: { href: string; en: string; ta: string }[] = [
  { href: '/explore', en: 'Find parking', ta: 'பார்க்கிங் தேடு' },
  { href: '/how-it-works', en: 'How it works', ta: 'எப்படி வேலை செய்கிறது' },
  { href: '/owners', en: 'For space owners', ta: 'உரிமையாளர்களுக்கு' },
  { href: '/faq', en: 'Help', ta: 'உதவி' },
  { href: '/about', en: 'About', ta: 'எங்களைப் பற்றி' },
];

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLanguageToggle,
  onOpenOwnerModal,
}) => {
  const router = useRouter();
  const pathname = usePathname();
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

  const label = (l: { en: string; ta: string }) => (lang === 'ta' ? l.ta : l.en);

  return (
    <header className="sticky top-0 z-40 bg-limewash/95 backdrop-blur-sm border-b border-slate-300/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="iDAM home">
          <BrandMark size={34} />
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-[15px] font-semibold text-slate-700" aria-label="Main">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`py-1 border-b-2 transition-colors ${
                  active ? 'border-paint text-ink' : 'border-transparent hover:text-ink hover:border-slate-300'
                } ${lang === 'ta' ? 'font-tamil' : ''}`}
              >
                {label(l)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center text-[13px] font-bold border border-slate-300 rounded-md overflow-hidden" role="group" aria-label="Language">
            <button
              onClick={() => onLanguageToggle('en')}
              aria-pressed={lang === 'en'}
              className={`px-2.5 py-1.5 cursor-pointer ${lang === 'en' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageToggle('ta')}
              aria-pressed={lang === 'ta'}
              className={`px-2.5 py-1.5 font-tamil cursor-pointer ${lang === 'ta' ? 'bg-ink text-white' : 'text-slate-600 hover:bg-white'}`}
            >
              தமிழ்
            </button>
          </div>

          {isLoggedIn ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md border border-slate-300 bg-white text-sm font-semibold text-ink cursor-pointer hover:border-slate-400"
              >
                <span className="w-7 h-7 rounded bg-brand-700 text-white flex items-center justify-center text-xs font-extrabold uppercase">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </span>
                <span className="hidden md:inline max-w-[96px] truncate">{user?.name?.split(' ')[0] || 'Account'}</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 text-sm font-semibold text-slate-700 z-50 animate-scale-in">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="font-bold text-ink truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 font-normal truncate">{user?.email}</p>
                  </div>
                  <Link href="/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <LayoutDashboard className="w-4 h-4 text-slate-500" />
                    Dashboard
                  </Link>
                  <Link href="/my-bookings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <Ticket className="w-4 h-4 text-slate-500" />
                    My passes
                  </Link>
                  <button
                    onClick={() => {
                      switchRole(user?.role === 'driver' ? 'owner' : 'driver');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 border-t border-slate-100 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    Switch to {user?.role === 'driver' ? 'owner view' : 'driver view'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 text-rose-700 border-t border-slate-100 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={loginUrlReturningTo(pathname)}
              className="hidden sm:inline text-sm font-semibold text-slate-700 hover:text-ink px-2 py-2"
            >
              Sign in
            </Link>
          )}

          <button
            onClick={onOpenOwnerModal}
            className="hidden md:inline-flex items-center bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-md text-sm font-bold cursor-pointer"
          >
            List your space
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-md border border-slate-300 text-ink hover:bg-white cursor-pointer"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-300/70 bg-limewash animate-fade-in">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col text-base font-semibold text-ink" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`py-3 border-b border-slate-200 last:border-0 ${lang === 'ta' ? 'font-tamil' : ''}`}
              >
                {label(l)}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="py-3">
              Contact support
            </Link>
            <div className="flex gap-2 pt-3 pb-1">
              {!isLoggedIn && (
                <Link
                  href={loginUrlReturningTo(pathname)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 py-2.5 text-center border border-slate-300 bg-white rounded-md text-sm font-bold"
                >
                  Sign in
                </Link>
              )}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenOwnerModal();
                }}
                className="flex-1 py-2.5 text-center bg-brand-700 text-white rounded-md text-sm font-bold cursor-pointer"
              >
                List your space
              </button>
            </div>
          </nav>
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} lang={lang} />
    </header>
  );
};
