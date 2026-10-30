'use client';

import React, { useState } from 'react';
import { ArrowLeft, Car, Wallet, Plus, Trash2, ShieldCheck, LogOut, HelpCircle, Building2, Star, X, ChevronRight } from 'lucide-react';
import { AppTabBar } from './AppTabBar';
import { Language, PassVerificationResult, Booking, CheckInCredentials } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRegisterModal } from '@/context/BackNavigationContext';
import { OwnerDashboard } from './owner/OwnerDashboard';
import { OwnerScannerScreen } from './owner/OwnerScannerScreen';
import { CurrentlyParkedScreen } from './owner/CurrentlyParkedScreen';
import { ScanVerificationResultModal } from './owner/ScanVerificationResultModal';
import { validateScannedPass, confirmBookingCheckIn } from '@/lib/parking/checkInService';
import { fetchMySpaces, primarySpace, canScanAt, DEMO_OWNER_SPACE_ID, type OwnerSpace } from '@/lib/owner/service';
import Link from 'next/link';
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
  const { profile, supabaseUser, signOut, switchRole, isDemoMode, exitDemo } = useAuth();
  const [localRole, setLocalRole] = useState<'driver' | 'owner'>(profile?.role || 'driver');
  // Demo mode follows the demo profile's role; real users switch views freely and are
  // owners of whatever listings they have (listings themselves are approved by iDAM).
  const userRole = isDemoMode ? (profile?.role || localRole) : localRole;
  const [mySpaces, setMySpaces] = useState<OwnerSpace[]>([]);
  const [spacesError, setSpacesError] = useState<string | null>(null);
  const activeSpace = isDemoMode ? null : primarySpace(mySpaces);
  const ownerSpaceId = isDemoMode ? DEMO_OWNER_SPACE_ID : activeSpace?.id;
  const scannerAvailable = isDemoMode || canScanAt(activeSpace);

  React.useEffect(() => {
    if (isDemoMode || !supabaseUser) {
      setMySpaces([]);
      return;
    }
    let isMounted = true;
    fetchMySpaces()
      .then((spaces) => { if (isMounted) { setMySpaces(spaces); setSpacesError(null); } })
      .catch((err) => { if (isMounted) setSpacesError(err?.message || 'Could not load your parking spaces.'); });
    return () => {
      isMounted = false;
    };
  }, [isDemoMode, supabaseUser?.id]);
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
    if (isDemoMode) switchRole(newRole);
    setOwnerSubView('dashboard');
  };

  const handleScanResult = async (rawPayload: string) => {
    if (isVerifyingScan || !ownerSpaceId) return;
    setIsVerifyingScan(true);
    try {
      const res = await validateScannedPass({
        rawScannedText: rawPayload,
        ownerSpaceId,
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

  // Credentials come from what was presented at the gate (scanned QR, or code + plate),
  // never from the booking row, so a copied pass code alone cannot check a car in
  const handleConfirmCheckIn = async (b: Booking, credentials: CheckInCredentials) => {
    return await confirmBookingCheckIn({
      bookingId: b.id,
      passCode: credentials.passCode,
      passTokenHash: credentials.tokenHash,
      plateLast4: credentials.plateLast4,
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
  if (userRole === 'owner' && ownerSubView === 'scanner' && scannerAvailable) {
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
  if (userRole === 'owner' && ownerSubView === 'parked' && ownerSpaceId) {
    return (
      <div className="h-full flex flex-col relative">
        <CurrentlyParkedScreen
          spaceId={ownerSpaceId}
          onBack={() => setOwnerSubView('dashboard')}
          onNavigateToScanner={scannerAvailable ? () => setOwnerSubView('scanner') : undefined}
          isDemoMode={isDemoMode}
        />
      </div>
    );
  }

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
          <h1 className="text-[1.6rem] font-black">{userRole === 'owner' ? 'Your space' : 'Account'}</h1>
        </div>
        <div className="flex mt-3" role="tablist" aria-label="View">
          {(['driver', 'owner'] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={userRole === r}
              onClick={() => handleRoleToggle(r)}
              className={`flex-1 pb-2.5 text-[15px] font-bold border-b-[3px] -mb-px flex items-center justify-center gap-1.5 cursor-pointer ${
                userRole === r ? 'border-brand-700 text-ink' : 'border-transparent text-slate-500'
              }`}
            >
              {r === 'driver' ? <Car className="w-4 h-4" aria-hidden /> : <Building2 className="w-4 h-4" aria-hidden />}
              {r === 'driver' ? 'I drive' : 'I own a space'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
        {/* If Owner Role: Render Owner Monetization Portal */}
        {userRole === 'owner' && !ownerSpaceId ? (
          <div className="bg-white rounded-lg p-4 border border-slate-300 space-y-3 text-center">
            <Building2 className="w-8 h-8 text-amber-600 mx-auto" />
            <h4 className="font-black text-sm text-slate-900">
              {spacesError ? 'Could not load your spaces' : 'You have no parking space listed yet'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {spacesError || (supabaseUser
                ? 'List your driveway or private lot. Once iDAM approves it, you can scan passes and earn here.'
                : 'Sign in to list a parking space and manage it here.')}
            </p>
            {supabaseUser ? (
              <Link
                href="/list-your-space"
                className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl"
              >
                + List your space
              </Link>
            ) : (
              onNavigateToAuth && (
                <button
                  onClick={onNavigateToAuth}
                  className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl"
                >
                  Sign in
                </button>
              )
            )}
          </div>
        ) : userRole === 'owner' && ownerSpaceId ? (
          <>
            {activeSpace && !scannerAvailable && (
              <div role="status" className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-900 font-semibold">
                {activeSpace.status === 'pending_review'
                  ? `"${activeSpace.title}" is waiting for iDAM approval. Pass scanning unlocks once it is live.`
                  : `"${activeSpace.title}" is not open for bookings right now (${activeSpace.status}). Reopen it to scan passes.`}
              </div>
            )}
            <OwnerDashboard
              spaceId={ownerSpaceId}
              space={activeSpace}
              onNavigateToScanner={scannerAvailable ? () => setOwnerSubView('scanner') : undefined}
              onNavigateToParked={() => setOwnerSubView('parked')}
            />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3.5">
              <span className="w-14 h-14 rounded-md bg-brand-700 text-white flex items-center justify-center font-black text-2xl shrink-0">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'K'}
              </span>
              <div className="min-w-0">
                <p className="font-black text-xl leading-tight flex items-center gap-2">
                  <span className="truncate">{profile?.name || 'Kishore Kumar'}</span>
                  {isDemoMode && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 shrink-0">Demo</span>
                  )}
                </p>
                <p className="text-sm text-slate-600 truncate">{profile?.email || 'kishore@idam.park'}</p>
                <p className="text-sm text-slate-500 tabular">{profile?.phone || '+91 98765 43210'}</p>
              </div>
            </div>

            <section className="bg-white border border-slate-300 rounded-lg">
              <div className="p-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm text-slate-600 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" aria-hidden />
                    iDAM wallet
                  </h2>
                  <p className="text-[2rem] font-black leading-none mt-1.5 tabular">₹{walletBalance}</p>
                </div>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="bg-brand-700 active:bg-brand-800 text-white font-bold px-4 py-2.5 rounded-md text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  Add money
                </button>
              </div>
              {walletTransactions.length > 0 && (
                <p className="border-t border-slate-200 px-4 py-2.5 text-sm text-slate-600 flex items-center justify-between gap-3">
                  <span className="truncate">Last: {walletTransactions[0].description}</span>
                  <span className="font-bold text-go-700 tabular shrink-0">{walletTransactions[0].amount ? `+₹${walletTransactions[0].amount}` : ''}</span>
                </p>
              )}
            </section>

            {/* Wallet Top-Up Modal */}
            {showTopUpModal && (
              <div className="fixed inset-0 z-50 bg-ink/70 flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in">
                <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-brand-100 text-brand-800">
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
                    <label className="text-[11px] font-black uppercase text-slate-500 block mb-2">
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
                              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-2 ring-brand-400'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-brand-50 border border-brand-200 rounded-2xl p-3 text-xs text-brand-950 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Instant Add:</span>
                      <span className="font-black text-brand-700">+₹{selectedTopUpPreset}</span>
                    </div>
                    <div className="flex items-center justify-between font-black text-sm pt-1 border-t border-brand-200/60">
                      <span>New Wallet Balance:</span>
                      <span className="text-brand-900">₹{walletBalance + selectedTopUpPreset}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExecuteTopUp(selectedTopUpPreset)}
                    className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-brand-400" />
                    <span>Confirm & Pay ₹{selectedTopUpPreset} (Instant UPI)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Registered Vehicle Garage */}
            <div className="bg-white rounded-lg p-4 border border-slate-300 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-base">Your vehicles</h2>
                <button
                  onClick={() => setShowAddVehicle(!showAddVehicle)}
                  aria-expanded={showAddVehicle}
                  className="text-sm font-bold text-brand-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  Add vehicle
                </button>
              </div>

              {/* Add Vehicle Interactive Form */}
              {showAddVehicle && (
                <div className="bg-limewash p-3.5 rounded-md border border-slate-300 space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">Number plate</label>
                    <input
                      type="text"
                      value={newPlate}
                      onChange={(e) => setNewPlate(e.target.value)}
                      placeholder="e.g. TN 59 AB 9999"
                      className="plate w-full px-3 py-2 text-lg text-center uppercase focus:outline-none focus:ring-4 focus:ring-amber-300/60"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">Type</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['Car', 'Bike', 'SUV', 'EV'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewType(type)}
                          aria-pressed={newType === type}
                          className={`py-2 rounded-md text-sm font-bold border cursor-pointer ${
                            newType === type ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-slate-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">Nickname (optional)</label>
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="e.g. Family Creta or City Scooter"
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-[15px] focus:outline-none focus:border-ink"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="w-5 h-5 accent-[#1846A3]"
                    />
                    <span>Use this vehicle by default</span>
                  </label>

                  <div className="flex justify-end space-x-2 pt-1 border-t border-slate-200">
                    <button
                      onClick={() => setShowAddVehicle(false)}
                      className="px-3 py-2 text-sm text-slate-600 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddVehicle}
                      disabled={!newPlate.trim()}
                      className="px-4 py-2 bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 text-white rounded-md text-sm font-bold cursor-pointer"
                    >
                      Save vehicle
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle List */}
              <div className="divide-y divide-slate-200 border-t border-slate-200">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <span className="plate inline-block text-base px-2.5 py-0.5">{v.plate}</span>
                      <span className="block text-sm text-slate-600 mt-1.5">
                        {v.type}
                        {v.nickname ? `, ${v.nickname}` : ''}
                        {v.default && <span className="ml-2 text-xs font-bold text-brand-700">Default</span>}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {!v.default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(v.id)}
                          title="Set as default vehicle"
                          aria-label={`Make ${v.plate} the default`}
                          className="p-2 rounded-md text-slate-500 hover:text-brand-700 hover:bg-brand-50 cursor-pointer"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(v.id)}
                        title="Remove vehicle"
                        aria-label={`Remove ${v.plate}`}
                        className="p-2 rounded-md text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <nav className="bg-white border border-slate-300 rounded-lg divide-y divide-slate-200" aria-label="More">
              <button onClick={onNavigateToSupport} className="w-full flex items-center justify-between px-4 py-3.5 text-[15px] font-bold cursor-pointer active:bg-slate-50">
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="w-5 h-5 text-slate-500" aria-hidden />
                  Help and support
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400" aria-hidden />
              </button>
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
                className="w-full flex items-center gap-2.5 px-4 py-3.5 text-[15px] font-bold text-rose-700 cursor-pointer active:bg-rose-50"
              >
                <LogOut className="w-5 h-5" aria-hidden />
                {isDemoMode ? 'Leave demo' : 'Sign out'}
              </button>
            </nav>
          </>
        )}

      </div>

      <AppTabBar active="profile" onHome={onNavigateToHome} onPasses={onNavigateToPasses} />

    </div>
  );
};
