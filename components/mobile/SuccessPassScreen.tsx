'use client';

import React, { useState } from 'react';
import { Check, Navigation, Share2, Receipt, Copy, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ParkingLocation, Language } from '@/types';

interface SuccessPassScreenProps {
  location: ParkingLocation;
  bookingDetails: {
    date: string;
    time: string;
    duration: number;
    total: number;
    vehicleNumber?: string;
    addons?: string[];
    paymentId?: string;
    paymentMethod?: string;
  };
  onReset: () => void;
  lang: Language;
}

/** Ticket edge: half-circle notches cut into both sides where the stub tears off */
const Perforation = () => (
  <div className="relative h-6" aria-hidden>
    <span className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-limewash" />
    <span className="absolute -right-3 top-0 w-6 h-6 rounded-full bg-limewash" />
    <span className="absolute left-5 right-5 top-1/2 border-t-2 border-dashed border-slate-300" />
  </div>
);

export const SuccessPassScreen: React.FC<SuccessPassScreenProps> = ({ location, bookingDetails, onReset, lang }) => {
  const passCode = (bookingDetails as any)?.passCode || 'IDM-82931';
  const qrValue = (bookingDetails as any)?.qrData || `IDAM:v2:demo_${passCode.toLowerCase().replace('-', '_')}_${location.id}`;
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const name = lang === 'ta' && location.titleTa ? location.titleTa : location.title;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(passCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSharePass = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'iDAM parking pass',
          text: `Parking pass ${passCode} for ${location.title}.`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      handleCopyCode();
    }
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  return (
    <div className="h-full flex flex-col bg-limewash text-ink overflow-y-auto no-scrollbar animate-fade-in">
      <div className="px-5 pt-6 pb-4 flex items-start gap-3">
        <span className="w-9 h-9 rounded-md bg-go-600 text-white flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 stroke-[3]" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-black leading-tight">You&apos;re booked</h1>
          <p className="text-[15px] text-slate-600 mt-0.5">Show this pass to the owner at the gate.</p>
        </div>
      </div>

      <article className="mx-4 bg-white rounded-xl shadow-lg overflow-hidden" aria-label="Parking pass">
        <div className="bg-brand-700 text-white px-5 py-3 flex items-center justify-between">
          <span className="font-black tracking-tight">iDAM parking pass</span>
          <span className="font-tamil text-sm text-white/75">இடம்</span>
        </div>

        <div className="px-5 pt-4">
          <h2 className={`text-xl font-black leading-snug ${lang === 'ta' && location.titleTa ? 'font-tamil' : ''}`}>{name}</h2>
          <p className="text-sm text-slate-600 mt-0.5">{location.landmark || location.address}</p>

          <dl className="grid grid-cols-3 gap-3 mt-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Date</dt>
              <dd className="font-bold tabular">{bookingDetails.date}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Arrive</dt>
              <dd className="font-bold tabular">{bookingDetails.time}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">For</dt>
              <dd className="font-bold tabular">
                {bookingDetails.duration} {bookingDetails.duration === 1 ? 'hour' : 'hours'}
              </dd>
            </div>
          </dl>

          {bookingDetails.vehicleNumber && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Vehicle</span>
              <span className="plate text-lg px-3 py-1">{bookingDetails.vehicleNumber}</span>
            </div>
          )}
        </div>

        <Perforation />

        <div className="px-5 pb-5 flex items-center gap-5">
          <div className="p-1.5 border-2 border-ink rounded-md shrink-0">
            <QRCodeSVG value={qrValue} size={124} level="H" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Pass code</p>
            <p className="text-xl font-black tabular whitespace-nowrap mt-0.5">{passCode}</p>
            <button onClick={handleCopyCode} className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 cursor-pointer">
              <Copy className="w-4 h-4" aria-hidden />
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <p className="text-sm text-slate-600 mt-3 tabular">
              Paid <span className="font-black text-ink">₹{bookingDetails.total}</span>
            </p>
          </div>
        </div>
      </article>

      <div className="px-4 pt-4 pb-5 mt-auto space-y-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-brand-700 active:bg-brand-800 text-white py-3.5 rounded-lg flex items-center justify-center gap-2 text-base font-black"
        >
          <Navigation className="w-5 h-5" aria-hidden />
          Get directions
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSharePass}
            className="py-3 bg-white border border-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:bg-slate-50"
          >
            <Share2 className="w-4 h-4" aria-hidden />
            Share pass
          </button>
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="py-3 bg-white border border-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:bg-slate-50"
          >
            <Receipt className="w-4 h-4" aria-hidden />
            Receipt
          </button>
        </div>
        <button onClick={onReset} className="w-full py-2.5 text-sm font-bold text-slate-600 cursor-pointer">
          Go to my passes
        </button>
      </div>

      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
          <div className="bg-white w-full max-w-[360px] rounded-xl p-5 shadow-2xl animate-slide-up">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="receipt-title" className="text-lg font-black">Receipt</h3>
                <p className="text-sm text-slate-500 tabular">INV-{passCode}</p>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} aria-label="Close receipt" className="p-1 -m-1 text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="mt-4 text-[15px] divide-y divide-slate-200 border-y border-slate-200">
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-600">Parking</dt>
                <dd className="font-bold tabular">₹{Math.max(0, bookingDetails.total - 5)}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-600">Platform fee</dt>
                <dd className="font-bold tabular">₹5</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-600">Paid with</dt>
                <dd className="font-bold">{bookingDetails.paymentMethod || 'Razorpay'}</dd>
              </div>
              {bookingDetails.paymentId && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-600">Payment ID</dt>
                  <dd className="font-semibold text-sm truncate tabular">{bookingDetails.paymentId}</dd>
                </div>
              )}
              <div className="flex justify-between py-3 text-lg">
                <dt className="font-black">Total</dt>
                <dd className="font-black tabular">₹{bookingDetails.total}</dd>
              </div>
            </dl>

            <button onClick={() => setShowInvoiceModal(false)} className="mt-4 w-full bg-ink text-white font-bold py-3 rounded-lg cursor-pointer">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
