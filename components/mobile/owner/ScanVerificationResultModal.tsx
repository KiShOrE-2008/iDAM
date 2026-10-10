'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldCheck, MapPin, Calendar, Clock, Car, RefreshCw, X, Check, Loader2 } from 'lucide-react';
import { PassVerificationResult, Booking } from '@/types';

interface ScanVerificationResultModalProps {
  result: PassVerificationResult;
  onClose: () => void;
  onScanAgain: () => void;
  onConfirmCheckIn: (booking: Booking) => Promise<{ success: boolean; message: string; checkInAt?: string }>;
  onViewCurrentlyParked?: () => void;
}

export const ScanVerificationResultModal: React.FC<ScanVerificationResultModalProps> = ({
  result,
  onClose,
  onScanAgain,
  onConfirmCheckIn,
  onViewCurrentlyParked
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkInTimestamp, setCheckInTimestamp] = useState<string | null>(null);

  const booking = result.booking;
  const isValid = result.isValid && !!booking;

  const handleConfirm = async () => {
    if (!booking || isConfirming) return;
    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const res = await onConfirmCheckIn(booking);
      if (res.success) {
        setConfirmedSuccess(true);
        setCheckInTimestamp(res.checkInAt || new Date().toISOString());
      } else {
        setErrorMessage(res.message || 'Check-in failed. Please try again.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'An unexpected error occurred during check-in.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Format time display
  const formatTimeStr = (isoOrTime?: string) => {
    if (!isoOrTime) return '';
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans select-none">
      <div className="bg-[#F8F8F5] rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Pass Verification Result
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* SUCCESSFUL CHECK-IN CONFIRMED VIEW */}
          {confirmedSuccess ? (
            <div className="text-center py-6 space-y-4 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8 stroke-[3] text-emerald-700" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Vehicle checked in</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Timestamp: {formatTimeStr(checkInTimestamp || undefined)}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Booking Ref</span>
                  <span className="font-mono font-black text-slate-900">{booking?.passCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Vehicle Registration</span>
                  <span className="font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {booking?.vehicleNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">Slot Status</span>
                  <span className="text-emerald-800 font-black bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                    ● ACTIVE PARKED
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {onViewCurrentlyParked && (
                  <button
                    onClick={onViewCurrentlyParked}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center justify-center space-x-1.5"
                  >
                    <span>View Currently Parked</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                )}
                <button
                  onClick={onScanAgain}
                  className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition-all"
                >
                  Scan Next Pass
                </button>
              </div>
            </div>

          ) : isValid ? (

            /* VALID PASS: PROMPT OWNER TO CONFIRM CHECK-IN */
            <div className="space-y-4 animate-fade-in">
              
              {/* Status Header Banner */}
              <div className="bg-emerald-50 border border-emerald-300/80 p-3.5 rounded-2xl flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wide block">
                    Valid parking pass
                  </span>
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    Ready for owner check-in confirmation
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs text-rose-800 font-bold">
                  {errorMessage}
                </div>
              )}

              {/* Pass Verification Details Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 text-xs">
                
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">Pass Reference</span>
                  <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {booking.passCode}
                  </span>
                </div>

                <div className="flex items-start space-x-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-slate-900 block">{booking.parkingLocation?.title}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{booking.parkingLocation?.address}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Vehicle Number</span>
                    <span className="font-mono font-black text-slate-900 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
                      {booking.vehicleNumber || 'TN 59 AB 1234'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Vehicle Type</span>
                    <span className="font-black text-slate-800 capitalize mt-0.5 inline-block">
                      {booking.vehicleType}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Reserved Date</span>
                    <span className="font-black text-slate-900 mt-0.5 inline-block">
                      {booking.bookingDate || 'Today'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Time Slot</span>
                    <span className="font-black text-slate-900 mt-0.5 inline-block">
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Status</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <span>✓ {booking.paymentMethod || 'Razorpay'} Verified</span>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Booking Status</span>
                  <span className="text-[10px] bg-slate-100 text-slate-900 font-extrabold px-2 py-0.5 rounded-md uppercase">
                    {booking.status}
                  </span>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-75"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Confirming Check-in...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm check-in</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={onScanAgain}
                  disabled={isConfirming}
                  className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all"
                >
                  Cancel / Scan Again
                </button>
              </div>

            </div>

          ) : (

            /* INVALID PASS SCREEN */
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center mx-auto shadow-inner">
                {result.statusCode === 'wrong_location' ? (
                  <AlertTriangle className="w-7 h-7 text-amber-600" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-600" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  {result.statusCode === 'wrong_location' ? 'Different Parking Location' : 'Invalid Parking Pass'}
                </h3>
                <p className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 p-3 rounded-xl max-w-xs mx-auto">
                  {result.message}
                </p>
              </div>

              {/* Informational context without leaking sensitive data */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-left text-xs space-y-2 text-slate-600">
                {result.statusCode === 'already_active' && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    This vehicle was already checked in. You can check it out from the <strong>Currently Parked</strong> screen when the driver leaves.
                  </p>
                )}
                {result.statusCode === 'wrong_location' && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    This pass was booked for a different parking garage or lot. The driver must park at their designated location.
                  </p>
                )}
                {result.statusCode === 'already_completed' && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    This reservation has already been completed and checked out. It cannot be reused.
                  </p>
                )}
                {result.statusCode === 'cancelled' && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    This reservation was cancelled by the driver and is no longer valid for parking.
                  </p>
                )}
                {result.statusCode === 'not_found' && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    QR code payload was not recognized in the iDAM database. Please ask the driver to show their active pass from the iDAM app.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={onScanAgain}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scan Again</span>
                </button>
              </div>

            </div>

          )}

        </div>

      </div>
    </div>
  );
};
