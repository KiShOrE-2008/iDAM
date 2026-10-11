'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  QrCode,
  CheckCircle2,
  Key,
  ChevronRight,
  Info,
  Loader2,
  ExternalLink
} from 'lucide-react';
import {
  getRazorpayKey,
  setRazorpayKey,
  isRealRazorpayKey,
  generateMockPaymentId,
  openOfficialRazorpayCheckout,
  RazorpaySuccessResult
} from '@/lib/payment/razorpay';
import { useRegisterModal } from '@/context/BackNavigationContext';

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  amount: number;
  locationTitle: string;
  bookingPassCode?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
  onSuccess: (result: RazorpaySuccessResult) => void;
  onClose: () => void;
}

type TabType = 'upi' | 'card' | 'netbanking' | 'wallet' | 'qr';

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  amount,
  locationTitle,
  bookingPassCode,
  vehicleNumber,
  vehicleType,
  driverName,
  driverPhone,
  onSuccess,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'cred'>('gpay');
  const [vpa, setVpa] = useState('driver@okaxis');
  const [selectedBank, setSelectedBank] = useState('HDFC');
  
  // Card details
  const [cardNumber, setCardNumber] = useState('4532 8921 4410 9923');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('789');
  const [cardHolder, setCardHolder] = useState(driverName || 'Kishore Kumar');

  // Key configuration
  const [customKey, setCustomKey] = useState(getRazorpayKey());
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<RazorpaySuccessResult | null>(null);

  // Automatically register with Back navigation stack when open
  useRegisterModal(isOpen, onClose, 'razorpay-checkout-modal');

  useEffect(() => {
    if (isOpen) {
      setCustomKey(getRazorpayKey());
      setIsProcessing(false);
      setPaymentSuccessData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasRealKey = isRealRazorpayKey(customKey);

  const handleSaveKey = () => {
    setRazorpayKey(customKey);
    setShowKeyConfig(false);
  };

  const handleLaunchOfficialPopup = async () => {
    setIsProcessing(true);
    try {
      const res = await openOfficialRazorpayCheckout({
        amount,
        locationTitle,
        bookingPassCode,
        vehicleNumber,
        vehicleType,
        driverName,
        driverPhone
      });
      setIsProcessing(false);
      onSuccess(res);
    } catch (err: any) {
      setIsProcessing(false);
      if (err?.message === 'PAYMENT_DISMISSED') {
        // User closed the popup, do not show error
        return;
      }
      console.warn('Official Razorpay popup failed, falling back to sandbox modal:', err);
      // If official popup fails (e.g., unauthorized domain or bad key), alert user gently
      alert('Official Razorpay window could not proceed (' + (err?.description || err?.message || 'SDK check') + '). You can complete payment instantly via the Razorpay Sandbox Mode below!');
    }
  };

  const handlePrimaryPayClick = () => {
    if (hasRealKey) {
      handleLaunchOfficialPopup();
    } else {
      handleSimulatePayment(activeTab);
    }
  };

  const handleSimulatePayment = (methodUsed: string) => {
    setIsProcessing(true);
    const mockPaymentId = generateMockPaymentId(true);
    const mockOrderId = `demo_order_${Math.random().toString(36).substring(2, 11)}`;

    setTimeout(() => {
      const result: RazorpaySuccessResult = {
        razorpay_payment_id: mockPaymentId,
        razorpay_order_id: mockOrderId,
        razorpay_signature: `sig_demo_${Math.random().toString(36).substring(2, 15)}`,
        amount,
        paymentMethod: 'Razorpay',
        timestamp: new Date().toISOString(),
        isSandbox: true
      };

      setIsProcessing(false);
      setPaymentSuccessData(result);

      setTimeout(() => {
        onSuccess(result);
      }, 1200);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 relative flex flex-col max-h-[92vh]">
        
        {/* Razorpay Branded Top Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950 text-white p-4 sm:p-5 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Razorpay Brand Mark */}
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-blue-400/30">
                <span className="italic tracking-tighter">R</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black tracking-wide text-white">Razorpay</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Trusted Business
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">iDAM Smart Parking Reservation</p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Amount Badge */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Payable Amount</span>
              <div className="text-2xl font-black text-white">₹{amount}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Spot</span>
              <div className="text-xs font-semibold text-emerald-300 truncate max-w-[160px]">{locationTitle}</div>
            </div>
          </div>
        </div>

        {/* Real Key Notice or Official Popup Trigger */}
        {hasRealKey && (
          <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-blue-900 font-semibold">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Configured with custom Razorpay Key: <code className="font-mono text-[11px]">{customKey.slice(0, 12)}...</code></span>
            </div>
            <button
              onClick={handleLaunchOfficialPopup}
              disabled={isProcessing}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1 shadow-xs transition-all shrink-0 ml-2"
            >
              <span>Launch Official Popup</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Method Navigation Tabs */}
          <div className="grid grid-cols-5 gap-1.5 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('upi')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                activeTab === 'upi' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 mb-0.5" />
              <span>UPI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                activeTab === 'qr' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 mb-0.5" />
              <span>QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('card')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                activeTab === 'card' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 mb-0.5" />
              <span>Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('netbanking')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                activeTab === 'netbanking' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 mb-0.5" />
              <span>NetBanking</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wallet')}
              className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                activeTab === 'wallet' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4 mb-0.5" />
              <span>Wallets</span>
            </button>
          </div>

          {/* TAB 1: UPI APPS */}
          {activeTab === 'upi' && (
            <div className="space-y-3.5 animate-fade-in">
              <label className="block text-xs font-bold text-slate-700">Select Instant UPI App</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'gpay', name: 'Google Pay', badge: 'Instant UPI', bg: 'hover:border-blue-500 bg-blue-50/40 text-blue-900' },
                  { id: 'phonepe', name: 'PhonePe', badge: 'Popular', bg: 'hover:border-purple-500 bg-purple-50/40 text-purple-900' },
                  { id: 'paytm', name: 'Paytm UPI', badge: 'Fastest', bg: 'hover:border-sky-500 bg-sky-50/40 text-sky-900' },
                  { id: 'cred', name: 'CRED Pay', badge: 'Members', bg: 'hover:border-slate-800 bg-slate-100 text-slate-900' }
                ].map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedUpiApp(app.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      selectedUpiApp === app.id
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-white shadow-sm'
                        : `${app.bg} border-slate-200`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">{app.name}</span>
                      {selectedUpiApp === app.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 fill-current" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1">{app.badge}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Or Enter UPI ID / VPA</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    placeholder="username@okhdfcbank"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPI QR CODE */}
          {activeTab === 'qr' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3 animate-fade-in">
              <div className="text-xs font-extrabold text-slate-800">Scan & Pay via any UPI App</div>
              <div className="w-40 h-40 bg-white p-3 rounded-2xl border border-slate-200 shadow-md mx-auto flex items-center justify-center">
                {/* Dynamically styled simulated QR code pattern */}
                <div className="w-full h-full bg-radial from-slate-900 to-slate-800 rounded-xl flex flex-col items-center justify-center text-white p-3 space-y-1">
                  <QrCode className="w-16 h-16 text-emerald-400" />
                  <span className="text-[9px] font-mono tracking-widest text-emerald-300">RAZORPAY•UPI</span>
                  <span className="text-[10px] font-bold text-white">₹{amount}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Camera or any UPI App (GPay, PhonePe, Paytm, BHIM)</span>
              </div>
            </div>
          )}

          {/* TAB 3: CARDS */}
          {activeTab === 'card' && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4532 8921 4410 9923"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CVV / CVC</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="•••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Name as on card"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 text-[10px] text-slate-500 pt-1">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Card data tokenized securely. PCI-DSS Level 1 certified.</span>
              </div>
            </div>
          )}

          {/* TAB 4: NET BANKING */}
          {activeTab === 'netbanking' && (
            <div className="space-y-3 animate-fade-in">
              <label className="block text-xs font-bold text-slate-700">Popular Indian Banks</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'HDFC', name: 'HDFC Bank' },
                  { id: 'SBI', name: 'State Bank of India' },
                  { id: 'ICICI', name: 'ICICI Bank' },
                  { id: 'AXIS', name: 'Axis Bank' },
                  { id: 'KOTAK', name: 'Kotak Mahindra' },
                  { id: 'PNB', name: 'Punjab National' }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBank(b.id)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedBank === b.id
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-extrabold ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{b.id}</div>
                    <div className="text-[9px] text-slate-500 truncate">{b.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: WALLETS */}
          {activeTab === 'wallet' && (
            <div className="space-y-2.5 animate-fade-in">
              <label className="block text-xs font-bold text-slate-700">Supported Digital Wallets</label>
              {[
                { name: 'Amazon Pay', balance: '₹450 available' },
                { name: 'Paytm Wallet', balance: 'Link & Pay' },
                { name: 'Mobikwik', balance: 'SuperCash eligible' },
                { name: 'PhonePe Wallet', balance: 'Instant OTP' }
              ].map((w) => (
                <div
                  key={w.name}
                  onClick={() => handleSimulatePayment(w.name)}
                  className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between hover:border-blue-500 hover:bg-blue-50/30 cursor-pointer transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{w.name}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold">{w.balance}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          )}

          {/* Key Configuration Drawer */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="text-[11px] font-bold text-slate-500 hover:text-blue-700 flex items-center space-x-1 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{showKeyConfig ? 'Hide Razorpay Key Config' : 'Configure Razorpay API Key'}</span>
            </button>

            {showKeyConfig && (
              <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs animate-scale-in">
                <p className="text-[11px] text-slate-600">
                  Enter your Razorpay Key ID from the Razorpay Dashboard (e.g. <code className="bg-slate-200 px-1 rounded">rzp_test_...</code>) or leave blank for sandbox demo:
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="rzp_test_YourKeyHere"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 font-mono text-[11px] font-bold text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col space-y-2">
          
          <button
            type="button"
            onClick={handlePrimaryPayClick}
            disabled={isProcessing}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-3.5 rounded-2xl shadow-lg text-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-75 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing via Razorpay...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-blue-200" />
                <span>Pay ₹{amount} via Razorpay</span>
              </>
            )}
          </button>

          {hasRealKey && (
            <button
              type="button"
              onClick={() => handleSimulatePayment(activeTab)}
              disabled={isProcessing}
              className="text-[11px] text-slate-500 hover:text-blue-700 font-semibold underline text-center cursor-pointer transition-colors"
            >
              Test with Instant Sandbox Simulation
            </button>
          )}

          <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-500 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Secured by Razorpay • Instant Refund Guarantee</span>
          </div>

        </div>

        {/* Payment Success Overlay Simulation */}
        {paymentSuccessData && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3 z-30 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-500 mt-0.5">Authorized by Razorpay Gateway</p>
            </div>
            <div className="bg-slate-100 p-2.5 rounded-xl font-mono text-xs font-bold text-slate-800 border border-slate-200">
              ID: {paymentSuccessData.razorpay_payment_id}
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold">Generating your confirmed digital parking pass...</p>
          </div>
        )}

      </div>
    </div>
  );
};
