'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Landmark, Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { loginUrlReturningTo } from '@/lib/auth/redirect';
import {
  ACTIVATION_LABEL,
  PAYOUT_STATUS_LABEL,
  PayoutDetailsForm,
  PayoutOverview,
  PayoutSetupError,
  fetchPayoutOverview,
  savePayoutDetails
} from '@/lib/owner/payouts';
import { formatDateTime, formatInr } from '@/lib/admin/service';

const EMPTY_FORM: PayoutDetailsForm = {
  beneficiary_name: '', account_number: '', ifsc: '', pan: '', phone: '',
  street1: '', street2: '', city: '', state: '', postal_code: ''
};

const FIELDS: { key: keyof PayoutDetailsForm; label: string; placeholder?: string; inputMode?: 'numeric' | 'text'; half?: boolean }[] = [
  { key: 'beneficiary_name', label: 'Account holder name', placeholder: 'As printed on your passbook' },
  { key: 'account_number', label: 'Bank account number', inputMode: 'numeric' },
  { key: 'ifsc', label: 'IFSC', placeholder: 'HDFC0001234', half: true },
  { key: 'pan', label: 'PAN', placeholder: 'ABCPE1234F', half: true },
  { key: 'phone', label: 'Mobile number', inputMode: 'numeric' },
  { key: 'street1', label: 'House / street' },
  { key: 'street2', label: 'Area / locality' },
  { key: 'city', label: 'City', half: true },
  { key: 'state', label: 'State', placeholder: 'Tamil Nadu', half: true },
  { key: 'postal_code', label: 'PIN code', inputMode: 'numeric', half: true }
];

const STATUS_STYLE: Record<string, string> = {
  awaiting_account: 'bg-amber-100 text-amber-900',
  on_hold: 'bg-sky-100 text-sky-900',
  released: 'bg-brand-100 text-brand-900',
  settled: 'bg-brand-100 text-brand-900',
  reversal_pending: 'bg-rose-100 text-rose-900',
  reversed: 'bg-rose-100 text-rose-900'
};

