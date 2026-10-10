'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Car,
  Bike,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Lock,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { ParkingLocation, Language, BookingRequest } from '@/types';
import { createBooking } from '@/lib/booking/service';
import { useRouter } from 'next/navigation';
import { RazorpayCheckoutModal } from '@/components/payment/RazorpayCheckoutModal';
import { RazorpaySuccessResult } from '@/lib/payment/razorpay';
import { useBackNavigation } from '@/context/BackNavigationContext';

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
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('car');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(2);
  const [vehicleNo, setVehicleNo] = useState('TN 59 AB 1234');
  const [driverName, setDriverName] = useState('Kishore Kumar');
  const [driverPhone, setDriverPhone] = useState('9876543210');
  const [paymentMethod, setPaymentMethod] = useState<'Razorpay' | 'UPI' | 'Card' | 'Net Banking'>('Razorpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);

  const { registerBackHandler } = useBackNavigation();

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

  const handleRazorpaySuccess = async (result: RazorpaySuccessResult) => {
    setShowRazorpayModal(false);
    setIsProcessing(true);

    const bookingReq: BookingRequest = {
      parkingLocationId: location.id,
      vehicleType,
      bookingDate,
      startTime,
      durationHours: duration,
      basePrice,
      platformFee,
      totalAmount,
      paymentMethod: 'Razorpay',
      paymentId: result.razorpay_payment_id,
      razorpayOrderId: result.razorpay_order_id,
      vehicleNumber: vehicleNo,
      driverName: driverName || 'iDAM Driver',
      driverPhone: driverPhone || '9876543210'
    };

    const booking = await createBooking(location, bookingReq);

    setTimeout(() => {
      setIsProcessing(false);
      onClose();
      router.push(`/pass/${booking.passCode}`);
    }, 800);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'Razorpay') {
      setShowRazorpayModal(true);
      return;
    }

    setIsProcessing(true);

    const bookingReq: BookingRequest = {
      parkingLocationId: location.id,
      vehicleType,
      bookingDate,
      startTime,
      durationHours: duration,
      basePrice,
      platformFee,
      totalAmount,
      paymentMethod,
      paymentId: `pay_direct_${Date.now().toString(36)}`,
      vehicleNumber: vehicleNo,
      driverName: driverName || 'iDAM Driver',
      driverPhone: driverPhone || '9876543210'
    };

    const booking = await createBooking(location, bookingReq);

    setTimeout(() => {
      setIsProcessing(false);
      onClose();
      router.push(`/pass/${booking.passCode}`);
    }, 1200);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 overflow-hidden max-h-[92vh] overflow-y-auto">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center space-x-3 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
              <img src={location.imageUrl} alt={location.title} className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{location.title}</h3>
              <p className="text-xs text-gray-500 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>{location.landmark || location.address}</span>
              </p>
            </div>
          </div>

          {step === 'details' ? (
            <div className="space-y-5 pt-4">
              
              {/* Vehicle Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Vehicle</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVehicleType('car')}
                    className={`p-3 rounded-2xl border flex items-center space-x-3 transition-all ${
                      vehicleType === 'car'
                        ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/20 text-emerald-950 font-bold'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <Car className="w-5 h-5 text-emerald-700" />
                    <div className="text-left">
                      <div className="text-xs">Car</div>
                      <div className="text-[11px] text-gray-500 font-normal">₹{location.hourlyRateCar}/hr</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType('bike')}
                    className={`p-3 rounded-2xl border flex items-center space-x-3 transition-all ${
                      vehicleType === 'bike'
                        ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-700/20 text-emerald-950 font-bold'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <Bike className="w-5 h-5 text-emerald-700" />
                    <div className="text-left">
                      <div className="text-xs">Bike</div>
                      <div className="text-[11px] text-gray-500 font-normal">₹{location.hourlyRateBike}/hr</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Date & Start Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Booking Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Arrival Time</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-700 outline-none"
                  >
                    {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => {
                      const [h] = t.split(':').map(Number);
                      const period = h >= 12 ? 'PM' : 'AM';
                      const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
                      return (
                        <option key={t} value={t}>{display}:00 {period}</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Vehicle Number & Driver Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Plate Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN 59 AB 1234"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-800 focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Duration (Hours)</label>
                  <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-xl">
                    {[1, 2, 3, 4, 6].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDuration(h)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                          duration === h ? 'bg-emerald-950 text-white shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Driver Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="Driver Name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Parking fee (₹{rate} × {duration} hrs)</span>
                  <span className="font-semibold text-gray-900">₹{basePrice}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform reservation fee</span>
                  <span className="font-semibold text-gray-900">₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total Payment</span>
                  <span className="text-emerald-800 text-base">₹{totalAmount}</span>
                </div>
              </div>

              <button
                onClick={() => setStep('payment')}
                className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-4">
              
              <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-4 rounded-2xl border border-emerald-900/50 flex items-center justify-between shadow-md">
                <div>
                  <div className="text-xs font-bold text-white">Reserved for {vehicleNo}</div>
                  <div className="text-[11px] text-emerald-300">{bookingDate} • {startTime} ({duration} hrs)</div>
                </div>
                <div className="text-xl font-black text-white">₹{totalAmount}</div>
              </div>

              {/* Razorpay Banner / Primary Option */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Choose Payment Method</label>

                {/* FEATURED: Razorpay All-in-One Gateway */}
                <div
                  onClick={() => setPaymentMethod('Razorpay')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    paymentMethod === 'Razorpay'
                      ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                        <span className="italic tracking-tighter">R</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-extrabold text-gray-900">Razorpay</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          Instant UPI, Google Pay, PhonePe, Cards, NetBanking
                        </p>
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      paymentMethod === 'Razorpay' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'Razorpay' && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
                    </div>
                  </div>
                </div>

                {/* Direct UPI */}
                <div
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'UPI'
                      ? 'bg-emerald-50 border-emerald-700 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold">Direct UPI App Transfer</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'UPI' ? 'border-emerald-700 bg-emerald-700' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'UPI' && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
                  </div>
                </div>

                {/* Card */}
                <div
                  onClick={() => setPaymentMethod('Card')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'Card'
                      ? 'bg-emerald-50 border-emerald-700 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CreditCard className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold">Credit or Debit Card</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'Card' ? 'border-emerald-700 bg-emerald-700' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'Card' && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>256-bit encrypted checkout. Instant digital QR pass generated upon verification.</span>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-1/3 border border-gray-300 py-3.5 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`w-2/3 py-3.5 rounded-2xl text-xs font-black shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-75 ${
                    paymentMethod === 'Razorpay'
                      ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/20'
                      : 'bg-emerald-950 hover:bg-emerald-900 text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isProcessing
                      ? 'Processing...'
                      : paymentMethod === 'Razorpay'
                      ? `Pay ₹${totalAmount} via Razorpay`
                      : `Pay ₹${totalAmount} & Generate Pass`}
                  </span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>

      {/* Razorpay Interactive Modal */}
      <RazorpayCheckoutModal
        isOpen={showRazorpayModal}
        amount={totalAmount}
        locationTitle={location.title}
        bookingPassCode="IDM-TEMP"
        vehicleNumber={vehicleNo}
        vehicleType={vehicleType}
        driverName={driverName}
        driverPhone={driverPhone}
        onSuccess={handleRazorpaySuccess}
        onClose={() => setShowRazorpayModal(false)}
      />
    </>
  );
};
