'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Navigation,
  Share2,
  Printer,
  ArrowLeft,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { Language, Booking } from '@/types';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import { getBookingByPassCode, fetchBookingByPassCode } from '@/lib/booking/service';
import { formatSecureQrPayload } from '@/lib/parking/passSecurity';
import { useAuth } from '@/context/AuthContext';

// Mock pass registry — fallback strictly for demonstration passes in demo mode
const MOCK_PASS_REGISTRY: Record<string, {
  locationIndex: number;
  date: string;
  timeSlot: string;
  vehicle: string;
  amount: string;
  payment: string;
  paymentId?: string;
}> = {
  'IDM-82931': { locationIndex: 0, date: '12 Sep 2026', timeSlot: '10:00 AM - 12:00 PM', vehicle: 'TN 59 AB 1234', amount: '₹85', payment: 'Razorpay', paymentId: 'pay_IDM82931DEMO' },
  'IDM-44120': { locationIndex: 1, date: '10 Sep 2026', timeSlot: '02:00 PM - 04:00 PM', vehicle: 'TN 59 C 5678', amount: '₹65', payment: 'Razorpay', paymentId: 'pay_IDM44120DEMO' },
};

interface DigitalPassClientProps {
  passId: string;
}

export function DigitalPassClient({ passId }: DigitalPassClientProps) {
  const router = useRouter();
  const { isDemoMode } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [copiedTxn, setCopiedTxn] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(() => getBookingByPassCode(passId));
  const [isLoading, setIsLoading] = useState<boolean>(!booking && !MOCK_PASS_REGISTRY[passId]);

  useEffect(() => {
    let isMounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    async function loadBooking() {
      try {
        const dbBooking = await fetchBookingByPassCode(passId);
        if (!isMounted) return;
        if (dbBooking) {
          // The server keeps only the token hash; the scannable token lives on the booking device
          const local = getBookingByPassCode(passId);
          setBooking(local?.passToken ? { ...dbBooking, passToken: local.passToken, qrData: local.qrData } : dbBooking);
          // Payment confirmation may arrive a little later (webhook): keep checking for ~2 minutes
          if (dbBooking.paymentStatus === 'pending' && polls < 24) {
            polls++;
            pollTimer = setTimeout(loadBooking, 5000);
          }
        }
        setIsLoading(false);
      } catch (err) {
        if (isMounted) setIsLoading(false);
      }
    }
    loadBooking();
    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [passId]);

  const mockFallback = isDemoMode ? MOCK_PASS_REGISTRY[passId] : undefined;
  const isAwaitingPayment = Boolean(booking && booking.paymentStatus !== 'completed' && booking.status !== 'cancelled');
  const isCancelled = booking?.status === 'cancelled';
  const isNotFound = !isLoading && !booking && !mockFallback;

  const location = booking?.parkingLocation
    || (mockFallback ? MOCK_PARKING_LOCATIONS[mockFallback.locationIndex] : MOCK_PARKING_LOCATIONS[0]);

  const passDate = booking?.bookingDate
    || mockFallback?.date
    || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const passTimeSlot = booking
    ? `${booking.startTime} - ${booking.endTime}`
    : (mockFallback?.timeSlot ?? '10:00 AM - 12:00 PM');

  const passVehicle = booking?.vehicleNumber
    || mockFallback?.vehicle
    || 'TN 59 AB 1234';

  const passAmount = booking
    ? `₹${booking.totalAmount}`
    : (mockFallback?.amount ?? '₹85');

  const passPayment = booking?.paymentMethod
    || mockFallback?.payment
    || 'Razorpay';

  const passPaymentId = booking?.paymentId
    || mockFallback?.paymentId
    || (isAwaitingPayment ? 'awaiting confirmation' : '—');

  const qrPayload = booking?.qrData
    || (booking?.passToken ? formatSecureQrPayload(booking.passToken) : formatSecureQrPayload(passId));

  useEffect(() => {
    if ((booking && !isAwaitingPayment && !isCancelled) || mockFallback) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.35 }
        });
      } catch (e) {
        // ignore
      }
    }
  }, [booking, mockFallback]);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `My iDAM Parking Pass: ${passId}\nLocation: ${location.title}\n${passDate} (${passTimeSlot})\nPayment: ${passPayment} (${passPaymentId})\nStatus: ${isCancelled ? 'CANCELLED' : isAwaitingPayment ? 'AWAITING PAYMENT' : 'CONFIRMED'}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyPaymentId = () => {
    if (passPaymentId) {
      navigator.clipboard?.writeText(passPaymentId);
      setCopiedTxn(true);
      setTimeout(() => setCopiedTxn(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
        <Navbar lang={lang} onLanguageToggle={setLang} activeView="web" onViewChange={() => {}} onOpenOwnerModal={() => {}} />
        <main className="max-w-md mx-auto px-4 py-20 text-center space-y-4 flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-gray-800">Loading your digital pass...</h2>
          <p className="text-xs text-gray-500">Retrieving confirmed booking records</p>
        </main>
        <Footer lang={lang} />
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
        <Navbar lang={lang} onLanguageToggle={setLang} activeView="web" onViewChange={() => {}} onOpenOwnerModal={() => {}} />
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900">Pass Not Found</h1>
            <p className="text-sm text-gray-600">
              No active or valid parking pass found for reference <span className="tabular font-bold text-gray-800">{passId}</span>.
            </p>
          </div>
          <div className="flex items-center space-x-3 w-full pt-2">
            <button
              onClick={() => router.push('/my-bookings')}
              className="flex-1 bg-brand-950 hover:bg-brand-900 text-white font-bold py-3.5 px-6 rounded-2xl text-xs shadow-md transition-all text-center cursor-pointer"
            >
              My Bookings
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-bold py-3.5 px-6 rounded-2xl text-xs border border-gray-200 shadow-2xs transition-all text-center cursor-pointer"
            >
              Explore Map
            </button>
          </div>
        </main>
        <Footer lang={lang} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans print:min-h-0 print:bg-white">
      
      {/* Printing shows only the pass itself (header, footer and buttons are screen-only) */}
      <div className="print:hidden">
        <Navbar
          lang={lang}
          onLanguageToggle={setLang}
          activeView="web"
          onViewChange={() => {}}
          onOpenOwnerModal={() => {}}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 w-full flex-1 space-y-6 print:p-0 print:space-y-4">
        
        {/* Top Back & Print Controls */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-brand-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Map Discovery</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Print Pass</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="p-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 hover:bg-brand-100 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-brand-700" />
              <span>Share Pass</span>
            </button>
          </div>
        </div>

        {(isAwaitingPayment || isCancelled) && (
          <div role="status" className={`rounded-3xl p-6 shadow-xl border ${isCancelled ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
            <h1 className="text-xl font-black tracking-tight">
              {isCancelled ? 'This booking was cancelled' : 'Confirming your payment…'}
            </h1>
            <p className="text-xs mt-1">
              {isCancelled
                ? 'This pass cannot be used for entry.'
                : 'If you completed the payment, this page updates automatically within a minute or two. Your entry QR appears once payment is confirmed. If you did not pay, the slot is released after 15 minutes.'}
            </p>
          </div>
        )}

        {/* Confirmed Banner */}
        {!isAwaitingPayment && !isCancelled && (
        <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-brand-900 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 bg-brand-500/20 text-brand-300 border border-brand-400/30 px-3 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Booking Confirmed</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Your Digital Pass is Ready</h1>
            <p className="text-xs text-gray-300">Show this QR code at the entrance boom barrier</p>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-brand-300 shrink-0 border border-white/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>
        )}

        {/* Main Pass Card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden relative print:shadow-none print:break-inside-avoid">
          
          <div className="h-2 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-700" />

          <div className="p-6 sm:p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-gray-100 pb-8">
              
              {/* QR Code Column */}
              <div className="md:col-span-5 text-center">
                <div className="bg-brand-50/60 p-5 rounded-3xl border border-brand-100 inline-block shadow-inner">
                  {isAwaitingPayment || isCancelled ? (
                    <div className="w-40 h-40 mx-auto flex items-center justify-center text-center text-xs font-semibold text-gray-500">
                      {isCancelled ? 'Pass cancelled' : 'QR available after payment is confirmed'}
                    </div>
                  ) : (
                    <QRCodeSVG
                      value={qrPayload}
                      size={160}
                      level="H"
                      className="mx-auto"
                    />
                  )}
                  <div className="tabular text-xs font-bold text-gray-900 mt-3">
                    {passId}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 mt-2 font-medium">
                  Scan for entry verification
                </div>
              </div>

              {/* Reservation Details Column */}
              <div className="md:col-span-7 space-y-4 text-sm">
                <div>
                  <label className="text-xs font-bold text-gray-400 block">Parking Spot</label>
                  <div className="font-extrabold text-gray-900 text-lg flex items-center space-x-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-brand-700 shrink-0" />
                    <span>{location.title}</span>
                  </div>
                  <div className="text-xs text-gray-500 pl-5">{location.address}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block">Date</label>
                      <div className="font-bold text-gray-800 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{passDate}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 block">Time Slot</label>
                      <div className="font-bold text-gray-800 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span>{passTimeSlot}</span>
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-xs font-bold text-gray-400 block">Vehicle Plate</label>
                      <div className="tabular font-extrabold text-gray-900 text-base mt-0.5">
                        {passVehicle}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 block">{isAwaitingPayment ? 'Amount' : 'Amount Paid'}</label>
                      <div className="font-extrabold text-brand-800 text-base mt-0.5">
                        {passAmount}
                      </div>
                      
                      {/* Razorpay Gateway Badge */}
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          {passPayment}
                        </span>
                        {passPaymentId && (
                          <button
                            type="button"
                            onClick={handleCopyPaymentId}
                            className="text-[10px] tabular text-gray-500 hover:text-gray-800 flex items-center space-x-0.5 bg-gray-100 px-1.5 py-0.2 rounded transition-colors"
                            title="Click to copy transaction ID"
                          >
                            <span className="truncate max-w-[90px]">{passPaymentId}</span>
                            {copiedTxn ? <Check className="w-2.5 h-2.5 text-brand-600" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-brand-900">
                <ShieldCheck className="w-4 h-4 text-brand-700" />
                <span>Authorized Parking Guarantee • Real-time Gate Sync</span>
              </div>

              <button
                onClick={() => window.open(`https://maps.google.com/?q=${location.latitude},${location.longitude}`, '_blank')}
                className="print:hidden w-full sm:w-auto bg-brand-950 hover:bg-brand-900 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
              >
                <Navigation className="w-4 h-4 text-brand-300" />
                <span>Navigate in Google Maps &rarr;</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      <div className="print:hidden">
        <Footer lang={lang} />
      </div>

    </div>
  );
}
