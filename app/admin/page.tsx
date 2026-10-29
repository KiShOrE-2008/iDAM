'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { AdminLayout, AdminCard, StatTile, LoadState } from '@/components/admin/AdminLayout';
import { AdminSummary, fetchAdminSummary, formatInr, formatDateTime } from '@/lib/admin/service';

export default function AdminSummaryPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    fetchAdminSummary().then(setSummary).catch((e) => setError(e.message));
  };

  return (
    <AdminLayout
      title="Summary"
      subtitle={summary ? `Updated ${formatDateTime(summary.generated_at)}` : 'Your marketplace at a glance'}
      actions={
        <button onClick={load} className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      }
    >
      <SummaryBody summary={summary} error={error} onMount={load} />
    </AdminLayout>
  );
}

// Loads only once AdminLayout has confirmed admin access (children render after the check)
function SummaryBody({ summary, error, onMount }: { summary: AdminSummary | null; error: string | null; onMount: () => void }) {
  useEffect(onMount, []); // eslint-disable-line react-hooks/exhaustive-deps
  const s = summary;
  return (
    <LoadState loading={!s} error={error}>
      {s && (
        <>
          {s.listings.pending_review > 0 && (
            <Link
              href="/admin/requests"
              className="flex items-center justify-between bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl px-4 py-3 text-sm font-bold hover:bg-amber-100"
            >
              <span>{s.listings.pending_review} parking {s.listings.pending_review === 1 ? 'space is' : 'spaces are'} waiting for your review</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <AdminCard title="Money (paid bookings)">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Today" value={formatInr(s.money.paid_today)} />
              <StatTile label="Last 7 days" value={formatInr(s.money.paid_7d)} />
              <StatTile label="Last 30 days" value={formatInr(s.money.paid_30d)} />
              <StatTile label="All time" value={formatInr(s.money.paid_total)} hint={`iDAM fees ${formatInr(s.money.platform_fees)}`} />
            </div>
            {Number(s.money.marked_refunded) > 0 && (
              <p className="text-[11px] text-slate-500 mt-3">
                {formatInr(s.money.marked_refunded)} is marked refunded on cancelled bookings. Refunds are not sent through Razorpay automatically yet; check each in the Razorpay dashboard.
              </p>
            )}
          </AdminCard>

          <AdminCard title="Bookings">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatTile label="Made today" value={s.bookings.today} />
              <StatTile label="Awaiting payment" value={s.bookings.awaiting_payment} />
              <StatTile label="Confirmed" value={s.bookings.confirmed} />
              <StatTile label="Parked now" value={s.bookings.parked_now} />
              <StatTile label="Completed" value={s.bookings.completed} />
              <StatTile label="Cancelled" value={s.bookings.cancelled} />
            </div>
          </AdminCard>

          <div className="grid lg:grid-cols-2 gap-5">
            <AdminCard title="Parking listings">
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Live" value={s.listings.active} />
                <StatTile label="Waiting for review" value={s.listings.pending_review} />
                <StatTile label="Paused by owner" value={s.listings.inactive} />
                <StatTile label="Suspended" value={s.listings.suspended} />
              </div>
              {s.listings.legacy_lots > 0 && (
                <p className="text-[11px] text-slate-500 mt-3">
                  Plus {s.listings.legacy_lots} older demo lots without an owner (parking_locations). They have no owner to scan passes.
                </p>
              )}
            </AdminCard>
            <AdminCard title="People">
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Accounts" value={s.users.total} hint={`${s.users.new_7d} new this week`} />
                <StatTile label="Owners with listings" value={s.users.owners} />
              </div>
            </AdminCard>
          </div>
        </>
      )}
    </LoadState>
  );
}
