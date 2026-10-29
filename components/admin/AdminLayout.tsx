'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardCheck, BarChart3, Receipt, Users, ArrowLeft, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchAdminSummary, isCurrentUserAdmin } from '@/lib/admin/service';
import { loginUrlReturningTo } from '@/lib/auth/redirect';

const NAV = [
  { href: '/admin', label: 'Summary', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Listing requests', icon: ClipboardCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/bookings', label: 'Bookings & payments', icon: Receipt },
  { href: '/admin/users', label: 'Users', icon: Users }
];

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  /** Rendered only after the server has confirmed the user is an admin */
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ title, subtitle, children, actions }) => {
  const pathname = usePathname();
  const { supabaseUser, isLoading, isDemoMode } = useAuth();
  const [access, setAccess] = useState<'checking' | 'admin' | 'denied' | 'error'>('checking');
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const activeNavRef = React.useRef<HTMLAnchorElement | null>(null);

  // On phones the sections are a scrolling tab row: keep the current one in view
  useEffect(() => {
    activeNavRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [access, pathname, pendingCount]); // the requests badge appearing widens the row

  useEffect(() => {
    if (isLoading) return;
    if (!supabaseUser) {
      setAccess('denied');
      return;
    }
    let isMounted = true;
    // The server decides: is_admin() reads the caller's role from their profile
    isCurrentUserAdmin()
      .then((ok) => {
        if (!isMounted) return;
        setAccess(ok ? 'admin' : 'denied');
        if (ok) fetchAdminSummary().then((s) => isMounted && setPendingCount(s.listings.pending_review)).catch(() => {});
      })
      .catch(() => isMounted && setAccess('error'));
    return () => {
      isMounted = false;
    };
  }, [isLoading, supabaseUser?.id]);

  if (access !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 shadow-sm">
          {access === 'checking' ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Checking admin access…</p>
            </>
          ) : (
            <>
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <h1 className="text-lg font-black text-slate-900">Admins only</h1>
              <p className="text-xs text-slate-600">
                {access === 'error'
                  ? 'Could not check your access. Please try again.'
                  : !supabaseUser
                  ? isDemoMode
                    ? 'The admin console needs a real admin account, not demo mode.'
                    : 'Sign in with an iDAM admin account to continue.'
                  : 'This account is not an iDAM admin.'}
              </p>
              {!supabaseUser && (
                <Link href={loginUrlReturningTo(pathname)} className="inline-block bg-slate-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl">
                  Sign in
                </Link>
              )}
              <Link href="/" className="block text-xs font-bold text-emerald-800 hover:underline">Back to iDAM</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-black tracking-widest text-sm">iDAM</span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to site</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:flex lg:gap-6">
        {/* Sub-page navigation: sidebar on desktop, scrollable tabs on phones */}
        <nav aria-label="Admin sections" className="lg:w-56 shrink-0 mb-5 lg:mb-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href} className="shrink-0">
                  <Link
                    ref={active ? activeNavRef : undefined}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    {href === '/admin/requests' && pendingCount ? (
                      <span className="text-[10px] font-black bg-amber-400 text-amber-950 rounded-full px-1.5 min-w-5 text-center">{pendingCount}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 min-w-0 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-black tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
};

/** Card + small building blocks shared by the admin pages */
export const AdminCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs ${className}`}>
    {title && <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">{title}</h2>}
    {children}
  </section>
);

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{value}</p>
    {hint && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{hint}</p>}
  </div>
);

export const LoadState: React.FC<{ loading: boolean; error: string | null; children: React.ReactNode }> = ({ loading, error, children }) =>
  error ? (
    <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3 rounded-2xl">{error}</div>
  ) : loading ? (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 py-8 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>
  ) : (
    <>{children}</>
  );
