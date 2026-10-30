'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout, AdminCard, StatTile, LoadState } from '@/components/admin/AdminLayout';
import { BarChart } from '@/components/admin/BarChart';
import { SlidingTabs } from '@/components/admin/motion';
import { AdminAnalytics, fetchAdminAnalytics, formatInr, formatDateTime } from '@/lib/admin/service';

const PERIODS = [7, 30, 90];

// `day` arrives as "2026-10-30" or, from generate_series, "2026-10-30T00:00:00": use the date part only
const dayLabel = (day: string) => {
  const [y, m, d] = String(day).slice(0, 10).split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return Number.isNaN(date.getTime()) ? String(day) : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  return (
    <AdminLayout
      title="Analytics"
      subtitle="Owners, drivers and money for the selected period (India time)."
      actions={
        <SlidingTabs
          label="Period"
          variant="segmented"
          value={days}
          onChange={setDays}
          options={PERIODS.map((p) => ({ key: p, label: `${p} days` }))}
        />
      }
    >
      <AnalyticsBody days={days} />
    </AdminLayout>
  );
}

function AnalyticsBody({ days }: { days: number }) {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchAdminAnalytics(days).then(setData).catch((e) => setError(e.message));
  }, [days]);

  const t = data?.totals;
  const maxOwnerRevenue = Math.max(1, ...(data?.owners.map((o) => Number(o.revenue)) || [0]));
  const maxDriverSpend = Math.max(1, ...(data?.drivers.map((d) => Number(d.spent)) || [0]));

  return (
    <LoadState loading={!data} error={error}>
      {data && t && (
        <>
          <AdminCard title="Money">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Paid by drivers" value={Number(t.revenue)} format={formatInr} hint={`${t.paid_bookings} paid bookings`} />
              <StatTile label="iDAM fees" value={Number(t.platform_fees)} format={formatInr} hint="Platform fee per booking" />
              <StatTile label="Owners' share" value={Number(t.owner_earnings)} format={formatInr} hint="Paid minus iDAM fees" />
              <StatTile label="Average booking" value={Number(t.avg_booking_value)} format={formatInr} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <StatTile label="All bookings" value={t.bookings} hint="Including unpaid" />
              <StatTile label="Cancelled" value={t.cancelled} />
              <StatTile label="Marked refunded" value={Number(t.marked_refunded)} format={formatInr} hint="Check in Razorpay" />
            </div>
          </AdminCard>

          <AdminCard>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-black text-ink">Paid revenue per day</h2>
              <button onClick={() => setShowTable((v) => !v)} className="text-[11px] font-bold text-brand-800 hover:underline">
                {showTable ? 'Show charts' : 'Show as table'}
              </button>
            </div>
            {showTable ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-slate-500 text-left">
                    <tr><th className="py-1.5 font-bold">Day</th><th className="font-bold text-right">Bookings</th><th className="font-bold text-right">Paid</th><th className="font-bold text-right">Revenue</th><th className="font-bold text-right">iDAM fees</th></tr>
                  </thead>
                  <tbody>
                    {[...data.daily].reverse().map((d) => (
                      <tr key={d.day} className="border-t border-slate-100">
                        <td className="py-1.5">{dayLabel(d.day)}</td>
                        <td className="text-right tabular-nums">{d.bookings}</td>
                        <td className="text-right tabular-nums">{d.paid_bookings}</td>
                        <td className="text-right tabular-nums">{formatInr(d.revenue)}</td>
                        <td className="text-right tabular-nums">{formatInr(d.platform_fees)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <BarChart
                  title="Paid revenue per day"
                  formatValue={formatInr}
                  data={data.daily.map((d) => ({
                    label: dayLabel(d.day),
                    value: Number(d.revenue),
                    detail: [`${d.paid_bookings} paid booking${d.paid_bookings === 1 ? '' : 's'}`]
                  }))}
                />
                <h2 className="text-base font-black text-ink mt-6 mb-2">Bookings made per day</h2>
                <BarChart
                  title="Bookings made per day"
                  data={data.daily.map((d) => ({
                    label: dayLabel(d.day),
                    value: Number(d.bookings),
                    detail: [`${d.paid_bookings} paid`]
                  }))}
                  height={140}
                />
              </>
            )}
          </AdminCard>

          <AdminCard title="Owners">
            <RankTable
              empty="No owner bookings in this period."
              headers={['Owner', 'Listings', 'Paid bookings', 'Revenue', 'iDAM fees', 'Owner earnings']}
              rows={data.owners.map((o) => ({
                key: `${o.email}-${o.name}`,
                cells: [
                  <Person key="p" name={o.name} email={o.email} phone={o.phone} />,
                  o.listings,
                  `${o.paid_bookings} / ${o.bookings}`,
                  <Amount key="a" value={Number(o.revenue)} max={maxOwnerRevenue} />,
                  formatInr(o.platform_fees),
                  formatInr(o.earnings)
                ]
              }))}
            />
          </AdminCard>

          <AdminCard title="Drivers">
            <RankTable
              empty="No driver bookings in this period."
              headers={['Driver', 'Bookings', 'Paid', 'Cancelled', 'Spent', 'Last booking']}
              rows={data.drivers.map((d) => ({
                key: `${d.email}-${d.name}`,
                cells: [
                  <Person key="p" name={d.name} email={d.email} phone={d.phone} />,
                  d.bookings,
                  d.paid_bookings,
                  d.cancelled,
                  <Amount key="a" value={Number(d.spent)} max={maxDriverSpend} />,
                  formatDateTime(d.last_booking)
                ]
              }))}
            />
          </AdminCard>

          <AdminCard title="Parking lots">
            <RankTable
              empty="No bookings in this period."
              headers={['Lot', 'Status', 'Bookings', 'Revenue']}
              rows={data.listings.map((l, i) => ({
                key: `${l.title}-${i}`,
                cells: [<span key="t" className="font-bold">{l.title}</span>, l.status, l.bookings, formatInr(l.revenue)]
              }))}
            />
          </AdminCard>
        </>
      )}
    </LoadState>
  );
}

function Person({ name, email, phone }: { name: string; email: string | null; phone: string | null }) {
  return (
    <div className="min-w-0">
      <div className="font-bold text-slate-900 truncate">{name}</div>
      <div className="text-[11px] text-slate-500 truncate">{[email, phone].filter(Boolean).join(' · ')}</div>
    </div>
  );
}

/** Amount with a thin single-hue bar for at-a-glance comparison down the column */
function Amount({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden sm:block w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full meter-fill" style={{ width: `${(value / max) * 100}%`, background: '#1846A3' }} />
      </div>
      <span className="tabular-nums font-bold">{formatInr(value)}</span>
    </div>
  );
}

function RankTable({ headers, rows, empty }: { headers: string[]; rows: { key: string; cells: React.ReactNode[] }[]; empty: string }) {
  if (!rows.length) return <p className="text-xs text-slate-500 py-4 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead className="text-slate-500 text-left">
          <tr>
            {headers.map((h, i) => (
              <th key={h} className={`py-1.5 px-1 font-bold whitespace-nowrap ${i === 0 ? '' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.key} className="row-in border-t border-slate-100 align-middle" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
              {r.cells.map((c, i) => (
                <td key={i} className={`py-2 px-1 ${i === 0 ? 'max-w-[220px]' : 'text-right whitespace-nowrap tabular-nums'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
