'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Car, Shield, FileText, ChevronRight, Download, Clock, CheckCircle, ArrowLeft, Star, TrendingUp, Home, BookOpen, UserCheck, Wallet, Plus, PlusCircle, Trash2, Zap, Settings, ShieldCheck, Building2, Sparkles, LogOut } from 'lucide-react';
import { Language, PassVerificationResult, Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRegisterModal } from '@/context/BackNavigationContext';
import { OwnerDashboard } from './owner/OwnerDashboard';
import { OwnerScannerScreen } from './owner/OwnerScannerScreen';
import { CurrentlyParkedScreen } from './owner/CurrentlyParkedScreen';
import { ScanVerificationResultModal } from './owner/ScanVerificationResultModal';
import { validateScannedPass, confirmBookingCheckIn } from '@/lib/parking/checkInService';
import {
  Vehicle,
  getUserVehicles,
  addVehicle,
  deleteVehicle,
  setDefaultVehicle,
  getWalletBalance,
  topUpWallet
} from '@/lib/user/garageService';

interface ProfileDashboardScreenProps {
  lang: Language;
  onBack: () => void;
  onNavigateToSupport?: () => void;
  onNavigateToAuth?: () => void;
}

export const ProfileDashboardScreen: React.FC<ProfileDashboardScreenProps> = ({
  onBack,
  onNavigateToSupport,
  onNavigateToAuth
}) => {
  const { profile, signOut, switchRole, isDemoMode, exitDemo } = useAuth();
  const [localRole, setLocalRole] = useState<'driver' | 'owner'>(profile?.role || 'driver');
  const userRole = profile?.role || localRole;
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(500);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Owner Workflow Sub-Views: 'dashboard' | 'scanner' | 'parked'
  const [ownerSubView, setOwnerSubView] = useState<'dashboard' | 'scanner' | 'parked'>('dashboard');
  const [verificationResult, setVerificationResult] = useState<PassVerificationResult | null>(null);
  const [isVerifyingScan, setIsVerifyingScan] = useState<boolean>(false);

  // Register Back handlers so Android Back closes modal or exits scanner
  useRegisterModal(
    ownerSubView !== 'dashboard',
    () => setOwnerSubView('dashboard'),
    'profile-scanner-parked-view'
  );
  useRegisterModal(
    !!verificationResult,
    () => setVerificationResult(null),
    'profile-verify-modal'
  );

  // Vehicle Garage State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [newPlate, setNewPlate] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  useEffect(() => {
    setVehicles(getUserVehicles());
    setWalletBalance(getWalletBalance());
    if (profile?.role) {
      setLocalRole(profile.role);
    }
  }, [profile?.role]);

  const handleRoleToggle = (newRole: 'driver' | 'owner') => {
    setLocalRole(newRole);
    switchRole(newRole);
    setOwnerSubView('dashboard');
  };

  const handleScanResult = async (rawPayload: string) => {
    if (isVerifyingScan) return;
    setIsVerifyingScan(true);
    try {
      const res = await validateScannedPass({
        rawScannedText: rawPayload,
        ownerSpaceId: 'loc-1',
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

  // If in scanner sub-view, render OwnerScannerScreen
  if (userRole === 'owner' && ownerSubView === 'scanner') {
    return (
      <div className="h-full flex flex-col relative">
        <OwnerScannerScreen
          onBack={() => {
            setOwnerSubView('dashboard');
            setVerificationResult(null);
          }}
          onScanResult={handleScanResult}
          isProcessing={isVerifyingScan}
        />
        {verificationResult && (
          <ScanVerificationResultModal
            result={verificationResult}
            onClose={() => setVerificationResult(null)}
            onScanAgain={() => {
              setVerificationResult(null);
              setOwnerSubView('scanner');
            }}
            onConfirmCheckIn={handleConfirmCheckIn}
            onViewCurrentlyParked={() => {
              setVerificationResult(null);
              setOwnerSubView('parked');
            }}
          />
        )}
      </div>
    );
  }

  // If in parked sub-view, render CurrentlyParkedScreen
  if (userRole === 'owner' && ownerSubView === 'parked') {
    return (
      <div className="h-full flex flex-col relative">
        <CurrentlyParkedScreen
          onBack={() => setOwnerSubView('dashboard')}
          onNavigateToScanner={() => setOwnerSubView('scanner')}
          isDemoMode={isDemoMode}
        />
      </div>
    );
  }

  const handleAddVehicle = () => {
    if (!newPlate.trim()) return;
    const updated = addVehicle({
      plate: newPlate,
      type: 'Car'
    });
    setVehicles(updated);
    setNewPlate('');
    setShowAddVehicle(false);
  };

  const handleDeleteVehicle = (id: string) => {
    const updated = deleteVehicle(id);
    setVehicles(updated);
  };

  const handleSetDefault = (id: string) => {
    const updated = setDefaultVehicle(id);
    setVehicles(updated);
  };

  const mockPasses = [
    {
      id: 'IDM-82931',
      title: 'West Tower Square Parking',
      vehicle: 'TN 59 AB 1234 (Car)',
      slot: 'A-02',
      time: '10:00 AM - 12:00 PM',
      date: '15 Sep 2026',
      amount: '₹75',
      base: '₹70',
      gst: '₹0',
      fee: '₹5',
      status: 'CONFIRMED',
      statusColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold'
    },
    {
      id: 'IDM-44120',
      title: 'South Masi Street Multi-level',
      vehicle: 'TN 59 C 5678 (Bike)',
      slot: 'B-04',
      time: '02:00 PM - 04:00 PM',
      date: '10 Sep 2026',
      amount: '₹65',
      base: '₹50',
      gst: '₹9',
      fee: '₹6',
      status: 'COMPLETED',
      statusColor: 'bg-slate-100 text-slate-700 border-slate-300'
    }
  ];

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F8F5] relative overflow-y-auto no-scrollbar animate-fade-in text-slate-900 select-none">
      
      {/* Top Mobile Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button onClick={onBack} className="p-1 rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
          {userRole === 'owner' ? 'Owner Portal' : 'My Account & Passes'}
        </h3>
        <div className="w-5" />
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* User Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-lg shadow-md">
                {profile ? profile.name.charAt(0) : 'K'}
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">{profile ? profile.name : 'Kishore Kumar'}</h4>
                <p className="text-[11px] text-slate-500 font-medium">{profile ? profile.email : 'kishore@email.com'}</p>
                {isDemoMode && (
                  <span className="inline-block mt-0.5 text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-full uppercase">
                    DEMO MODE
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={async () => {
                if (isDemoMode) {
                  exitDemo();
                } else {
                  await signOut();
                }
                if (onNavigateToAuth) {
                  onNavigateToAuth();
                } else {
                  onBack();
                }
              }}
              title="Sign Out"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Role Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-black">
            <button
              onClick={() => handleRoleToggle('driver')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                userRole === 'driver' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              🚗 Driver
            </button>
            <button
              onClick={() => handleRoleToggle('owner')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                userRole === 'owner' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              🅿️ Owner
            </button>
          </div>
        </div>

        {/* DRIVER VIEW */}
        {userRole === 'driver' && (
          <div className="space-y-4 animate-scale-in">
            
            {/* List Your Space Entry Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-4 rounded-3xl shadow-md space-y-2 border border-emerald-500/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Earn from unused parking</span>
                  <h4 className="font-black text-sm text-white">List your parking space</h4>
                </div>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Turn empty driveways, garages or commercial space into recurring revenue.</p>
              <Link
                href="/list-your-space"
                className="inline-flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
              >
                <span>List Space Now →</span>
              </Link>
            </div>

            {/* iDAM Wallet Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                  <Wallet className="w-4 h-4 text-emerald-700" />
                  <span>iDAM Wallet</span>
                </div>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-black text-[11px] px-2.5 py-1 rounded-lg border border-emerald-200 transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Top Up</span>
                </button>
              </div>
              <div className="text-xl font-black text-slate-900">
                ₹{walletBalance}
              </div>
            </div>

            {/* Vehicles Garage */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900">
                  <Car className="w-4 h-4 text-emerald-700" />
                  <span>Registered Vehicles</span>
                </div>
                <button
                  onClick={() => setShowAddVehicle(!showAddVehicle)}
                  className="text-emerald-800 font-black text-xs flex items-center space-x-1 hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {showAddVehicle && (
                <div className="flex space-x-2 pt-1">
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    placeholder="Plate e.g. TN 59 AB 9999"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-mono font-bold uppercase"
                  />
                  <button
                    onClick={handleAddVehicle}
                    className="bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-xl"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="space-y-1.5 text-xs">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px]">IND</span>
                      <div>
                        <span className="font-mono font-black text-slate-900 block">{v.plate}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{v.type} {v.nickname ? `• ${v.nickname}` : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {v.default ? (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(v.id)}
                          title="Set as default"
                          className="p-1 rounded text-slate-400 hover:text-emerald-700"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(v.id)}
                        title="Remove vehicle"
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Passes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Passes & History</h4>
                <span className="text-xs font-bold text-emerald-800">{mockPasses.length} Passes</span>
              </div>

              {mockPasses.map((pass) => (
                <div
                  key={pass.id}
                  onClick={() => setSelectedPass(pass)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-600 transition-all cursor-pointer space-y-2 transform active:scale-98"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-900 font-mono">{pass.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${pass.statusColor}`}>
                      {pass.status}
                    </span>
                  </div>
                  <h5 className="font-black text-xs text-slate-900 truncate">{pass.title}</h5>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>{pass.date} • Slot {pass.slot}</span>
                    <span className="font-black text-slate-900 text-xs">{pass.amount}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* OWNER VIEW */}
        {userRole === 'owner' && (
          <OwnerDashboard
            onNavigateToExplore={onBack}
            onNavigateToScanner={() => setOwnerSubView('scanner')}
            onNavigateToParked={() => setOwnerSubView('parked')}
          />
        )}

        {/* Support Quick Access */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Help & Legal</p>
          <button
            onClick={onNavigateToSupport}
            className="w-full flex items-center justify-between p-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Help Center & Policies</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full space-y-3 shadow-2xl border border-slate-200 text-left animate-scale-in">
            <h4 className="font-black text-sm text-slate-900">Add Money to iDAM Wallet</h4>
            <div className="grid grid-cols-3 gap-2 text-xs font-black">
              {[200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    const res = topUpWallet(amt);
                    setWalletBalance(res.newBalance);
                    setShowTopUpModal(false);
                  }}
                  className="p-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 rounded-xl text-slate-900 text-center transition-colors"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTopUpModal(false)}
              className="w-full py-2 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white w-full max-w-[320px] rounded-2xl p-4 shadow-xl border border-slate-200 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-[10px] text-slate-400 font-black">TAX INVOICE</p>
                <h4 className="font-black text-xs text-slate-900">{selectedPass.id}</h4>
              </div>
              <button
                onClick={() => setSelectedPass(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Parking Spot Fee</span>
                <span className="font-bold text-slate-900">{selectedPass.base}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span className="font-bold text-slate-900">{selectedPass.fee}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-black text-slate-900 text-xs">
                <span>Total Amount Paid</span>
                <span className="text-emerald-800">{selectedPass.amount}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPass(null)}
              className="w-full bg-slate-900 text-white font-black py-2.5 rounded-xl text-xs hover:bg-slate-800 transition-colors"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}

      {/* Bottom App Navigation Bar */}
      <div className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-500 z-20">
        <button
          onClick={onBack}
          className="flex flex-col items-center hover:text-slate-900 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => {}}
          className="flex flex-col items-center text-emerald-900 font-black scale-105 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          <span>Passes</span>
        </button>

        <button
          onClick={onBack}
          className="flex flex-col items-center hover:text-slate-900 transition-colors"
        >
          <UserCheck className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </div>

    </div>
  );
};
