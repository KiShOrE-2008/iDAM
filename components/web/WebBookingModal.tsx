'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, Car, Bike, CreditCard, ShieldCheck, CheckCircle2, MapPin, ArrowRight } from 'lucide-react';
import { ParkingLocation, Language, BookingRequest } from '@/types';
import { createBooking } from '@/lib/booking/service';
import { useRouter } from 'next/navigation';

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
  const [bookingDate, setBookingDate] = useState('2024-09-12');
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(2);
  const [vehicleNo, setVehicleNo] = useState('TN 59 AB 1234');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Net Banking'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !location) return null;

  const rate = vehicleType === 'car' ? location.hourlyRateCar : location.hourlyRateBike;
  const basePrice = rate * duration;
  const platformFee = 5;
  const totalAmount = basePrice + platformFee;

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      paymentMethod
    };

    const booking = await createBooking(location, bookingReq);

    setTimeout(() => {
      setIsProcessing(false);
      onClose();
      router.push(`/pass/${booking.passCode}`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 overflow-hidden">
        
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
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                    <option key={t} value={t}>{t} AM/PM</option>
                  ))}
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
          <form onSubmit={handlePaymentSubmit} className="space-y-5 pt-4">
            
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-900">Reserved for {vehicleNo}</div>
                <div className="text-[11px] text-emerald-900">{bookingDate} • {startTime} ({duration} hrs)</div>
              </div>
              <div className="text-lg font-extrabold text-emerald-950">₹{totalAmount}</div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Select Payment Method</label>
              {(['UPI', 'Card', 'Net Banking'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    paymentMethod === m
                      ? 'bg-emerald-50 border-emerald-700 text-emerald-950 font-bold'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <span className="text-xs font-bold">{m} {m === 'UPI' && '(Instant Confirmation)'}</span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentMethod === m ? 'border-emerald-700 bg-emerald-700' : 'border-gray-300'
                  }`}>
                    {paymentMethod === m && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>256-bit encrypted checkout. Instant digital QR pass generated.</span>
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
                className="w-2/3 bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-75"
              >
                <span>{isProcessing ? 'Processing Payment...' : `Pay ₹${totalAmount} & Generate Pass`}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
