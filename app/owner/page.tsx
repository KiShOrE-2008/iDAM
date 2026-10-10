'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { OwnerModal } from '@/components/OwnerModal';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import { Language } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Building2, PlusCircle, DollarSign, Users, Car, CheckCircle2, AlertCircle, Clock, ShieldCheck, QrCode, Lock, X } from 'lucide-react';
import { PassVerificationResult, Booking } from '@/types';
import { OwnerScannerScreen } from '@/components/mobile/owner/OwnerScannerScreen';
import { ScanVerificationResultModal } from '@/components/mobile/owner/ScanVerificationResultModal';
import { validateScannedPass, confirmBookingCheckIn } from '@/lib/parking/checkInService';

export default function OwnerPortalPage() {
  const [lang, setLang] = useState<Language>('en');
  const { isLoggedIn, isDemoMode } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSpace, setActiveSpace] = useState(MOCK_PARKING_LOCATIONS[0]);
  const [isSpaceOpen, setIsSpaceOpen] = useState(true);

  // Scanner & Verification State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<PassVerificationResult | null>(null);
  const [isVerifyingScan, setIsVerifyingScan] = useState(false);

  const handleScanResult = async (rawPayload: string) => {
    if (isVerifyingScan) return;
    setIsVerifyingScan(true);
    try {
      const res = await validateScannedPass({
        rawScannedText: rawPayload,
        ownerSpaceId: activeSpace.id,
        isDemoMode
      });
      setVerificationResult(res);
    } catch (e: any) {
      setVerificationResult({
        isValid: false,
        statusCode: 'not_found',
        message: e.message || 'Verification failed.'
      });
    } finally {
      setIsVerifyingScan(false);
    }
  };

  const handleConfirmCheckIn = async (b: Booking) => {
    return await confirmBookingCheckIn({
      bookingId: b.id,
      passCode: b.passCode,
      passTokenHash: b.passTokenHash,
      isDemoMode
    });
  };

  const mockBookings = [
    { id: 'bk-101', code: 'IDM-82931', vehicle: 'TN 59 AB 1234', type: 'Car', time: '10:00 AM - 12:00 PM', amount: 85, status: 'Active' },
    { id: 'bk-102', code: 'IDM-94102', vehicle: 'TN 59 C 5678', type: 'Bike', time: '11:30 AM - 01:30 PM', amount: 35, status: 'Active' },
    { id: 'bk-103', code: 'IDM-12049', vehicle: 'TN 58 X 9999', type: 'Car', time: '02:00 PM - 04:00 PM', amount: 85, status: 'Upcoming' },
    { id: 'bk-104', code: 'IDM-55321', vehicle: 'TN 59 K 1122', type: 'Car', time: '08:00 AM - 09:30 AM', amount: 65, status: 'Completed' },
  ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
        <Navbar
          lang={lang}
          onLanguageToggle={setLang}
          activeView="web"
          onViewChange={() => {}}
          onOpenOwnerModal={() => setIsModalOpen(true)}
        />
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900">Sign In Required</h1>
            <p className="text-sm text-gray-600">
              Please sign in to access the Space Owner Portal and manage your parking inventory.
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => setIsModalOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Portal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Owner Management Portal</span>
            </div>
            <h1 className="text-3xl font-extrabold">{activeSpace.title}</h1>
            <p className="text-xs text-emerald-200 mt-1">{activeSpace.address}</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSpaceOpen(!isSpaceOpen)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isSpaceOpen ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
              }`}
            >
              {isSpaceOpen ? '🟢 Space Open for Bookings' : '🔴 Space Paused'}
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-white text-emerald-950 font-bold px-4 py-2.5 rounded-2xl text-xs shadow-md hover:bg-emerald-50 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Add New Space</span>
            </button>
          </div>
        </div>

        {/* Analytics Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Today&apos;s Earnings</span>
              <DollarSign className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-extrabold text-gray-900">₹1,240</div>
            <div className="text-[11px] text-emerald-700 font-semibold">+18% vs yesterday</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Current Occupancy</span>
              <Car className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-gray-900">23 / 35</div>
            <div className="text-[11px] text-gray-500 font-semibold">12 spots available right now</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Total Bookings Today</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold text-gray-900">28</div>
            <div className="text-[11px] text-gray-500 font-semibold">Average duration: 2.2 hrs</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>Owner Rating</span>
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-gray-900">4.8 ⭐</div>
            <div className="text-[11px] text-gray-500 font-semibold">Based on 64 reviews</div>
          </div>
        </div>

        {/* Live Bookings Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg">Incoming Reservations</h3>
              <p className="text-xs text-gray-500">Real-time digital pass verification for gate security</p>
            </div>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan Driver Pass</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Pass Code</th>
                  <th className="pb-3">Vehicle Plate</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Time Window</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {mockBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80">
                    <td className="py-3 font-mono font-bold text-gray-900">{b.code}</td>
                    <td className="py-3 font-mono font-bold text-emerald-950">{b.vehicle}</td>
                    <td className="py-3 text-gray-600">{b.type}</td>
                    <td className="py-3 text-gray-700">{b.time}</td>
                    <td className="py-3 font-bold text-gray-900">₹{b.amount}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        b.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-900'
                          : b.status === 'Upcoming'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <Footer lang={lang} />

      <OwnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lang={lang}
      />

      {/* Scanner Dialog for Web / Tablet */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl max-w-sm w-full h-[650px] overflow-hidden shadow-2xl border border-slate-800 relative flex flex-col">
            <OwnerScannerScreen
              onBack={() => setIsScannerOpen(false)}
              onScanResult={handleScanResult}
              isProcessing={isVerifyingScan}
            />
          </div>
        </div>
      )}

      {/* Verification Result Modal */}
      {verificationResult && (
        <ScanVerificationResultModal
          result={verificationResult}
          onClose={() => setVerificationResult(null)}
          onScanAgain={() => {
            setVerificationResult(null);
            setIsScannerOpen(true);
          }}
          onConfirmCheckIn={handleConfirmCheckIn}
        />
      )}
    </div>
  );
}
