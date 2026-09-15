'use client';

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, Shield, Smartphone, CreditCard, Wallet, Sparkles, Check, Loader2 } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';

interface PaymentScreenProps {
  location: ParkingLocation;
  bookingDetails: {
    date: string;
    time: string;
    duration: number;
    total: number;
    vehicleNumber?: string;
    addons?: string[];
  };
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
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'wallet'>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'cred'>('gpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(false);

  // Card input states
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('•••');

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccessModal(true);
      setTimeout(() => {
        onPaySuccess();
      }, 1000);
    }, 1200);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-slate-50 relative overflow-y-auto no-scrollbar animate-fade-in">
      
      {/* Top Header Bar */}
      <div className="pt-3 px-4 pb-3 flex items-center space-x-3 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">Secure Payment Checkout</h3>
          <p className="text-[10px] text-slate-500">256-Bit Encrypted Transaction</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* Total Price Header Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider">Amount to Pay</div>
            <div className="text-2xl font-black text-white">₹{bookingDetails.total}</div>
            <div className="text-[11px] text-slate-300 mt-0.5 truncate max-w-[180px]">
              {location.title} • {bookingDetails.duration} hrs
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Payment Options
          </label>

          {/* Option 1: Instant UPI Apps */}
          <div
            onClick={() => setSelectedMethod('upi')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
              selectedMethod === 'upi'
                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Instant UPI Apps</h4>
                  <p className="text-[10px] text-emerald-700 font-bold">Fastest • Zero Convenience Fee</p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMethod === 'upi' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {selectedMethod === 'upi' && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </div>
            </div>

            {/* Sub UPI App Selector */}
            {selectedMethod === 'upi' && (
              <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 animate-scale-in">
                {[
                  { id: 'gpay', label: 'GPay', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { id: 'phonepe', label: 'PhonePe', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                  { id: 'paytm', label: 'Paytm', color: 'bg-sky-50 text-sky-700 border-sky-200' },
                  { id: 'cred', label: 'CRED', color: 'bg-slate-900 text-white border-slate-800' }
                ].map((app) => (
                  <button
                    key={app.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUpiApp(app.id as any);
                    }}
                    className={`py-2 px-1 rounded-xl text-center border text-xs font-black transition-all ${app.color} ${
                      selectedUpiApp === app.id ? 'ring-2 ring-emerald-500 scale-102' : 'opacity-80'
                    }`}
                  >
                    {app.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Option 2: Credit / Debit Card */}
          <div
            onClick={() => setSelectedMethod('card')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
              selectedMethod === 'card'
                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-800">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">Credit or Debit Card</h4>
                  <p className="text-[10px] text-slate-500">Visa, Mastercard, RuPay, Amex</p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMethod === 'card' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {selectedMethod === 'card' && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </div>
            </div>

            {selectedMethod === 'card' && (
              <div className="space-y-2 pt-1 border-t border-slate-100 text-xs animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Card Number"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                  />
                  <input
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="CVV"
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Option 3: iDAM Wallet */}
          <div
            onClick={() => setSelectedMethod('wallet')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              selectedMethod === 'wallet'
                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">iDAM Wallet</h4>
                <p className="text-[10px] text-emerald-700 font-bold">Balance: ₹500 Available</p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              selectedMethod === 'wallet' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
            }`}>
              {selectedMethod === 'wallet' && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 flex items-center space-x-2 text-[11px] text-emerald-950 font-semibold">
          <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Refund Guarantee: 100% instant refund on cancellation before slot time.</span>
        </div>

      </div>

      {/* Sticky Bottom Pay Button */}
      <div className="p-3.5 bg-white border-t border-slate-200 sticky bottom-0 z-20 shadow-lg space-y-2">
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold py-3.5 rounded-2xl shadow-xl text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-75"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Verifying with Bank...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Pay ₹{bookingDetails.total} via {selectedMethod.toUpperCase()}</span>
            </>
          )}
        </button>
      </div>

      {/* Payment Processing Success Modal Simulation */}
      {paymentSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 text-center space-y-3 shadow-2xl max-w-xs w-full animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <h3 className="font-black text-lg text-slate-900">Payment Approved!</h3>
            <p className="text-xs text-slate-500">Generating your digital parking pass...</p>
          </div>
        </div>
      )}

    </div>
  );
};
