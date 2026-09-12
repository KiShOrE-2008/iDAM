'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, Shield } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';

interface PaymentScreenProps {
  location: ParkingLocation;
  bookingDetails: { date: string; time: string; duration: number; total: number };
  onBack: () => void;
  onPaySuccess: () => void;
  lang: Language;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  location,
  bookingDetails,
  onBack,
  onPaySuccess,
  lang
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaySuccess();
    }, 1200);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-white relative overflow-y-auto no-scrollbar">
      
      {/* Top Header Bar */}
      <div className="pt-3 px-4 pb-3 flex items-center space-x-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-extrabold text-gray-900 text-sm">Payment</h3>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6 flex-1">
        
        {/* Booking Location Preview Card */}
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center space-x-3">
          <img
            src={location.imageUrl}
            alt={location.title}
            className="w-12 h-12 rounded-xl object-cover"
          />
          <div>
            <h4 className="font-bold text-gray-900 text-xs">{location.title}</h4>
            <p className="text-[11px] text-gray-500">
              {bookingDetails.date} • {bookingDetails.time} AM - 12:00 PM
            </p>
          </div>
        </div>

        {/* Total Amount Header */}
        <div>
          <div className="text-xs text-gray-500 font-semibold">Total amount</div>
          <div className="text-2xl font-extrabold text-gray-900">₹{bookingDetails.total}</div>
        </div>

        {/* Payment Method Selector List */}
        <div className="space-y-2.5">
          <button
            onClick={() => setSelectedMethod('upi')}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
              selectedMethod === 'upi'
                ? 'bg-emerald-50/60 border-emerald-700 shadow-2xs'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMethod === 'upi' ? 'border-emerald-700 bg-emerald-700' : 'border-gray-300'
              }`}>
                {selectedMethod === 'upi' && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
              </div>
              <span className="text-xs font-bold text-gray-900">UPI (Recommended)</span>
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod('card')}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
              selectedMethod === 'card'
                ? 'bg-emerald-50/60 border-emerald-700 shadow-2xs'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMethod === 'card' ? 'border-emerald-700 bg-emerald-700' : 'border-gray-300'
              }`}>
                {selectedMethod === 'card' && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
              </div>
              <span className="text-xs font-bold text-gray-900">Card</span>
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod('netbanking')}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
              selectedMethod === 'netbanking'
                ? 'bg-emerald-50/60 border-emerald-700 shadow-2xs'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMethod === 'netbanking' ? 'border-emerald-700 bg-emerald-700' : 'border-gray-300'
              }`}>
                {selectedMethod === 'netbanking' && <CheckCircle2 className="w-3 h-3 text-white fill-current" />}
              </div>
              <span className="text-xs font-bold text-gray-900">Net Banking</span>
            </div>
          </button>
        </div>

      </div>

      {/* Bottom Sticky Action CTA & Security Badge */}
      <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 space-y-2">
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl shadow-lg text-xs tracking-wide transition-all flex items-center justify-center space-x-2 disabled:opacity-75"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-300" />
          <span>{isProcessing ? 'Processing...' : `Pay ₹${bookingDetails.total}`}</span>
        </button>

        <div className="flex items-center justify-center space-x-1 text-[10px] font-semibold text-gray-500">
          <Shield className="w-3 h-3 text-emerald-700" />
          <span>Secured & Encrypted</span>
        </div>
      </div>

    </div>
  );
};
