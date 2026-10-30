'use client';

import React, { useState } from 'react';
import { X, Car, Bike, CreditCard, ShieldCheck, MapPin, Lock } from 'lucide-react';
import { ParkingLocation, Language, BookingRequest } from '@/types';
import { createBooking } from '@/lib/booking/service';
import { useRouter } from 'next/navigation';
import { RazorpayCheckoutModal } from '@/components/payment/RazorpayCheckoutModal';
import { RazorpaySuccessResult } from '@/lib/payment/razorpay';
import { bookAndPay, checkoutErrorMessage } from '@/lib/payment/checkout';
import { useBackNavigation } from '@/context/BackNavigationContext';
import { useAuth } from '@/context/AuthContext';
import { loginUrlReturningTo } from '@/lib/auth/redirect';

interface WebBookingModalProps {
  location: ParkingLocation | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const WebBookingModal: React.FC<WebBookingModalProps> = ({
  location,
  isOpen,
  onClose,
  lang
}) => {
  const router = useRouter();
  const { isDemoMode, supabaseUser, profile } = useAuth();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('car');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(2);
  const [vehicleNo, setVehicleNo] = useState(profile?.vehicleNumber || '');
  const [driverName, setDriverName] = useState(profile?.name || '');
  const [driverPhone, setDriverPhone] = useState(profile?.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);

  const { registerBackHandler } = useBackNavigation();

  // The profile can load after this component mounts: fill any empty fields when opened
  React.useEffect(() => {
    if (!isOpen || !profile) return;
    setVehicleNo(v => v || profile.vehicleNumber || '');
    setDriverName(n => n || profile.name || '');
    setDriverPhone(p => p || profile.phone || '');
  }, [isOpen, profile]);

  React.useEffect(() => {
    if (!isOpen) return;

    return registerBackHandler(() => {
      if (step === 'payment') {
        setStep('details');
        return true;
      }
      onClose();
      return true;
    });
  }, [isOpen, step, onClose, registerBackHandler]);

  if (!isOpen || !location) return null;

  const rate = vehicleType === 'car' ? location.hourlyRateCar : location.hourlyRateBike;
  const basePrice = rate * duration;
  const platformFee = 5;
  const totalAmount = basePrice + platformFee;

  const buildRequest = (paymentId?: string): BookingRequest => ({
    parkingLocationId: location.id,
    vehicleType,
    bookingDate,
    startTime,
    durationHours: duration,
    basePrice,
    platformFee,
    totalAmount,
    paymentMethod: 'Razorpay',
    paymentId,
    vehicleNumber: vehicleNo,
    driverName: driverName || 'iDAM Driver',
    driverPhone
  });

  // Demo mode only: the simulated checkout succeeded, save a local demo pass
  const handleDemoPaymentSuccess = async (result: RazorpaySuccessResult) => {
    setShowRazorpayModal(false);
    setIsProcessing(true);
    try {
      const booking = await createBooking(location, buildRequest(result.razorpay_payment_id), { isDemoMode: true });
      onClose();
      router.push(`/pass/${booking.passCode}`);
    } catch (err) {
      setPaymentError(checkoutErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setPaymentError(null);

    if (isDemoMode) {
      setShowRazorpayModal(true);
      return;
    }
    if (!supabaseUser) {
      onClose();
      router.push(loginUrlReturningTo(window.location.pathname));
      return;
    }

    setIsProcessing(true);
    try {
      const { booking } = await bookAndPay(location, buildRequest(), {
        name: driverName,
        email: profile?.email,
        phone: driverPhone
      });
      onClose();
      router.push(`/pass/${booking.passCode}`);
    } catch (err) {
      setPaymentError(checkoutErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const label = 'block text-sm text-slate-600 mb-1.5';
  const field = 'w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-[15px] text-ink focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50';
  const timeLabel = (t: string) => {
    const [h] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/60 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <div className="bg-limewash w-full sm:max-w-xl rounded-t-xl sm:rounded-xl shadow-2xl relative max-h-[94vh] overflow-y-auto animate-slide-up">
          <div className="sticky top-0 z-10 bg-limewash border-b border-slate-300 px-5 sm:px-6 pt-5 pb-4 flex items-start gap-4">
            <img src={location.imageUrl} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-500">{step === 'details' ? 'Step 1 of 2: your visit' : 'Step 2 of 2: payment'}</p>
              <h2 id="booking-title" className="font-black text-xl leading-tight truncate">{location.title}</h2>
              <p className="text-sm text-slate-600 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {location.landmark || location.address}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 -mr-1 rounded-md text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === 'details' ? (
            <div className="px-5 sm:px-6 py-5 space-y-5">
              <fieldset>
                <legend className={label}>Vehicle</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['car', 'Car', location.hourlyRateCar, Car],
                    ['bike', 'Bike', location.hourlyRateBike, Bike],
                  ] as const).map(([id, name, r, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setVehicleType(id)}
                      aria-pressed={vehicleType === id}
                      className={`px-3.5 py-3 rounded-md border flex items-center gap-3 text-left cursor-pointer ${
                        vehicleType === id ? 'bg-ink text-white border-ink' : 'bg-white border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" aria-hidden />
                      <span className="flex-1 font-bold">{name}</span>
                      <span className={`text-sm tabular ${vehicleType === id ? 'text-white/75' : 'text-slate-500'}`}>₹{r}/hr</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bk-date" className={label}>Date</label>
                  <input
                    id="bk-date"
                    type="date"
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className={`${field} tabular`}
                  />
                </div>
                <div>
                  <label htmlFor="bk-time" className={label}>Arriving at</label>
                  <select id="bk-time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${field} tabular`}>
                    {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((t) => (
                      <option key={t} value={t}>{timeLabel(t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset>
                <legend className={label}>How long</legend>
                <div className="grid grid-cols-5 border border-slate-300 rounded-md overflow-hidden bg-white">
                  {[1, 2, 3, 4, 6].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDuration(h)}
                      aria-pressed={duration === h}
                      className={`py-2.5 text-[15px] font-bold tabular border-r border-slate-300 last:border-r-0 cursor-pointer ${
                        duration === h ? 'bg-ink text-white' : 'hover:bg-slate-50'
                      }`}
                    >
                      {h} h
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="bk-plate" className={label}>Number plate</label>
                <input
                  id="bk-plate"
                  type="text"
                  required
                  placeholder="TN 59 AB 1234"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  className="plate w-full text-center text-2xl py-2.5 uppercase placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-amber-300/60"
                />
                <p className="text-sm text-slate-500 mt-1.5">The owner checks this plate at the gate.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bk-name" className={label}>Your name</label>
                  <input id="bk-name" type="text" autoComplete="name" value={driverName} onChange={(e) => setDriverName(e.target.value)} className={field} />
                </div>
                <div>
                  <label htmlFor="bk-phone" className={label}>Phone</label>
                  <input id="bk-phone" type="tel" autoComplete="tel" placeholder="98765 43210" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className={`${field} tabular`} />
                </div>
              </div>

              <dl className="text-[15px] border-t-2 border-ink">
                <div className="flex justify-between py-2.5 border-b border-slate-300">
                  <dt className="text-slate-600 tabular">Parking, {duration} h × ₹{rate}</dt>
                  <dd className="font-bold tabular">₹{basePrice}</dd>
                </div>
                <div className="flex justify-between py-2.5 border-b border-slate-300">
                  <dt className="text-slate-600">Platform fee</dt>
                  <dd className="font-bold tabular">₹{platformFee}</dd>
                </div>
                <div className="flex justify-between pt-3 text-lg">
                  <dt className="font-black">Total</dt>
                  <dd className="font-black tabular">₹{totalAmount}</dd>
                </div>
              </dl>

              <button
                onClick={() => setStep('payment')}
                disabled={!vehicleNo.trim()}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-black py-3.5 rounded-lg text-base disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
              >
                {vehicleNo.trim() ? 'Continue to payment' : 'Add your number plate to continue'}
              </button>
            </div>
          ) : (
            <form onSubmit={handlePaymentSubmit} className="px-5 sm:px-6 py-5 space-y-5">
              <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-4">
                <div className="min-w-0">
                  <span className="plate inline-block text-base px-2.5 py-0.5">{vehicleNo}</span>
                  <p className="text-sm text-slate-600 mt-2 tabular">
                    {bookingDate}, {timeLabel(startTime)}, for {duration} {duration === 1 ? 'hour' : 'hours'}
                  </p>
                </div>
                <p className="text-[2.4rem] font-black leading-none tabular">₹{totalAmount}</p>
              </div>

              <div className="bg-white border border-slate-300 rounded-md px-4 py-3.5 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
                <div>
                  <p className="font-bold">Pay with Razorpay</p>
                  <p className="text-sm text-slate-600">UPI, Google Pay, PhonePe, cards or net banking</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                {isDemoMode
                  ? 'Demo mode: the payment is simulated and no money is charged.'
                  : 'Your space is held while you pay. Cancel up to 30 minutes before you arrive for a full refund.'}
              </p>

              {paymentError && (
                <div role="alert" className="text-sm text-rose-800 bg-rose-50 border-l-4 border-rose-600 p-3 rounded">
                  {paymentError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-5 border border-slate-300 bg-white py-3.5 rounded-lg font-bold hover:border-slate-400 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-3.5 rounded-lg text-base font-black flex items-center justify-center gap-2 disabled:opacity-75 bg-brand-700 hover:bg-brand-800 text-white cursor-pointer"
                >
                  <Lock className="w-4 h-4" aria-hidden />
                  {isProcessing ? 'Confirming payment…' : !isDemoMode && !supabaseUser ? 'Sign in to book' : `Pay ₹${totalAmount}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Razorpay Interactive Modal */}
      {/* Simulated checkout, demo mode only */}
      <RazorpayCheckoutModal
        isOpen={isDemoMode && showRazorpayModal}
        amount={totalAmount}
        locationTitle={location.title}
        bookingPassCode="IDM-TEMP"
        vehicleNumber={vehicleNo}
        vehicleType={vehicleType}
        driverName={driverName}
        driverPhone={driverPhone}
        onSuccess={handleDemoPaymentSuccess}
        onClose={() => setShowRazorpayModal(false)}
      />
    </>
  );
};
