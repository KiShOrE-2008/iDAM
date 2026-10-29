'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Car, Bike, ExternalLink, Check, X, PauseCircle, PlayCircle } from 'lucide-react';
import { AdminLayout, AdminCard, LoadState } from '@/components/admin/AdminLayout';
import { AdminSpace, ReviewAction, fetchAdminSpaces, reviewSpace, formatDateTime } from '@/lib/admin/service';

const TABS: { key: string | null; label: string }[] = [
  { key: 'pending_review', label: 'Waiting for review' },
  { key: 'active', label: 'Live' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'draft', label: 'Rejected / draft' },
  { key: null, label: 'All' }
];

export default function AdminRequestsPage() {
  return (
    <AdminLayout title="Listing requests" subtitle="Check each new parking space before drivers can book it.">
      <RequestsBody />
    </AdminLayout>
  );
}

function RequestsBody() {
  const [tab, setTab] = useState<string | null>('pending_review');
  const [spaces, setSpaces] = useState<AdminSpace[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setSpaces(null);
    setError(null);
    fetchAdminSpaces(tab).then(setSpaces).catch((e) => setError(e.message));
  };
  useEffect(load, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div role="tablist" className="flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
              tab === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <LoadState loading={!spaces} error={error}>
        {spaces && spaces.length === 0 && (
          <AdminCard>
            <p className="text-sm text-slate-500 text-center py-6">
              {tab === 'pending_review' ? 'No listings are waiting for review.' : 'No listings here.'}
            </p>
          </AdminCard>
        )}
        <div className="grid xl:grid-cols-2 gap-4">
          {spaces?.map((space) => (
            <SpaceReviewCard key={space.id} space={space} onDone={load} />
          ))}
        </div>
      </LoadState>
    </>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-900 border-amber-300',
  active: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  suspended: 'bg-rose-100 text-rose-900 border-rose-300',
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  inactive: 'bg-slate-100 text-slate-700 border-slate-300'
};
const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Waiting for review',
  active: 'Live',
  suspended: 'Suspended',
  draft: 'Rejected / draft',
  inactive: 'Paused by owner'
};

function SpaceReviewCard({ space, onDone }: { space: AdminSpace; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: ReviewAction) => {
    setBusy(action);
    setError(null);
    try {
      await reviewSpace(space.id, action, note.trim() || undefined);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const needsNote = (a: ReviewAction) => (a === 'reject' || a === 'suspend') && !note.trim();
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${space.latitude},${space.longitude}`;

  return (
    <AdminCard>
      <div className="flex gap-3">
        {space.image_url && (
          <img src={space.image_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100" loading="lazy" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-black text-sm text-slate-900 truncate">{space.title}</h3>
            <span className={`shrink-0 text-[10px] font-black border rounded-full px-2 py-0.5 ${STATUS_STYLE[space.status] || STATUS_STYLE.draft}`}>
              {STATUS_LABEL[space.status] || space.status}
            </span>
          </div>
          <p className="text-xs text-slate-600 flex items-start gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>{space.address}{space.landmark ? ` (near ${space.landmark})` : ''}</span>
          </p>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-emerald-800 hover:underline inline-flex items-center gap-1 mt-1">
            Check location on map <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mt-3 pt-3 border-t border-slate-100">
        <dt className="text-slate-500 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Car bays / rate</dt>
        <dd className="font-bold text-right">{space.car_capacity} · ₹{space.price_per_hour_car}/hr</dd>
        <dt className="text-slate-500 flex items-center gap-1"><Bike className="w-3.5 h-3.5" /> Bike bays / rate</dt>
        <dd className="font-bold text-right">{space.bike_capacity} · ₹{space.price_per_hour_bike}/hr</dd>
        <dt className="text-slate-500">Submitted</dt>
        <dd className="font-bold text-right">{formatDateTime(space.created_at)}</dd>
      </dl>

      <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
        <p className="font-black text-slate-900">{space.owner.name || 'Unknown owner'}</p>
        {space.owner.email && (
          <a href={`mailto:${space.owner.email}`} className="flex items-center gap-1 text-slate-600 hover:text-slate-900"><Mail className="w-3.5 h-3.5" /> {space.owner.email}</a>
        )}
        {space.owner.phone && (
          <a href={`tel:${space.owner.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-slate-900"><Phone className="w-3.5 h-3.5" /> {space.owner.phone}</a>
        )}
        <p className="text-slate-500">{space.owner.other_listings} other listing{space.owner.other_listings === 1 ? '' : 's'}</p>
      </div>

      {space.review_note && (
        <p className="mt-3 text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-600">
          <span className="font-bold">Last note{space.reviewed_at ? ` (${formatDateTime(space.reviewed_at)})` : ''}:</span> {space.review_note}
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <label className="block text-[11px] font-bold text-slate-600">
          Note to owner {space.status === 'active' ? '(required to suspend)' : '(required to reject)'}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Please add a photo of the entrance"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
        </label>
        {error && <p role="alert" className="text-[11px] font-semibold text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {(space.status === 'pending_review' || space.status === 'draft') && (
            <>
              <ActionButton onClick={() => act('approve')} busy={busy === 'approve'} tone="primary" icon={<Check className="w-3.5 h-3.5" />}>Approve & publish</ActionButton>
              {space.status === 'pending_review' && (
                <ActionButton onClick={() => act('reject')} busy={busy === 'reject'} disabled={needsNote('reject')} tone="danger" icon={<X className="w-3.5 h-3.5" />}>Reject</ActionButton>
              )}
            </>
          )}
          {(space.status === 'active' || space.status === 'inactive') && (
            <ActionButton onClick={() => act('suspend')} busy={busy === 'suspend'} disabled={needsNote('suspend')} tone="danger" icon={<PauseCircle className="w-3.5 h-3.5" />}>Suspend</ActionButton>
          )}
          {space.status === 'suspended' && (
            <ActionButton onClick={() => act('reinstate')} busy={busy === 'reinstate'} tone="primary" icon={<PlayCircle className="w-3.5 h-3.5" />}>Reinstate</ActionButton>
          )}
        </div>
      </div>
    </AdminCard>
  );
}

function ActionButton({ children, onClick, busy, disabled, tone, icon }: {
  children: React.ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean; tone: 'primary' | 'danger'; icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed ${
        tone === 'primary' ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : 'bg-white border border-rose-300 text-rose-800 hover:bg-rose-50'
      }`}
    >
      {icon}
      {busy ? 'Saving…' : children}
    </button>
  );
}