export default function OwnerPayoutsPage() {
  const pathname = usePathname();
  const { supabaseUser, isLoading } = useAuth();
  const [data, setData] = useState<PayoutOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    fetchPayoutOverview().then(setData).catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!isLoading && supabaseUser) load();
  }, [isLoading, supabaseUser?.id, load]);

  const account = data?.account;
  const showForm = editing || !account || account.activation_status === 'not_started';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/owner" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100" aria-label="Back to owner portal">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-sm font-black">Payouts</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {isLoading || (supabaseUser && !data && !loadError) ? (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 py-16">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : !supabaseUser ? (
          <Card>
            <p className="text-sm font-semibold">Sign in to see your payouts.</p>
            <Link href={loginUrlReturningTo(pathname)} className="inline-block mt-3 bg-slate-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl">Sign in</Link>
          </Card>
        ) : loadError ? (
          <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3 rounded-2xl">{loadError}</div>
        ) : data && !data.has_listings && !account ? (
          <Card>
            <p className="text-sm font-semibold">Payouts start once you list a parking space.</p>
            <Link href="/list-your-space" className="inline-block mt-3 bg-slate-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl">List your space</Link>
          </Card>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="Paid out" value={formatInr(data.totals.released)} hint="Released to your bank" />
              <Stat label="On hold" value={formatInr(data.totals.on_hold)} hint="Released 24h after each parking ends" />
              <Stat label="Waiting for bank details" value={formatInr(data.totals.waiting_for_bank)} hint={data.totals.waiting_for_bank > 0 ? 'Add your bank account below' : 'Nothing waiting'} />
            </div>

            {showForm ? (
              <BankForm
                hasAccount={Boolean(account && account.activation_status !== 'not_started')}
                onCancel={account && account.activation_status !== 'not_started' ? () => setEditing(false) : undefined}
                onSaved={() => { setEditing(false); load(); }}
              />
            ) : account ? (
              <AccountCard account={account} onEdit={() => setEditing(true)} />
            ) : null}

            <Card title="Earnings by booking">
              {data.payouts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No paid bookings yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.payouts.map((p) => (
                    <li key={p.booking_id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{p.lot || 'Parking'} <span className="font-mono text-slate-500">{p.pass_code}</span></p>
                        <p className="text-[11px] text-slate-500">
                          Parking {formatDateTime(p.start_at)} · paid {formatInr(p.gross_amount)} − iDAM fee {formatInr(p.platform_fee)}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] font-black rounded-full px-2 py-0.5 ${STATUS_STYLE[p.status] || 'bg-slate-100 text-slate-700'}`}>
                          {PAYOUT_STATUS_LABEL[p.status]}
                          {p.status === 'on_hold' && p.on_hold_until ? ` · ${formatDateTime(p.on_hold_until)}` : ''}
                        </span>
                      </div>
                      <p className="text-sm font-black tabular-nums shrink-0">{formatInr(p.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Payments are collected by iDAM through Razorpay. Your share (booking amount minus the iDAM fee) is
              transferred to your Razorpay payout account when the driver pays, held until 24 hours after the parking
              ends, then paid to your bank by Razorpay, usually within 1–2 working days. If a driver cancels before
              arriving, that booking&apos;s payout is reversed.
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
      {title && <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">{title}</h2>}
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-black mt-1 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{hint}</p>
    </div>
  );
}

function AccountCard({ account, onEdit }: { account: NonNullable<PayoutOverview['account']>; onEdit: () => void }) {
  const active = account.activation_status === 'activated';
  return (
    <Card title="Payout account">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${active ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'}`}>
            {active ? <CheckCircle2 className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-bold">{account.beneficiary_name}</p>
            <p className="text-xs text-slate-500 font-mono">A/c ••••{account.bank_last4} · {account.ifsc}</p>
            <p className={`text-xs font-bold mt-1 ${active ? 'text-brand-700' : 'text-amber-700'}`}>{ACTIVATION_LABEL[account.activation_status]}</p>
          </div>
        </div>
        <button onClick={onEdit} className="text-xs font-bold text-brand-800 hover:underline shrink-0">Change</button>
      </div>
      {!active && (
        <p className="text-[11px] text-slate-500 mt-3">
          Razorpay checks new bank accounts (usually minutes, sometimes a working day). Your earnings are kept safe until then.
        </p>
      )}
      {account.requirements?.length > 0 && !active && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
          <p className="font-bold mb-1">Razorpay needs:</p>
          <ul className="list-disc pl-4">
            {account.requirements.map((r, i) => <li key={i}>{(r.field_reference || 'a detail').replace(/[._]/g, ' ')}</li>)}
          </ul>
        </div>
      )}
      {account.last_error && (
        <p className="mt-3 text-[11px] text-rose-700 font-semibold flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{account.last_error}</p>
      )}
    </Card>
  );
}

function BankForm({ hasAccount, onCancel, onSaved }: { hasAccount: boolean; onCancel?: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PayoutDetailsForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await savePayoutDetails(form);
      onSaved();
    } catch (err) {
      const e2 = err as PayoutSetupError;
      setError(e2.message);
      setFieldErrors(e2.fields || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={hasAccount ? 'Change bank account' : 'Add your bank account'}>
      <p className="text-[11px] text-slate-500 mb-3 flex gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-brand-700 shrink-0" />
        Sent securely to Razorpay for verification (KYC). iDAM keeps only the last 4 digits. Re-enter every field when changing.
      </p>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.half ? 'col-span-1' : 'col-span-2'}>
            <span className="block text-[11px] font-bold text-slate-600 mb-1">{f.label}</span>
            <input
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              inputMode={f.inputMode}
              autoComplete="off"
              required
              aria-invalid={Boolean(fieldErrors[f.key])}
              className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/30 ${fieldErrors[f.key] ? 'border-rose-400' : 'border-slate-200'}`}
            />
            {fieldErrors[f.key] && <span className="block text-[11px] text-rose-700 font-semibold mt-1">{fieldErrors[f.key]}</span>}
          </label>
        ))}
        {error && <p role="alert" className="col-span-2 text-xs font-semibold text-rose-700">{error}</p>}
        <div className="col-span-2 flex items-center gap-2">
          <button type="submit" disabled={saving} className="bg-slate-900 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Submitting to Razorpay…' : 'Save bank account'}
          </button>
          {onCancel && <button type="button" onClick={onCancel} className="text-xs font-bold text-slate-600 px-3 py-2">Cancel</button>}
        </div>
      </form>
    </Card>
  );
}
