'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Ticket, Calendar, Clock, MapPin, XCircle } from 'lucide-react';
import { Download, Share2, Navigation, Eye, CheckCircle2, FileText, Home, BookOpen, UserCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { QRCodeSVG as QR } from 'qrcode.react';
import { Language, Booking } from '@/types';
import { getAllBookings } from '@/lib/booking/service';
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

  const loadPasses = () => {
    const list = getAllBookings();
    setUserBookings(list);
  };

  useEffect(() => {
    loadPasses();
  }, []);

  const SEED_PASSES = [
    {
      id: 'IDM-82931',
      bookingId: 'seed-bk-1',
      title: 'West Tower Square Parking',
      address: 'West Tower Street, Near Temple Gate 3, Madurai',
      vehicle: 'TN 59 AB 1234 (Car)',
      slot: 'Spot A-02 [EV ⚡]',
      time: '10:00 AM - 12:00 PM',
      date: 'Today',
      amount: '₹75',
      status: 'ACTIVE',
      statusColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black',
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
    const isCancelled = b.status === 'cancelled';
    const statusText = isLiveActive ? 'ACTIVE' : (isCancelled ? 'CANCELLED' : 'COMPLETED');
    const statusColor = isLiveActive
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black'
      : (isCancelled ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold' : 'bg-slate-100 text-slate-700 border-slate-300');

    return {
      id: b.passCode,
      bookingId: b.id,
      title: b.parkingLocation?.title || 'Madurai Smart Parking',
      address: b.parkingLocation?.address || 'Madurai Central',
      vehicle: `${b.vehicleNumber || 'TN 59 AZ 8899'} (${b.vehicleType.toUpperCase()})`,
      slot: 'Spot A-02',
      time: `${b.startTime} - ${b.endTime}`,
      date: b.bookingDate,
      amount: `₹${b.totalAmount}`,
      status: statusText,
      statusColor,
      qrValue: b.qrData || `IDAM:v2:${b.passCode}`,
      canCancel: isLiveActive
    };
  });

  const combinedPasses = mappedLivePasses.length > 0 ? mappedLivePasses : SEED_PASSES;

  const activePasses = combinedPasses.filter(p => p.status === 'ACTIVE');
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

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F8F5] relative overflow-y-auto no-scrollbar animate-fade-in text-slate-900 select-none">
      
      {/* Top Mobile Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button onClick={onBack} className="p-1 rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-1.5">
          <Ticket className="w-4 h-4 text-emerald-600" />
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
            My Digital Passes
          </h3>
        </div>
        <div className="w-5" />
      </div>

      <div className="p-4 sm:p-5 space-y-4 flex-1">
        
        {/* Pass Filter Tabs */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex text-xs font-black">
          <button
            onClick={() => setActiveFilter('active')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeFilter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Active Passes ({activePasses.length})
          </button>
          <button
            onClick={() => setActiveFilter('past')}
            className={`flex-1 py-2 rounded-xl transition-all ${
              activeFilter === 'past' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Past History ({pastPasses.length})
          </button>
        </div>

        {/* Passes Card List */}
        {displayPasses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center space-y-3 border border-slate-200">
            <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-extrabold text-slate-500">No {activeFilter} passes found</p>
          </div>
        ) : (
          displayPasses.map((pass) => (
            <div
              key={pass.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md space-y-4 hover:border-emerald-500/40 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${pass.statusColor}`}>
                    ● {pass.status}
                  </span>
                  <h4 className="font-black text-sm text-slate-900">{pass.title}</h4>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[200px]">{pass.address}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-2xl flex flex-col items-center justify-center">
                  <QR value={pass.qrValue} size={50} />
                  <span className="text-[9px] font-mono font-black text-emerald-900 mt-1">
                    {pass.slot}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 font-semibold">
                <div>
                  <span className="text-slate-400 text-[10px] block">Time & Date</span>
                  <span className="text-slate-800 font-bold">{pass.time}</span>
                  <span className="text-slate-500 text-[11px] block">{pass.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Vehicle & Total</span>
                  <span className="text-slate-800 font-bold">{pass.vehicle}</span>
                  <span className="text-emerald-700 font-black block">{pass.amount} Paid</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setSelectedPass(pass)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1 shadow-sm transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Pass</span>
                </button>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(pass.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Directions</span>
                </a>
              </div>
            </div>
          ))
        )}

      </div>

      {/* Digital Pass / Tax Invoice Modal */}
      {selectedPass && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-4 text-center shadow-2xl border border-slate-200">
            {cancelMessage ? (
              <div className="py-6 space-y-2 animate-scale-in">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-black text-slate-900">{cancelMessage}</h3>
              </div>
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl inline-block mx-auto">
                  <QR value={selectedPass.qrValue} size={110} />
                </div>

                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border mb-1 ${selectedPass.statusColor}`}>
                    ● {selectedPass.status}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">{selectedPass.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedPass.address}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-left text-xs space-y-1 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pass Code</span>
                    <span className="text-slate-900 font-mono font-bold">{selectedPass.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Slot Reserved</span>
                    <span className="text-slate-900 font-bold">{selectedPass.slot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle</span>
                    <span className="text-slate-900">{selectedPass.vehicle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time & Date</span>
                    <span className="text-slate-900">{selectedPass.time} • {selectedPass.date}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-emerald-700">
                    <span>Amount Paid</span>
                    <span>{selectedPass.amount}</span>
                  </div>
                </div>

                {selectedPass.canCancel && (
                  <button
                    onClick={() => handleCancelPass(selectedPass)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold py-2.5 rounded-xl text-xs border border-rose-200 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancel Reservation</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedPass(null)}
                  className="w-full bg-slate-900 text-white font-extrabold py-3 rounded-2xl text-xs shadow-md"
                >
                  Close Pass
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom App Navigation Bar */}
      <div className="bg-white border-t border-slate-200 px-8 py-2.5 flex items-center justify-between text-xs font-extrabold text-slate-500 z-20">
        <button
          onClick={onNavigateToHome}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-900"
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          className="flex flex-col items-center gap-0.5 text-emerald-900 font-black scale-105"
        >
          <BookOpen className="w-5 h-5 text-emerald-700" />
          <span>Passes</span>
        </button>

        <button
          onClick={onNavigateToProfile}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-900"
        >
          <UserCheck className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </div>

    </div>
  );
};
