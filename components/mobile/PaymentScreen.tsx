'use client';

import React, { useState } from 'react';
import { ArrowLeft, Lock, Shield, Check, Loader2 } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { RazorpayCheckoutModal } from '@/components/payment/RazorpayCheckoutModal';
import { RazorpaySuccessResult } from '@/lib/payment/razorpay';
import { checkoutErrorMessage } from '@/lib/payment/checkout';

interface PaymentScreenProps {
  location: ParkingLocation;
  bookingDetails: {
    date: string;
    time: string;
    duration: number;
    total: number;
    vehicleNumber?: string;
    addons?: string[];
    paymentId?: string;
    paymentMethod?: string;
  };
  onBack: () => void;
  /** Demo mode only: the simulated payment finished. */
  onPaySuccess: (meta?: { paymentId?: string; paymentMethod?: string }) => void;
  /** Real payment: book the slot, take payment and confirm it. Throws on failure. */
  onLivePay: () => Promise<void>;
  /** Called instead of paying when a signed-out user taps Pay outside demo mode */
  onRequireSignIn?: () => void;
  lang: Language;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  location,
  bookingDetails,
  onBack,
  onPaySuccess,
  onLivePay,
  onRequireSignIn,
  lang
}) => {
  const { profile, isDemoMode, supabaseUser } = useAuth();
  const mustSignIn = !isDemoMode && !supabaseUser;
  const [selectedMethod, setSelectedMethod] = useState<'razorpay' | 'upi' | 'card' | 'wallet'>('razorpay');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'cred'>('gpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [recordedPaymentId, setRecordedPaymentId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Card input states
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('•••');

  const handleRazorpaySuccess = (res: RazorpaySuccessResult) => {
    setShowRazorpayModal(false);
    setRecordedPaymentId(res.razorpay_payment_id);
    setPaymentSuccessModal(true);
    setTimeout(() => {
      onPaySuccess({
        paymentId: res.razorpay_payment_id,
        paymentMethod: 'Razorpay'
      });
    }, 1200);
  };

  const handlePayment = async () => {
    if (isProcessing) return;
    setPaymentError(null);

    // Real bookings need an account: send signed-out users (e.g. "Skip for now") to sign in
    if (!isDemoMode && !supabaseUser) {
      if (onRequireSignIn) onRequireSignIn();
      else setPaymentError('Please sign in to book a parking spot.');
      return;
    }

    // Real money: the parent books the slot, runs Razorpay checkout and server verification
    if (!isDemoMode) {
      setIsProcessing(true);
      try {
        await onLivePay();
      } catch (err) {
        setPaymentError(checkoutErrorMessage(err));
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (selectedMethod === 'razorpay') {
      setShowRazorpayModal(true);
      return;
    }

    setIsProcessing(true);
    const mockId = `pay_${Date.now().toString(36)}`;
    setRecordedPaymentId(mockId);

    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccessModal(true);
      setTimeout(() => {
        onPaySuccess({
          paymentId: mockId,
          paymentMethod: selectedMethod.toUpperCase()
        });
      }, 1000);
    }, 1200);
  };

  const methods: { id: typeof selectedMethod; title: string; note: string; demoOnly: boolean }[] = [
    { id: 'razorpay', title: 'Razorpay', note: 'UPI, cards and net banking', demoOnly: false },
    { id: 'upi', title: 'UPI app', note: 'Sample payment, demo only', demoOnly: true },
    { id: 'card', title: 'Debit or credit card', note: 'Visa, Mastercard, RuPay, Amex', demoOnly: true },
    { id: 'wallet', title: 'iDAM wallet', note: '₹500 available', demoOnly: true },
  ];
  const fieldClass = 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-[15px] font-semibold tabular focus:outline-none focus:border-ink';

  return (
    <>
      <div className="h-full flex flex-col bg-limewash text-ink relative animate-fade-in">
        <header className="px-3 py-3 flex items-center gap-3 border-b border-slate-300">
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-10 h-10 rounded-md border border-slate-300 bg-white flex items-center justify-center active:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-black text-lg">Pay for your space</h1>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5">
          <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-4">
            <div className="min-w-0">
              <p className="text-sm text-slate-600 truncate">{location.title}</p>
              <p className="text-sm text-slate-600 tabular">
                {bookingDetails.date}, {bookingDetails.time}, for {bookingDetails.duration} {bookingDetails.duration === 1 ? 'hour' : 'hours'}
              </p>
            </div>
            <p className="text-[2.4rem] font-black leading-none tabular shrink-0">₹{bookingDetails.total}</p>
          </div>

          <h2 className="text-base font-black mt-6">Pay with</h2>
          <div className="mt-2.5 bg-white border border-slate-300 rounded-md divide-y divide-slate-200" role="radiogroup" aria-label="Payment method">
            {methods
              .filter((m) => !m.demoOnly || isDemoMode)
              .map((m) => {
                const isSelected = selectedMethod === m.id;
                return (
                  <div key={m.id} className={isSelected ? 'bg-brand-50/50' : ''}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedMethod(m.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left cursor-pointer"
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-brand-700' : 'border-slate-400'}`}>
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-700" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-[15px]">{m.title}</span>
                        <span className="block text-sm text-slate-500">{m.note}</span>
                      </span>
                    </button>

                    {isSelected && m.id === 'upi' && (
                      <div className="grid grid-cols-4 gap-2 px-3.5 pb-3.5 animate-fade-in">
                        {[
                          { id: 'gpay', label: 'GPay' },
                          { id: 'phonepe', label: 'PhonePe' },
                          { id: 'paytm', label: 'Paytm' },
                          { id: 'cred', label: 'CRED' },
                        ].map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedUpiApp(app.id as any)}
                            aria-pressed={selectedUpiApp === app.id}
                            className={`py-2 rounded-md border text-sm font-bold cursor-pointer ${
                              selectedUpiApp === app.id ? 'bg-ink text-white border-ink' : 'bg-white border-slate-300'
                            }`}
                          >
                            {app.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {isSelected && m.id === 'card' && (
                      <div className="px-3.5 pb-3.5 space-y-2 animate-fade-in">
                        <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Card number" aria-label="Card number" className={fieldClass} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" aria-label="Expiry" className={fieldClass} />
                          <input type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="CVV" aria-label="CVV" className={fieldClass} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {paymentError && (
            <div role="alert" className="mt-4 text-sm text-rose-800 bg-rose-50 border-l-4 border-rose-600 p-3 rounded">
              {paymentError}
            </div>
          )}

          <p className="mt-5 text-sm text-slate-600 flex items-start gap-2">
            <Shield className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" aria-hidden />
            Cancel up to 30 minutes before your start time for a full refund.
          </p>
        </div>

        <div className="p-3 bg-white border-t border-slate-300">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-brand-700 active:bg-brand-800 text-white font-black py-3.5 rounded-lg text-base flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Confirming payment…
              </>
            ) : mustSignIn ? (
              'Sign in to book'
            ) : (
              <>
                <Lock className="w-4 h-4" aria-hidden />
                Pay ₹{bookingDetails.total}
              </>
            )}
          </button>
        </div>

        {paymentSuccessModal && (
          <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-6 animate-fade-in" role="status">
            <div className="bg-white rounded-xl p-6 shadow-2xl max-w-xs w-full animate-scale-in">
              <span className="w-10 h-10 rounded-md bg-go-600 text-white flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[3]" aria-hidden />
              </span>
              <h3 className="font-black text-xl mt-4">Payment received</h3>
              <p className="text-[15px] text-slate-600 mt-1">Making your parking pass…</p>
              {recordedPaymentId && <p className="text-xs text-slate-500 mt-3 tabular">{recordedPaymentId}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Razorpay Interactive Modal for Mobile View */}
      <RazorpayCheckoutModal
        isOpen={isDemoMode && showRazorpayModal}
        amount={bookingDetails.total}
        locationTitle={location.title}
        bookingPassCode="IDM-MOBILE"
        vehicleNumber={bookingDetails.vehicleNumber || profile?.vehicleNumber || 'TN 59 AB 1234'}
        vehicleType="car"
        driverName={profile?.name || 'Driver User'}
        driverPhone={profile?.phone || '9876543210'}
        onSuccess={handleRazorpaySuccess}
        onClose={() => setShowRazorpayModal(false)}
      />
    </>
  );
};
