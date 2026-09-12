'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, ArrowRight, ShieldCheck, CheckCircle2, Car, Building2, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [role, setRole] = useState<'driver' | 'owner'>('driver');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { login: authLogin } = useAuth();

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
      authLogin({
        phone: phone ? `+91 ${phone}` : '+91 98765 43210',
        role,
      });
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <div className="max-w-md mx-auto px-4 py-12 w-full flex-1 flex flex-col justify-center">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 space-y-6">
          
          {/* Logo & Heading */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-block hover:scale-105 transition-transform">
              <img
                src="/idam-logo.png"
                alt="iDAM | இடம் Logo"
                className="h-16 w-auto mx-auto object-contain"
              />
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900">Welcome Back to iDAM</h1>
            <p className="text-xs text-gray-500 font-medium">
              {role === 'driver' ? 'Sign in to access your parking passes & bookings' : 'Sign in to manage your parking spaces & earnings'}
            </p>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-700" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900">Signed In Successfully!</h3>
              <p className="text-xs text-gray-500 font-medium">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <>
              {/* Role Switcher */}
              <div className="flex bg-gray-100 p-1.5 rounded-2xl text-xs font-extrabold gap-1">
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                    role === 'driver'
                      ? 'bg-white text-emerald-950 shadow-xs border border-gray-200/60'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Car className="w-4 h-4 text-emerald-700" />
                  <span>Driver</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                    role === 'owner'
                      ? 'bg-white text-emerald-950 shadow-xs border border-gray-200/60'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>Space Owner</span>
                </button>
              </div>

              {/* Step 1: Mobile Phone Form */}
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
                    disabled={phone.length < 10 || isLoading}
                    className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Sending OTP Code...' : 'Send OTP Verification'}</span>
                    <ArrowRight className="w-4 h-4 text-emerald-300" />
                  </button>
                </form>
              ) : (
                /* Step 2: OTP Verification Form */
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
                    className="w-full bg-emerald-950 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-900 text-xs flex items-center justify-center space-x-2 transition-all"
                  >
                    <span>{isLoading ? 'Verifying...' : 'Verify & Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Quick Demo Sign In Shortcut */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <p className="text-[11px] font-bold text-gray-400 text-center uppercase tracking-wider">Instant Guest Demo Access</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          authLogin({ role: 'driver', name: 'Kishore Kumar', phone: '+91 98765 43210' });
                          router.push('/dashboard');
                        }}
                        className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Car className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Demo Driver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          authLogin({ role: 'owner', name: 'Kishore (Meenakshi Parking)', phone: '+91 98765 43210' });
                          router.push('/dashboard');
                        }}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-700" />
                        <span>Demo Owner</span>
                      </button>
                    </div>
                  </div>

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

              {/* Bottom Sign Up Redirect */}
              <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
                <span>Don&apos;t have an account? </span>
                <Link href="/signup" className="text-emerald-800 font-extrabold hover:underline">
                  Sign Up Now
                </Link>
              </div>
            </>
          )}

        </div>

      </div>

      <Footer lang={lang} />

    </div>
  );
}
