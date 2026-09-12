'use client';

import React, { useState } from 'react';
import { X, ArrowRight, UserCheck, ShieldCheck, Car, Building2, Phone, CheckCircle2 } from 'lucide-react';
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
    }, 600);
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
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex justify-center p-4 sm:py-16">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 h-fit my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-700" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900">Signed In Successfully!</h3>
            <p className="text-xs text-gray-500 font-medium">Welcome back to iDAM | இடம் Parking Platform</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header Logo & Title */}
            <div>
              <img
                src="/idam-logo.png"
                alt="iDAM Logo"
                className="h-12 w-auto mb-3 object-contain"
              />
              <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-3 py-1 rounded-full text-xs font-bold mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Secure Mobile Sign In</span>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900">
                {step === 'phone' ? 'Sign in to iDAM' : 'Enter Verification Code'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {step === 'phone'
                  ? 'Access your digital parking passes, reservations, or space earnings.'
                  : `We sent a 4-digit verification code to +91 ${phone}`}
              </p>
            </div>

            {/* Role Switcher Pills */}
            {step === 'phone' && (
              <div className="flex bg-gray-100/90 p-1.5 rounded-2xl text-xs font-extrabold gap-1">
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                    role === 'driver'
                      ? 'bg-white text-emerald-950 shadow-sm border border-gray-200/60'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Car className="w-4 h-4 text-emerald-700" />
                  <span>Driver Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                    role === 'owner'
                      ? 'bg-white text-emerald-950 shadow-sm border border-gray-200/60'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>Parking Owner</span>
                </button>
              </div>
            )}

            {/* Phone Input Form */}
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Mobile Phone Number</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-xs font-extrabold text-gray-500 border-r pr-2.5 border-gray-300">
                      +91
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-16 pr-4 py-3 rounded-2xl border border-gray-300 text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 active:scale-98"
                >
                  <span>{isLoading ? 'Sending OTP Code...' : 'Send OTP Verification'}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">4-Digit OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="1 2 3 4"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full tracking-widest text-center py-3 rounded-2xl border border-gray-300 text-xl font-mono font-extrabold text-gray-900 focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 active:scale-98"
                >
                  <span>{isLoading ? 'Verifying OTP...' : 'Verify & Continue'}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-xs text-emerald-800 font-extrabold hover:underline"
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
