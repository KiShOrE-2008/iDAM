'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Car, Clock, LogOut, CheckCircle2, AlertCircle, RefreshCw, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Booking } from '@/types';
import { getCurrentlyParkedBookings, confirmBookingCheckOut } from '@/lib/parking/checkInService';
import { useRegisterModal } from '@/context/BackNavigationContext';

interface CurrentlyParkedScreenProps {
  onBack: () => void;
  onNavigateToScanner?: () => void;
  isDemoMode?: boolean;
}

export const CurrentlyParkedScreen: React.FC<CurrentlyParkedScreenProps> = ({
  onBack,
  onNavigateToScanner,
  isDemoMode = false
}) => {
  const [parkedVehicles, setParkedVehicles] = useState<Booking[]>([]);
  const [selectedBookingForCheckout, setSelectedBookingForCheckout] = useState<Booking | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [checkoutNotification, setCheckoutNotification] = useState<{ message: string; isError?: boolean } | null>(null);

  // Android Back dismisses checkout modal if open
  useRegisterModal(
    !!selectedBookingForCheckout,
    () => setSelectedBookingForCheckout(null),
    'checkout-confirm-modal'
  );

  const loadData = () => {
    const list = getCurrentlyParkedBookings('loc-1');
    setParkedVehicles(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmCheckout = async () => {
    if (!selectedBookingForCheckout || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckoutNotification(null);

    try {
      const res = await confirmBookingCheckOut({
        bookingId: selectedBookingForCheckout.id,
        isDemoMode
      });

      if (res.success) {
        setCheckoutNotification({ message: 'Vehicle checked out' });
        loadData();
        setSelectedBookingForCheckout(null);
      } else {
        setCheckoutNotification({ message: res.message || 'Check-out failed.', isError: true });
      }
    } catch (e: any) {
      setCheckoutNotification({ message: e.message || 'Error occurred.', isError: true });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatTime = (isoOrTime?: string) => {
    if (!isoOrTime) return '10:00 AM';
    if (isoOrTime.includes('T')) {
      try {
        return new Date(isoOrTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return isoOrTime;
      }
    }
    return isoOrTime;
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F8F5] relative overflow-y-auto no-scrollbar animate-fade-in text-slate-900 select-none font-sans">
      
      {/* Top Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button
          onClick={onBack}
          className="p-1 rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
            Currently Parked Vehicles
          </h3>
          <span className="text-[10px] text-slate-500 font-bold">Meenakshi Temple Smart Lot</span>
        </div>
        <div className="w-5" />
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 space-y-4 flex-1">
        
        {/* Notification Toast */}
        {checkoutNotification && (
          <div className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-scale-in ${
            checkoutNotification.isError 
              ? 'bg-rose-50 border border-rose-200 text-rose-800' 
              : 'bg-emerald-50 border border-emerald-300 text-emerald-900'
          }`}>
            {checkoutNotification.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{checkoutNotification.message}</span>
          </div>
        )}

        {/* Live Counter Badge */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Live Occupancy</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{parkedVehicles.length}</span>
              <span className="text-xs text-slate-500 font-bold">vehicles inside</span>
            </div>
          </div>

          {onNavigateToScanner && (
            <button
              onClick={onNavigateToScanner}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1 transition-all active:scale-95"
            >
              <span>+ Scan In Pass</span>
            </button>
          )}
        </div>

        {/* List of Currently Parked Vehicles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">Active Parked Passes</span>
            <button
              onClick={loadData}
              className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 text-[11px] font-bold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {parkedVehicles.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center space-y-3 border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Car className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900">No Vehicles Currently Parked</h4>
                <p className="text-xs text-slate-500">Scan incoming parking passes to check in arriving vehicles.</p>
              </div>
            </div>
          ) : (
            parkedVehicles.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-400/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-mono font-black text-sm text-slate-900 block">
                        {b.vehicleNumber || 'TN 59 AB 1234'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        Ref: {b.passCode} • {b.driverName || 'Driver'}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>ACTIVE</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-2xl border border-slate-100 font-semibold">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold block uppercase">Check-in Time</span>
                    <span className="font-black text-slate-800">{formatTime(b.checkInAt || b.startTime)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold block uppercase">Reserved End</span>
                    <span className="font-black text-slate-800">{b.endTime}</span>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => setSelectedBookingForCheckout(b)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center space-x-1.5 active:scale-98"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Check Out</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* CHECK-OUT CONFIRMATION MODAL */}
      {selectedBookingForCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900">Confirm check-out</h4>
              <p className="text-xs text-slate-500">
                Are you sure you want to check out vehicle{' '}
                <strong className="text-slate-900">{selectedBookingForCheckout.vehicleNumber}</strong>?
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-left text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Ref:</span>
                <span className="font-mono font-bold text-slate-900">{selectedBookingForCheckout.passCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-in:</span>
                <span className="font-bold text-slate-900">{formatTime(selectedBookingForCheckout.checkInAt || selectedBookingForCheckout.startTime)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedBookingForCheckout(null)}
                disabled={isCheckingOut}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={isCheckingOut}
                className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1"
              >
                {isCheckingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <span>Check Out</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
