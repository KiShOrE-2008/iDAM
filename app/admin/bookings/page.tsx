'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { AdminLayout, AdminCard, LoadState } from '@/components/admin/AdminLayout';
import { AdminBooking, fetchAdminBookings, formatInr, formatDateTime } from '@/lib/admin/service';

const FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'pending', label: 'Awaiting payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'active', label: 'Parked now' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'refunded', label: 'Marked refunded' }
];

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  confirmed: 'bg-emerald-100 text-emerald-900',
  active: 'bg-sky-100 text-sky-900',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-rose-100 text-rose-900',
  refunded: 'bg-rose-100 text-rose-900'
};

export default function AdminBookingsPage() {
  return (
    <AdminLayout title="Bookings & payments" subtitle="Latest 200 bookings. Search by pass code, plate, driver name or email.">
      <BookingsBody />
    </AdminLayout>
  );
}

function BookingsBody() {
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AdminBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setError(null);
    fetchAdminBookings(filter, search || null).then(setRows).catch((e) => setError(e.message));
  }, [filter, search]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(query.trim()); }}
          className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 w-full sm:w-72"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pass code, plate, driver…"
            aria-label="Search bookings"
            className="ml-2 flex-1 text-xs font-medium outline-none bg-transparent"
          />
        </form>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                filter === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <LoadState loading={!rows} error={error}>
        <AdminCard>
          {rows && rows.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No bookings match.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead className="text-slate-500 text-left">
                  <tr>
                    {['Pass', 'Driver', 'Lot', 'Slot', 'Vehicle', 'Amount', 'Booking', 'Payment', 'Payment ref'].map((h) => (
                      <th key={h} className="py-1.5 px-1 font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows?.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100 align-top">
                      <td className="py-2 px-1 font-mono font-bold whitespace-nowrap">{b.pass_code}<div className="font-sans font-medium text-[10px] text-slate-500">{formatDateTime(b.created_at)}</div></td>
                      <td className="py-2 px-1 max-w-[180px]"><div className="font-bold truncate">{b.driver_name || '—'}</div><div className="text-[10px] text-slate-500 truncate">{b.driver_email}</div></td>
                      <td className="py-2 px-1 max-w-[160px] truncate">{b.lot || '—'}</td>
                      <td className="py-2 px-1 whitespace-nowrap">{formatDateTime(b.start_at)}</td>
                      <td className="py-2 px-1 whitespace-nowrap font-mono">{b.vehicle_number || '—'} <span className="font-sans text-slate-500">{b.vehicle_type}</span></td>
                      <td className="py-2 px-1 whitespace-nowrap tabular-nums font-bold">{formatInr(b.total_amount)}</td>
                      <td className="py-2 px-1"><Badge status={b.booking_status} /></td>
                      <td className="py-2 px-1"><Badge status={b.payment_status} /></td>
                      <td className="py-2 px-1 font-mono text-[10px] text-slate-500 whitespace-nowrap">{b.payment_id || b.razorpay_order_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </LoadState>
    </>
  );
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-[10px] font-black rounded-full px-2 py-0.5 whitespace-nowrap ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}
