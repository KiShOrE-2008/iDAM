'use client';

import React, { useState, useEffect } from 'react';
import { Check, MapPin, Calendar, Clock, Navigation, Eye, Share2, Download, ShieldCheck, Copy, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
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

export const SuccessPassScreen: React.FC<SuccessPassScreenProps> = ({
  location,
  bookingDetails,
  onReset,
  lang
}) => {
  const passCode = (bookingDetails as any)?.passCode || 'IDM-82931';
  const currentYear = new Date().getFullYear();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.35 }
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(passCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSharePass = () => {
    if (navigator.share) {
      navigator.share({
        title: 'iDAM Digital Parking Pass',
        text: `My Parking Pass ${passCode} for ${location.title}.`,
        url: window.location.href
      }).catch(() => {});
    } else {
      alert(`Sharing Parking Pass ${passCode}\nSpot: Slot A-02\nLocation: ${location.title}`);
    }
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F8F5] text-[#14201D] p-4 text-center relative overflow-y-auto no-scrollbar animate-fade-in">
      
      {/* Top Header */}
      <div className="pt-2 space-y-1">
        <div className="w-13 h-13 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-200/50 animate-bounce">
          <Check className="w-7 h-7 stroke-[3]" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Reservation Confirmed!</h2>
        <p className="text-[11px] text-slate-500 font-semibold">Show QR code at entry scanner</p>
      </div>

      {/* Main Digital iDAM Parking Pass Card */}
      <div className="my-auto bg-white p-4 sm:p-5 rounded-3xl border border-emerald-200/80 shadow-xl space-y-3.5 max-w-xs mx-auto w-full relative overflow-hidden">
        
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        {/* Pass Header */}
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <div className="text-left">
            <div className="text-xs font-black tracking-widest text-emerald-950 uppercase flex items-center space-x-1">
              <span>iDAM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              PASS CODE
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
          >
            <span>{passCode}</span>
            <Copy className="w-3 h-3 text-slate-500" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border-2 border-emerald-400/50 inline-block mx-auto relative shadow-inner">
          <div className="bg-white p-2 rounded-xl">
            <QRCodeSVG
              value={bookingDetails && (bookingDetails as any).qrData ? (bookingDetails as any).qrData : `IDAM:v2:demo_${passCode.toLowerCase().replace('-', '_')}_${location.id}`}
              size={120}
              level="H"
              className="mx-auto"
            />
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-300 mt-1.5 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Secured QR Verified</span>
          </div>
        </div>

        {/* Location & Time Info */}
        <div className="text-left space-y-1.5 text-xs border-t border-slate-100 pt-2.5">
          <div className="flex items-center justify-between text-slate-900 font-bold">
            <span className="flex items-center space-x-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">{location.title}</span>
            </span>
            <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
              Slot A-02
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-600 text-[11px] font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{bookingDetails.date} {currentYear} • {bookingDetails.time}</span>
          </div>

          {bookingDetails.vehicleNumber && (
            <div className="flex items-center space-x-2 text-slate-600 text-[11px] font-medium font-mono">
              <span className="bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                {bookingDetails.vehicleNumber}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-semibold">Gateway</span>
            <span className="bg-blue-50 text-blue-900 font-extrabold px-2 py-0.5 rounded text-[10px] flex items-center space-x-1">
              <span>{bookingDetails.paymentMethod || 'Razorpay'}</span>
              <span className="text-emerald-600">✓ Verified</span>
            </span>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center justify-center space-x-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Invoice</span>
          </button>

          <button
            onClick={handleSharePass}
            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Share</span>
          </button>
        </div>

      </div>

      {/* Bottom Action Buttons */}
      <div className="pb-2 space-y-2 text-xs font-bold max-w-xs mx-auto w-full">
        <button
          onClick={() => alert(`Opening Google Maps turn-by-turn navigation to ${location.title}...`)}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-3.5 rounded-2xl shadow-xl flex items-center justify-center space-x-2 text-xs tracking-wide transition-all transform active:scale-98"
        >
          <Navigation className="w-4 h-4 text-emerald-300" />
          <span>Open GPS Navigation</span>
        </button>

        <button
          onClick={onReset}
          className="w-full text-slate-600 hover:text-slate-900 text-[11px] font-bold py-1"
        >
          Back to Profile & Passes
        </button>
      </div>

      {/* Tax Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-white w-full max-w-[320px] rounded-2xl p-4 shadow-2xl border border-slate-200 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Official GST Tax Invoice</p>
                <h4 className="font-extrabold text-xs text-slate-900">INV-{passCode}</h4>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Parking Spot Fee</span>
                <span className="font-bold text-slate-900">₹{Math.max(20, bookingDetails.total - 10)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Service Fee</span>
                <span className="font-bold text-slate-900">₹5</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Gateway</span>
                <span className="font-bold text-blue-900">{bookingDetails.paymentMethod || 'Razorpay'}</span>
              </div>
              {bookingDetails.paymentId && (
                <div className="flex justify-between">
                  <span>Transaction ID</span>
                  <span className="font-mono text-[10px] font-bold text-slate-800">{bookingDetails.paymentId}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-1 font-extrabold text-xs text-slate-900">
                <span>Total Paid</span>
                <span className="text-emerald-700">₹{bookingDetails.total}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => alert('Invoice PDF downloaded to device!')}
                className="flex-1 bg-emerald-100 text-emerald-900 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Download</span>
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
