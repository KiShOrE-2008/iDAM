'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardCheck, BarChart3, Receipt, Landmark, Users, ArrowLeft, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchAdminSummary, isCurrentUserAdmin } from '@/lib/admin/service';
import { loginUrlReturningTo } from '@/lib/auth/redirect';
import { BrandSign } from '@/components/shared/BrandMark';
import { ADMIN_REFRESH_EVENT, AnimatedNumber, Skeleton, useChangedFlash } from './motion';

const NAV = [
  { href: '/admin', label: 'Summary', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Listing requests', icon: ClipboardCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/bookings', label: 'Bookings & payments', icon: Receipt },
  { href: '/admin/payouts', label: 'Owner payouts', icon: Landmark },
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

  // Reviews change the waiting count: refresh the badge when a page says so
  useEffect(() => {
    if (access !== 'admin') return;
    const refresh = () => fetchAdminSummary().then((s) => setPendingCount(s.listings.pending_review)).catch(() => {});
    window.addEventListener(ADMIN_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(ADMIN_REFRESH_EVENT, refresh);
  }, [access]);

  if (access !== 'admin') {
    return (
      <div className="min-h-screen bg-limewash flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white border border-slate-300 rounded-xl p-6 text-center space-y-3">
          {access === 'checking' ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-brand-700 mx-auto" />
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
              <Link href="/" className="block text-xs font-bold text-brand-800 hover:underline">Back to iDAM</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-limewash text-ink">
      <header className="asphalt text-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandSign size={28} />
            <span className="font-black">iDAM admin</span>
          </div>
          <Link href="/" className="text-sm font-semibold text-white/75 hover:text-white flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to site</span>
          </Link>
        </div>
        <div className="kerb h-1" aria-hidden="true" />
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:flex lg:gap-8">
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
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${
                      active ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    {href === '/admin/requests' && pendingCount ? (
                      <span key={pendingCount} className="badge-pop text-[11px] font-black bg-paint text-ink rounded px-1.5 min-w-5 text-center tabular">{pendingCount}</span>
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
              <h1 className="text-3xl font-black tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
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
  <section className={`bg-white border border-slate-300 rounded-lg p-4 sm:p-5 ${className}`}>
    {title && <h2 className="text-base font-black text-ink mb-3">{title}</h2>}
    {children}
  </section>
);

interface StatTileProps {
  label: string;
  /** Numbers count up on load and tween to new values on refresh */
  value: number | React.ReactNode;
  format?: (n: number) => string;
  hint?: string;
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, format, hint }) => {
  const numeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)));
  const n = numeric ? Number(value) : 0;
  const changed = useChangedFlash(numeric ? n : value);
  return (
    <div className={`bg-white border-t-2 border-ink pt-2.5 pb-1 ${changed ? 'changed-flash' : ''}`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="text-[1.7rem] leading-tight font-black text-ink mt-0.5 tabular">
        {numeric ? <AnimatedNumber value={n} format={format} /> : value}
      </p>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
};

export const LoadState: React.FC<{ loading: boolean; error: string | null; children: React.ReactNode }> = ({ loading, error, children }) =>
  error ? (
    <div role="alert" className="bg-rose-50 border-l-4 border-rose-600 text-rose-800 text-sm p-3 rounded">{error}</div>
  ) : loading ? (
    <div className="space-y-5" role="status" aria-label="Loading">
      <div className="bg-white border border-slate-300 rounded-lg p-5">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28 mt-2" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-slate-300 rounded-lg p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-36 w-full mt-4" />
      </div>
    </div>
  ) : (
    <>{children}</>
  );
