'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Ticket, XCircle, Navigation, Eye, CheckCircle2 } from 'lucide-react';
import { AppTabBar } from './AppTabBar';
import { QRCodeSVG as QR } from 'qrcode.react';
import { Language, Booking } from '@/types';
import { getAllBookings, fetchUserBookings } from '@/lib/booking/service';
import { useAuth } from '@/context/AuthContext';
import { cancelBooking } from '@/lib/parking/service';

interface MyPassesScreenProps {
  lang: Language;
  onBack: () => void;
  onNavigateToHome: () => void;
  onNavigateToProfile: () => void;
}

export const MyPassesScreen: React.FC<MyPassesScreenProps> = ({
  onBack,
  onNavigateToHome,
  onNavigateToProfile
}) => {
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'active' | 'past'>('active');
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const { isDemoMode, supabaseUser } = useAuth();

  // Demo passes live on the device; real passes come from the server (status, payment)
  const loadPasses = async (): Promise<Booking[]> => {
    const list = isDemoMode ? getAllBookings() : supabaseUser ? await fetchUserBookings(supabaseUser.id) : [];
    setUserBookings(list);
    return list;
  };

  useEffect(() => {
    let isMounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    const refresh = async () => {
      const list = await loadPasses();
      // A just-paid booking is confirmed by the payment webhook shortly after: keep checking
      if (isMounted && list.some(b => b.status === 'pending') && polls < 24) {
        polls++;
        pollTimer = setTimeout(refresh, 5000);
      }
    };
    refresh();
    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, supabaseUser?.id]);

  const SEED_PASSES = [
    {
      id: 'IDM-82931',
      bookingId: 'seed-bk-1',
      title: 'West Tower Square Parking',
      address: 'West Tower Street, Near Temple Gate 3, Madurai',
      vehicle: 'TN 59 AB 1234 (Car)',
      slot: 'Spot A-02 [EV ]',
      time: '10:00 AM - 12:00 PM',
      date: 'Today',
      amount: '₹75',
      status: 'ACTIVE',
      statusColor: 'bg-brand-100 text-brand-900 border-brand-300 font-black',
      qrValue: 'IDAM:v2:seed_82931_west_tower'
    },
    {
      id: 'IDM-44120',
      bookingId: 'seed-bk-2',
      title: 'South Masi Street Multi-level',
      address: 'South Masi Street, Madurai',
      vehicle: 'TN 59 C 5678 (Bike)',
      slot: 'Spot B-04',
      time: '02:00 PM - 04:00 PM',
      date: '10 Sep 2026',
      amount: '₹65',
      status: 'COMPLETED',
      statusColor: 'bg-slate-100 text-slate-700 border-slate-300',
      qrValue: 'IDAM:v2:seed_44120_south_masi'
    }
  ];

  const mappedLivePasses = userBookings.map((b) => {
    const isLiveActive = b.status === 'confirmed' || b.status === 'active';
    const isAwaitingPayment = b.status === 'pending' || (b.paymentStatus === 'pending' && b.status !== 'cancelled');
    const isCancelled = b.status === 'cancelled';
    const statusText = isAwaitingPayment
      ? 'PAYMENT PENDING'
      : isLiveActive ? 'ACTIVE' : (isCancelled ? 'CANCELLED' : 'COMPLETED');
    const statusColor = isAwaitingPayment
      ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
      : isLiveActive
      ? 'bg-brand-100 text-brand-900 border-brand-300 font-black'
      : (isCancelled ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold' : 'bg-slate-100 text-slate-700 border-slate-300');

    return {
      id: b.passCode,
      bookingId: b.id,
      title: b.parkingLocation?.title || 'Parking space',
      address: b.parkingLocation?.address || '',
      vehicle: `${b.vehicleNumber || '—'} (${b.vehicleType.toUpperCase()})`,
      slot: 'Any free bay',
      time: `${b.startTime} - ${b.endTime}`,
      date: b.bookingDate,
      amount: `₹${b.totalAmount}`,
      status: statusText,
      statusColor,
      // No entry QR until the payment is confirmed
      qrValue: isLiveActive && !isAwaitingPayment ? (b.qrData || `IDAM:v2:${b.passCode}`) : null,
      canCancel: isLiveActive && !isAwaitingPayment
    };
  });

  // Sample passes are only for the demo; real users see exactly their own bookings
  const combinedPasses = isDemoMode && mappedLivePasses.length === 0 ? SEED_PASSES : mappedLivePasses;

  const activePasses = combinedPasses.filter(p => p.status === 'ACTIVE' || p.status === 'PAYMENT PENDING');
  const pastPasses = combinedPasses.filter(p => p.status === 'COMPLETED' || p.status === 'CANCELLED');
  const displayPasses = activeFilter === 'active' ? activePasses : pastPasses;

  const handleCancelPass = async (pass: any) => {
    if (!pass.bookingId) return;
    const res = await cancelBooking(pass.bookingId, 'Driver cancelled pass in mobile app');
    setCancelMessage(res.message);
    loadPasses();
    setTimeout(() => {
      setSelectedPass(null);
      setCancelMessage(null);
    }, 1200);
  };

  const statusStyle: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'Active', cls: 'text-go-700 bg-go-50 border-go-100' },
    'PAYMENT PENDING': { label: 'Confirming payment', cls: 'text-amber-800 bg-amber-50 border-amber-200' },
    COMPLETED: { label: 'Completed', cls: 'text-slate-600 bg-slate-100 border-slate-200' },
    CANCELLED: { label: 'Cancelled', cls: 'text-rose-700 bg-rose-50 border-rose-200' },
  };
  const StatusTag = ({ status }: { status: string }) => {
    const st = statusStyle[status] || statusStyle.COMPLETED;
    return <span className={`inline-block text-xs font-bold border rounded px-1.5 py-0.5 ${st.cls}`}>{st.label}</span>;
  };
  const [confirmCancel, setConfirmCancel] = useState(false);
  const plateOf = (vehicle: string) => vehicle.replace(/\s*\(.*\)$/, '');

  return (
    <div className="h-full flex flex-col bg-limewash text-ink relative animate-fade-in">
      <header className="px-4 pt-4 border-b border-slate-300">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-10 h-10 -ml-1 rounded-md flex items-center justify-center active:bg-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[1.6rem] font-black">Your passes</h1>
        </div>
        <div className="flex mt-3" role="tablist">
          {([
            ['active', `Upcoming (${activePasses.length})`],
            ['past', `Past (${pastPasses.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeFilter === id}
              onClick={() => setActiveFilter(id)}
              className={`flex-1 pb-2.5 text-[15px] font-bold border-b-[3px] -mb-px cursor-pointer ${
                activeFilter === id ? 'border-brand-700 text-ink' : 'border-transparent text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        {displayPasses.length === 0 ? (
          <div className="pt-10 text-center">
            <Ticket className="w-10 h-10 text-slate-400 mx-auto" aria-hidden />
            <p className="font-bold mt-3">{activeFilter === 'active' ? 'No upcoming bookings' : 'No past bookings yet'}</p>
            <p className="text-sm text-slate-600 mt-1">Passes appear here as soon as you book a space.</p>
            {activeFilter === 'active' && (
              <button onClick={onNavigateToHome} className="mt-5 bg-brand-700 text-white font-bold px-5 py-3 rounded-lg cursor-pointer">
                Find parking
              </button>
            )}
          </div>
        ) : (
          displayPasses.map((pass) => (
            <article key={pass.id} className="bg-white rounded-lg border border-slate-300 overflow-hidden">
              <button onClick={() => { setConfirmCancel(false); setSelectedPass(pass); }} className="w-full text-left flex cursor-pointer active:bg-slate-50">
                <span className="flex-1 min-w-0 p-4">
                  <StatusTag status={pass.status} />
                  <span className="block font-black text-[17px] leading-snug mt-2">{pass.title}</span>
                  <span className="block text-sm text-slate-600 mt-1 tabular">
                    {pass.date}, {pass.time}
                  </span>
                  <span className="plate inline-block text-sm px-2 py-0.5 mt-3">{plateOf(pass.vehicle)}</span>
                </span>
                <span className="w-[104px] shrink-0 border-l-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1.5 p-2">
                  {pass.qrValue ? (
                    <QR value={pass.qrValue} size={64} />
                  ) : (
                    <span className="w-16 h-16 flex items-center justify-center text-[11px] font-semibold text-amber-800 text-center leading-tight">QR after payment</span>
                  )}
                  <span className="text-xs font-bold tabular">{pass.amount}</span>
                </span>
              </button>
              <div className="flex border-t border-slate-200 text-sm font-bold">
                <button onClick={() => { setConfirmCancel(false); setSelectedPass(pass); }} className="flex-1 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer active:bg-slate-50">
                  <Eye className="w-4 h-4" aria-hidden />
                  Show pass
                </button>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(pass.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 flex items-center justify-center gap-1.5 border-l border-slate-200 text-brand-700 active:bg-slate-50"
                >
                  <Navigation className="w-4 h-4" aria-hidden />
                  Directions
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedPass && (
        <div className="fixed inset-0 bg-ink/70 z-50 flex items-end justify-center animate-fade-in" role="dialog" aria-modal="true" aria-label="Parking pass">
          <div className="bg-white rounded-t-xl w-full max-w-[440px] p-5 pb-6 shadow-2xl animate-slide-up">
            {cancelMessage ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-go-600 mx-auto" aria-hidden />
                <p className="text-lg font-black mt-3">{cancelMessage}</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StatusTag status={selectedPass.status} />
                    <h2 className="text-xl font-black mt-2 leading-snug">{selectedPass.title}</h2>
                    <p className="text-sm text-slate-600">{selectedPass.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5 mt-5">
                  <div className="p-1.5 border-2 border-ink rounded-md shrink-0">
                    {selectedPass.qrValue ? (
                      <QR value={selectedPass.qrValue} size={132} level="H" />
                    ) : (
                      <div className="w-[132px] h-[132px] flex items-center justify-center text-sm font-semibold text-amber-800 text-center p-2">
                        Your QR appears once payment is confirmed
                      </div>
                    )}
                  </div>
                  <dl className="text-sm space-y-2 min-w-0">
                    <div>
                      <dt className="text-xs text-slate-500">Pass code</dt>
                      <dd className="font-black text-lg tabular whitespace-nowrap">{selectedPass.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">When</dt>
                      <dd className="font-bold tabular">{selectedPass.date}, {selectedPass.time}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Paid</dt>
                      <dd className="font-bold tabular">{selectedPass.amount}</dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">{selectedPass.slot}</span>
                  <span className="plate text-base px-2.5 py-0.5">{plateOf(selectedPass.vehicle)}</span>
                </div>

                {selectedPass.canCancel && (
                  confirmCancel ? (
                    <div className="mt-5 border-l-4 border-rose-600 bg-rose-50 p-3 rounded">
                      <p className="text-sm text-rose-900">Cancel this booking? If it&apos;s more than 30 minutes before your start time, the full amount is refunded.</p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleCancelPass(selectedPass)} className="flex-1 bg-rose-700 text-white font-bold py-2.5 rounded-md text-sm cursor-pointer">
                          Cancel booking
                        </button>
                        <button onClick={() => setConfirmCancel(false)} className="flex-1 bg-white border border-slate-300 font-bold py-2.5 rounded-md text-sm cursor-pointer">
                          Keep it
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      className="mt-5 w-full text-rose-700 font-bold py-2.5 text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" aria-hidden />
                      Cancel booking
                    </button>
                  )
                )}

                <button onClick={() => setSelectedPass(null)} className="mt-2 w-full bg-ink text-white font-bold py-3 rounded-lg cursor-pointer">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <AppTabBar active="passes" onHome={onNavigateToHome} onProfile={onNavigateToProfile} />
    </div>
  );
};
