'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { CheckCircle2, MapPin, Calendar, Clock, Navigation, Share2, Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Language } from '@/types';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

// Mock pass registry — in production this would be fetched from the DB by passId
const MOCK_PASS_REGISTRY: Record<string, {
  locationIndex: number;
  date: string;
  timeSlot: string;
  vehicle: string;
  amount: string;
  payment: string;
}> = {
  'IDM-82931': { locationIndex: 0, date: '12 Sep 2026', timeSlot: '10:00 AM - 12:00 PM', vehicle: 'TN 59 AB 1234', amount: '₹85', payment: 'UPI' },
  'IDM-44120': { locationIndex: 1, date: '10 Sep 2026', timeSlot: '02:00 PM - 04:00 PM', vehicle: 'TN 59 C 5678', amount: '₹65', payment: 'UPI' },
};

interface DigitalPassClientProps {
  passId: string;
}

export function DigitalPassClient({ passId }: DigitalPassClientProps) {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');

  // Look up pass data by passId — fallback to first location if unknown pass
  const passData = MOCK_PASS_REGISTRY[passId];
  const location = MOCK_PARKING_LOCATIONS[passData?.locationIndex ?? 0];
  const passDate = passData?.date ?? `${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const passTimeSlot = passData?.timeSlot ?? '10:00 AM - 12:00 PM';
  const passVehicle = passData?.vehicle ?? 'N/A';
  const passAmount = passData?.amount ?? '₹0';
  const passPayment = passData?.payment ?? 'UPI';

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.35 }
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🚗 My iDAM Parking Pass: ${passId}\n📍 Location: ${location.title}\n🕒 ${passDate} (${passTimeSlot})\nStatus: CONFIRMED`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 w-full flex-1 space-y-8">
        
        {/* Top Action Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/explore')}
            className="flex items-center space-x-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-2xs hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Explorer</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl hover:bg-emerald-100"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Pass</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 text-xs font-bold text-gray-800 bg-white border border-gray-200 px-3.5 py-2 rounded-xl hover:bg-gray-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
          </div>
        </div>

        {/* Digital Ticket Container */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden print:border-none print:shadow-none">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-6 sm:p-8 text-white text-center relative">
            <div className="w-14 h-14 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 stroke-[3]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Parking Reservation Confirmed!</h1>
            <p className="text-xs text-emerald-200 mt-1">Show this digital QR code to gate security at parking entry.</p>

            <div className="mt-4 inline-block bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-mono font-bold px-4 py-1.5 rounded-full">
              PASS ID: {passId}
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border-b border-gray-100 pb-8">
              
              {/* QR Code Column */}
              <div className="md:col-span-5 text-center">
                <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-100 inline-block shadow-inner">
                  <QRCodeSVG
                    value={`IDAM_VERIFY:${passId}_LOCATION:${location.id}`}
                    size={160}
                    level="H"
                    className="mx-auto"
                  />
                  <div className="font-mono text-xs font-bold text-gray-900 mt-3 tracking-widest">
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
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Parking Spot</label>
                  <div className="font-extrabold text-gray-900 text-lg flex items-center space-x-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{location.title}</span>
                  </div>
                  <div className="text-xs text-gray-500 pl-5">{location.address}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Date</label>
                      <div className="font-bold text-gray-800 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{passDate}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Time Slot</label>
                      <div className="font-bold text-gray-800 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span>{passTimeSlot}</span>
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Vehicle Plate</label>
                      <div className="font-mono font-extrabold text-gray-900 text-base mt-0.5">
                        {passVehicle}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Amount Paid</label>
                      <div className="font-extrabold text-emerald-800 text-base mt-0.5">
                        {passAmount} ({passPayment})
                      </div>
                    </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Authorized Parking Guarantee • Real-time Gate Sync</span>
              </div>

              <button
                onClick={() => window.open(`https://maps.google.com/?q=${location.latitude},${location.longitude}`, '_blank')}
                className="w-full sm:w-auto bg-emerald-950 hover:bg-emerald-900 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
              >
                <Navigation className="w-4 h-4 text-emerald-300" />
                <span>Navigate in Google Maps &rarr;</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      <Footer lang={lang} />

    </div>
  );
}
