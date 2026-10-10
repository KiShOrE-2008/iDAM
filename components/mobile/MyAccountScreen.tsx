'use client';

import React, { useState } from 'react';
import { ArrowLeft, User, Car, Wallet, Plus, Trash2, ShieldCheck, Sparkles, LogOut, HelpCircle, Building2, Home, BookOpen, UserCheck, Shield, Zap, Star, Check, History, X } from 'lucide-react';
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
  WalletTransaction,
  getUserVehicles,
  addVehicle,
  deleteVehicle,
  setDefaultVehicle,
  getWalletBalance,
  getWalletTransactions,
  topUpWallet
} from '@/lib/user/garageService';

interface MyAccountScreenProps {
  lang: Language;
  onBack: () => void;
  onNavigateToHome: () => void;
  onNavigateToPasses: () => void;
  onNavigateToSupport: () => void;
  onNavigateToAuth?: () => void;
}

export const MyAccountScreen: React.FC<MyAccountScreenProps> = ({
  onBack,
  onNavigateToHome,
  onNavigateToPasses,
  onNavigateToSupport,
  onNavigateToAuth
}) => {
  const { profile, signOut, switchRole, isDemoMode, exitDemo } = useAuth();
  const [localRole, setLocalRole] = useState<'driver' | 'owner'>(profile?.role || 'driver');
  const userRole = profile?.role || localRole;
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
    'owner-scanner-parked-view'
  );
  useRegisterModal(
    !!verificationResult,
    () => setVerificationResult(null),
    'owner-verify-modal'
  );

  // Vehicle Garage State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState<'Car' | 'Bike' | 'SUV' | 'EV'>('Car');
  const [newNickname, setNewNickname] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // Wallet State & Transactions
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [selectedTopUpPreset, setSelectedTopUpPreset] = useState<number>(500);

  React.useEffect(() => {
    setVehicles(getUserVehicles());
    setWalletBalance(getWalletBalance());
    setWalletTransactions(getWalletTransactions());
  }, []);

  // Register Back handlers so Android Back closes modals or exits scanner
  useRegisterModal(
    ownerSubView !== 'dashboard',
    () => setOwnerSubView('dashboard'),
    'owner-scanner-parked-view'
  );
  useRegisterModal(
    !!verificationResult,
    () => setVerificationResult(null),
    'owner-verify-modal'
  );
  useRegisterModal(
    showTopUpModal,
    () => setShowTopUpModal(false),
    'wallet-topup-modal'
  );
  useRegisterModal(
    showAddVehicle,
    () => setShowAddVehicle(false),
    'add-vehicle-modal'
  );

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

  const handleAddVehicle = () => {
    if (!newPlate.trim()) return;
    const updated = addVehicle({
      plate: newPlate,
      type: newType,
      nickname: newNickname || undefined,
      makeDefault: newIsDefault
    });
    setVehicles(updated);
    setNewPlate('');
    setNewNickname('');
    setNewIsDefault(false);
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

  const handleExecuteTopUp = (amount: number) => {
    const res = topUpWallet(amount);
    setWalletBalance(res.newBalance);
    setWalletTransactions(res.transactions);
    setShowTopUpModal(false);
  };

  // If in scanner sub-view, render the dedicated OwnerScannerScreen
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

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F8F5] relative overflow-y-auto no-scrollbar animate-fade-in text-slate-900 select-none">
      
      {/* Top Mobile Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button onClick={onBack} className="p-1 rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
          {userRole === 'owner' ? 'Owner Portal' : 'My Account & Garage'}
        </h3>
        <div className="w-5" />
      </div>

      <div className="p-4 sm:p-5 space-y-5 flex-1">
        
        {/* Role Toggle Switcher */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex text-xs font-black">
          <button
            onClick={() => handleRoleToggle('driver')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              userRole === 'driver' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-emerald-600" />
            <span>Driver Mode</span>
          </button>
          <button
            onClick={() => handleRoleToggle('owner')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              userRole === 'owner' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Owner Portal</span>
          </button>
        </div>

        {/* If Owner Role: Render Owner Monetization Portal */}
        {userRole === 'owner' ? (
          <OwnerDashboard
            onNavigateToScanner={() => setOwnerSubView('scanner')}
            onNavigateToParked={() => setOwnerSubView('parked')}
          />
        ) : (
          <>
            {/* Driver Profile Header */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-black text-lg shadow-inner">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : 'K'}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-black text-base text-slate-900">{profile?.name || 'Kishore Kumar'}</h4>
                    {isDemoMode && (
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full">
                        DEMO MODE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">{profile?.email || 'kishore@idam.park'}</p>
                  <p className="text-xs text-slate-400 font-medium">{profile?.phone || '+91 98765 43210'}</p>
                </div>
              </div>
            </div>

            {/* iDAM Wallet Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between z-10 relative">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black tracking-wider uppercase text-slate-300">iDAM Wallet</span>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-extrabold flex items-center space-x-1">
                  <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                  <span>Instant Pay Active</span>
                </span>
              </div>

              <div className="z-10 relative flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Available Balance</span>
                  <span className="text-2xl font-black text-white">₹{walletBalance}</span>
                </div>

                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1 shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Top Up Balance</span>
                </button>
              </div>

              {/* Recent Transaction Peek */}
              {walletTransactions.length > 0 && (
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <History className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400">Latest:</span>
                    <span className="font-semibold truncate max-w-[150px]">{walletTransactions[0].description}</span>
                  </div>
                  <span className="text-emerald-400 font-black">+{walletTransactions[0].amount ? `₹${walletTransactions[0].amount}` : ''}</span>
                </div>
              )}
            </div>

            {/* Wallet Top-Up Modal */}
            {showTopUpModal && (
              <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in">
                <div className="bg-white rounded-3xl w-full max-w-sm p-5 border border-slate-200 shadow-2xl space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">Top Up iDAM Wallet</h4>
                        <p className="text-[11px] text-slate-500 font-semibold">Current balance: ₹{walletBalance}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTopUpModal(false)}
                      className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-2">
                      Select Top-Up Amount
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 200, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSelectedTopUpPreset(preset)}
                          className={`py-2.5 rounded-2xl text-xs font-black transition-all ${
                            selectedTopUpPreset === preset
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Instant Add:</span>
                      <span className="font-black text-emerald-700">+₹{selectedTopUpPreset}</span>
                    </div>
                    <div className="flex items-center justify-between font-black text-sm pt-1 border-t border-emerald-200/60">
                      <span>New Wallet Balance:</span>
                      <span className="text-emerald-900">₹{walletBalance + selectedTopUpPreset}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExecuteTopUp(selectedTopUpPreset)}
                    className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Confirm & Pay ₹{selectedTopUpPreset} (Instant UPI)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Registered Vehicle Garage */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Car className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Registered Garage</h4>
                </div>
                <button
                  onClick={() => setShowAddVehicle(!showAddVehicle)}
                  className="text-xs font-black text-emerald-700 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Vehicle</span>
                </button>
              </div>

              {/* Add Vehicle Interactive Form */}
              {showAddVehicle && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3 animate-scale-in">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Registration Plate Number
                    </label>
                    <input
                      type="text"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                      placeholder="e.g. TN 59 AB 9999"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-extrabold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Vehicle Type
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['Car', 'Bike', 'SUV', 'EV'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewType(type)}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all ${
                            newType === type
                              ? 'bg-slate-950 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Nickname (Optional)
                    </label>
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="e.g. Family Creta or City Scooter"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Set as primary default vehicle for bookings</span>
                  </label>

                  <div className="flex justify-end space-x-2 pt-1 border-t border-slate-200">
                    <button
                      onClick={() => setShowAddVehicle(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 font-bold hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddVehicle}
                      disabled={!newPlate.trim()}
                      className="px-4 py-1.5 bg-slate-950 disabled:bg-slate-400 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                    >
                      Save to Garage
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle List */}
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                        {v.type === 'EV' ? (
                          <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                        ) : (
                          <Car className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-900 font-black tracking-wide block">{v.plate}</span>
                          {v.default && (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {v.type} {v.nickname ? `• ${v.nickname}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {!v.default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(v.id)}
                          title="Set as default vehicle"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(v.id)}
                        title="Remove vehicle"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Support Hub Shortcut */}
            <button
              onClick={onNavigateToSupport}
              className="w-full bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between text-xs font-black text-slate-900 transition-all"
            >
              <div className="flex items-center space-x-2.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>AI Support & Ticket Hub</span>
              </div>
              <span className="text-slate-400">→</span>
            </button>

            {/* Sign Out Action */}
            <div className="pt-2">
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
                    onNavigateToHome();
                  }
                }}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold py-3.5 rounded-2xl text-xs flex items-center justify-center space-x-2 border border-rose-200 transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>{isDemoMode ? 'Exit Demo Session' : 'Sign Out Account'}</span>
              </button>
            </div>
          </>
        )}

      </div>

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
          onClick={onNavigateToPasses}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-900"
        >
          <BookOpen className="w-5 h-5" />
          <span>Passes</span>
        </button>

        <button
          className="flex flex-col items-center gap-0.5 text-emerald-900 font-black scale-105"
        >
          <UserCheck className="w-5 h-5 text-emerald-700" />
          <span>Profile</span>
        </button>
      </div>

    </div>
  );
};
