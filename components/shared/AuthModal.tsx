'use client';

import React, { useState } from 'react';
import { X, Phone, Lock, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { Language } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, lang }) => {
  const [role, setRole] = useState<'driver' | 'owner'>('driver');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
    }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setStep('phone');
        onClose();
      }, 1500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900">Signed In Successfully!</h3>
            <p className="text-xs text-gray-500">Welcome to iDAM | இடம் Parking Platform</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header */}
            <div>
              <div className="inline-flex items-center space-x-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure Authentication</span>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900">
                {step === 'phone' ? 'Sign in to iDAM' : 'Enter Verification OTP'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {step === 'phone'
                  ? 'Access your reservations, parking passes, or owner dashboard.'
                  : `Verification code sent to +91 ${phone}`}
              </p>
            </div>

            {/* Role Switcher */}
            {step === 'phone' && (
              <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setRole('driver')}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    role === 'driver' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🚗 Driver Account
                </button>
                <button
                  onClick={() => setRole('owner')}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    role === 'owner' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🅿️ Parking Owner
                </button>
              </div>
            )}

            {/* Phone Input Form */}
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-3 text-xs font-bold text-gray-500 border-r pr-2 border-gray-200">
                      +91
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-16 pr-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-700 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={phone.length < 10 || isLoading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Sending OTP...' : 'Send OTP Verification'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">4-Digit OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="1 2 3 4"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full tracking-widest text-center py-3 rounded-2xl border border-gray-200 text-lg font-bold focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otp.length < 4 || isLoading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-xs text-emerald-800 font-bold hover:underline"
                  >
                    Change Phone Number
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
