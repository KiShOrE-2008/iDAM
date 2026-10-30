'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { AdminLayout, AdminCard, StatTile, LoadState } from '@/components/admin/AdminLayout';
import { AdminPayouts, fetchAdminPayouts, formatInr, formatDateTime, runPayoutsNow } from '@/lib/admin/service';
import { ACTIVATION_LABEL, PAYOUT_STATUS_LABEL } from '@/lib/owner/payouts';

const FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'awaiting_account', label: 'Waiting for bank' },
  { key: 'ready', label: 'To send' },
  { key: 'on_hold', label: 'On hold' },
  { key: 'released', label: 'Released' },
  { key: 'settled', label: 'Paid to bank' },
  { key: 'reversal_pending', label: 'Reversing' },
  { key: 'reversed', label: 'Reversed' }
];

const STATUS_STYLE: Record<string, string> = {
  awaiting_account: 'bg-amber-100 text-amber-900',
  ready: 'bg-amber-100 text-amber-900',
  transferring: 'bg-amber-100 text-amber-900',
  on_hold: 'bg-sky-100 text-sky-900',
  released: 'bg-brand-100 text-brand-900',
  settled: 'bg-brand-100 text-brand-900',
  reversal_pending: 'bg-rose-100 text-rose-900',
  reversed: 'bg-rose-100 text-rose-900',
  activated: 'bg-brand-100 text-brand-900',
  needs_clarification: 'bg-amber-100 text-amber-900',
  suspended: 'bg-rose-100 text-rose-900'
};

export default function AdminPayoutsPage() {
  return (
    <AdminLayout title="Owner payouts" subtitle="Owners' share of each paid booking, sent through Razorpay Route.">
      <PayoutsBody />
    </AdminLayout>
  );
}

function PayoutsBody() {
  const [filter, setFilter] = useState<string | null>(null);
  const [data, setData] = useState<AdminPayouts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runNote, setRunNote] = useState<string | null>(null);

  const load = useCallback(() => {
    setData(null);
    setError(null);
    fetchAdminPayouts(filter).then(setData).catch((e) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  const run = async () => {
    setRunning(true);
    setRunNote(null);
    try {
      const r = await runPayoutsNow();
      const parts = Object.entries(r.results).map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`);
      setRunNote(r.processed ? `Processed ${r.processed}: ${parts.join(', ')}.` : 'Nothing was due.');
      load();
    } catch (e) {
      setRunNote((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={running}
          className="bg-slate-900 text-white text-xs font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-60"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Run payouts now
        </button>
        <p className="text-[11px] text-slate-500">{runNote ?? 'Runs automatically every hour once the schedule is set up.'}</p>
      </div>

      <LoadState loading={!data} error={error}>
        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatTile label="Waiting for bank" value={formatInr(data.totals.waiting_for_bank)} hint="Owner hasn't set up payouts" />
              <StatTile label="To send" value={formatInr(data.totals.to_send)} hint="Next run sends these" />
              <StatTile label="On hold" value={formatInr(data.totals.on_hold)} hint="At Razorpay, until 24h after parking" />
              <StatTile label="Released" value={formatInr(data.totals.released)} hint="To owners' banks" />
              <StatTile label="Problems" value={data.totals.problems} hint="Rows with an error below" />
            </div>

            <AdminCard title="Owner payout accounts">
              {data.owners.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No owners yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500 text-left">
                      <tr>
                        {['Owner', 'Payout account', 'Bank', 'Owed (not yet released)'].map((h, i) => (
                          <th key={h} className={`py-1.5 px-1 font-bold whitespace-nowrap ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.owners.map((o) => (
                        <tr key={o.id} className="border-t border-slate-100 align-top">
                          <td className="py-2 px-1 max-w-[220px]"><div className="font-bold truncate">{o.name || '—'}</div><div className="text-[10px] text-slate-500 truncate">{o.email} {o.phone && `· ${o.phone}`}</div></td>
                          <td className="py-2 px-1">
                            <Badge status={o.activation_status} label={ACTIVATION_LABEL[o.activation_status]} />
                            {o.razorpay_account_id && <div className="font-mono text-[10px] text-slate-500 mt-0.5">{o.razorpay_account_id}</div>}
                            {o.last_error && <div className="text-[10px] text-rose-700 font-semibold mt-0.5 max-w-[260px]">{o.last_error}</div>}
                          </td>
                          <td className="py-2 px-1 font-mono whitespace-nowrap">{o.bank_last4 ? `••••${o.bank_last4}` : '—'}</td>
                          <td className="py-2 px-1 text-right tabular-nums font-bold">{formatInr(o.owed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminCard>

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

            <AdminCard>
              {data.payouts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No payouts match. A payout appears when a driver pays for a booking on an owner&apos;s listing.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500 text-left">
                      <tr>
                        {['Pass', 'Owner', 'Lot', 'Paid', 'Fee', 'Owner share', 'Status', 'Transfer'].map((h) => (
                          <th key={h} className="py-1.5 px-1 font-bold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.payouts.map((p) => (
                        <tr key={p.booking_id} className="border-t border-slate-100 align-top">
                          <td className="py-2 px-1 font-mono font-bold whitespace-nowrap">{p.pass_code}<div className="font-sans font-medium text-[10px] text-slate-500">{formatDateTime(p.created_at)}</div></td>
                          <td className="py-2 px-1 max-w-[180px]"><div className="font-bold truncate">{p.owner_name || '—'}</div><div className="text-[10px] text-slate-500 truncate">{p.owner_email}</div></td>
                          <td className="py-2 px-1 max-w-[160px] truncate">{p.lot || '—'}</td>
                          <td className="py-2 px-1 tabular-nums whitespace-nowrap">{formatInr(p.gross_amount)}</td>
                          <td className="py-2 px-1 tabular-nums whitespace-nowrap">{formatInr(p.platform_fee)}</td>
                          <td className="py-2 px-1 tabular-nums whitespace-nowrap font-bold">{formatInr(p.amount)}</td>
                          <td className="py-2 px-1">
                            <Badge status={p.status} label={PAYOUT_STATUS_LABEL[p.status].replace('your ', '')} />
                            {p.status === 'on_hold' && p.on_hold_until && <div className="text-[10px] text-slate-500 mt-0.5">until {formatDateTime(p.on_hold_until)}</div>}
                            {p.last_error && (
                              <div className="text-[10px] text-rose-700 font-semibold mt-0.5 max-w-[260px] flex gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />{p.last_error}{p.attempts > 1 ? ` (${p.attempts} tries)` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-1 font-mono text-[10px] text-slate-500 whitespace-nowrap">{p.razorpay_transfer_id || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminCard>
          </>
        )}
      </LoadState>
    </>
  );
}

function Badge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block text-[10px] font-black rounded-full px-2 py-0.5 whitespace-nowrap ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-700'}`}>
      {label}
    </span>
  );
}
