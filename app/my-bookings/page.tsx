'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { Language } from '@/types';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, MapPin, QrCode, Search, CheckCircle2, ChevronRight, Lock } from 'lucide-react';

import { getAllBookings } from '@/lib/booking/service';

export default function MyBookingsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const { isLoggedIn } = useAuth();
  const [lookupCode, setLookupCode] = useState('');

  const dynamicBookings = getAllBookings().map(b => ({
    id: b.id,
    passCode: b.passCode,
    location: b.parkingLocation,
    date: b.bookingDate,
    time: `${b.startTime} - ${b.endTime}`,
    vehicle: b.vehicleNumber || 'TN 59 AB 1234',
    amount: b.totalAmount,
    status: (b.status || 'CONFIRMED').toUpperCase(),
    paymentMethod: b.paymentMethod || 'Razorpay'
  }));

  const staticFallbacks = [
    {
      id: 'bk-1',
      passCode: 'IDM-82931',
      location: MOCK_PARKING_LOCATIONS[0],
      date: '12 Sep 2026',
      time: '10:00 AM - 12:00 PM',
      vehicle: 'TN 59 AB 1234',
      amount: 85,
      status: 'CONFIRMED',
      paymentMethod: 'Razorpay'
    },
    {
      id: 'bk-2',
      passCode: 'IDM-44120',
      location: MOCK_PARKING_LOCATIONS[1],
      date: '10 Sep 2026',
      time: '02:00 PM - 04:00 PM',
      vehicle: 'TN 59 AB 1234',
      amount: 65,
      status: 'COMPLETED',
      paymentMethod: 'Razorpay'
    }
  ];

  const activeBookings = [...dynamicBookings, ...staticFallbacks.filter(s => !dynamicBookings.some(d => d.passCode === s.passCode))];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
        <Navbar
          lang={lang}
          onLanguageToggle={setLang}
          activeView="web"
          onViewChange={() => {}}
          onOpenOwnerModal={() => {}}
        />
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900">Sign In Required</h1>
            <p className="text-sm text-gray-600">
              Please sign in to view your active parking passes and booking history.
            </p>
          </div>
          <div className="flex items-center space-x-3 w-full pt-2">
            <Link
              href="/login"
              className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 px-6 rounded-2xl text-xs shadow-md transition-all text-center"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-bold py-3.5 px-6 rounded-2xl text-xs border border-gray-200 shadow-2xs transition-all text-center"
            >
              Create Account
            </Link>
          </div>
        </main>
        <Footer lang={lang} />
      </div>
    );
  }

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupCode.trim()) {
      router.push(`/pass/${lookupCode.trim()}`);
    }
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

      <div className="max-w-4xl mx-auto px-4 py-10 w-full flex-1 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">My Parking Passes</h1>
            <p className="text-xs text-gray-500 mt-1">Manage active and past reservations</p>
          </div>

          {/* Pass Lookup Box */}
          <form onSubmit={handleLookup} className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Enter Pass ID e.g. IDM-82931"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold uppercase tracking-wider text-gray-900 outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-950 hover:bg-emerald-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
            >
              Lookup
            </button>
          </form>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {activeBookings.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/pass/${b.passCode}`)}
              className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <img
                  src={b.location.imageUrl}
                  alt={b.location.title}
                  className="w-16 h-16 rounded-2xl object-cover shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-gray-900 text-sm">{b.passCode}</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {b.status}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      {b.paymentMethod || 'Razorpay'}
                    </span>
                  </div>

                  <h4 className="font-bold text-gray-900 text-base">{b.location.title}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{b.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{b.time}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <div className="text-right">
                  <div className="text-xs text-gray-400">Total Paid</div>
                  <div className="text-base font-extrabold text-emerald-900">₹{b.amount}</div>
                </div>

                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-900 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      <Footer lang={lang} />

    </div>
  );
}
