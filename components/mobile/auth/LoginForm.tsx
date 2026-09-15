'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DemoMode } from './DemoMode';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await signIn(email, password);
    setIsLoading(false);

    if (res.success) {
      router.push('/');
    } else {
      setErrorMessage(res.error || 'Failed to sign in. Please check your credentials.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-5 max-w-sm mx-auto w-full">
      
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="text-xl font-black tracking-widest text-slate-900 uppercase">
          iDAM <span className="text-emerald-700 font-tamil">இடம்</span>
        </div>
        <h2 className="text-lg font-black text-slate-900">Welcome back.</h2>
        <p className="text-xs text-slate-500 font-medium">Find & reserve parking before you arrive.</p>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start space-x-2 text-xs text-rose-800 font-semibold animate-scale-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold text-slate-800 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-extrabold text-slate-800">Password</label>
            <Link href="/forgot-password" className="text-[11px] font-bold text-emerald-800 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 text-xs"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl shadow-md text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-75"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </>
          )}
        </button>
      </form>

      {/* Redirect to Sign Up */}
      <div className="text-center text-xs text-slate-500 font-medium pt-1">
        <span>New to iDAM? </span>
        <Link href="/signup" className="text-emerald-800 font-extrabold hover:underline">
          Create an account →
        </Link>
      </div>

      {/* Demo Mode Selector */}
      <DemoMode />
    </div>
  );
};
