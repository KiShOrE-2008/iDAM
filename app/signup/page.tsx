'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, ArrowRight, ShieldCheck, CheckCircle2, Car, Building2, User, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [role, setRole] = useState<'driver' | 'owner'>('driver');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { login: authLogin } = useAuth();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      authLogin({
        name: fullName || 'Kishore Kumar',
        phone: phone ? `+91 ${phone}` : '+91 98765 43210',
        vehicleNumber: vehicleNo || 'TN 59 AZ 8899',
        role,
      });
      setTimeout(() => {
        router.push('/dashboard');
      }, 900);
    }, 900);
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
            <h1 className="text-2xl font-extrabold text-gray-900">Create your iDAM Account</h1>
            <p className="text-xs text-gray-500 font-medium">
              {role === 'driver' ? 'Register to discover & reserve parking spots in Madurai' : 'Register your parking space & start earning today'}
            </p>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-700" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900">Account Created Successfully!</h3>
              <p className="text-xs text-gray-500 font-medium">Redirecting to your account dashboard...</p>
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
                  <span>Driver Account</span>
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
                  <span>Parking Owner</span>
                </button>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arun Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Phone Number</label>
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
                      className="w-full pl-16 pr-4 py-3 rounded-2xl border border-gray-300 text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-700 outline-none"
                    />
                  </div>
                </div>

                {role === 'driver' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Plate Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. TN 59 AB 1234"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-xs font-mono font-bold uppercase tracking-wider text-gray-900 focus:ring-2 focus:ring-emerald-700 outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700 rounded cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-[11px] text-gray-600 font-medium cursor-pointer">
                    I agree to iDAM <span className="text-emerald-800 font-bold">Terms of Service</span> and <span className="text-emerald-800 font-bold">Privacy Policy</span>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!agreeTerms || isLoading}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>

              </form>

              {/* Bottom Login Redirect */}
              <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
                <span>Already have an account? </span>
                <Link href="/login" className="text-emerald-800 font-extrabold hover:underline">
                  Log In
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
