'use client';

import React, { useState } from 'react';
import { ArrowRight, Sparkles, User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Language } from '@/types';

interface AuthScreenProps {
  lang?: Language;
  onSuccess: () => void;
  onSkipDemo?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onSkipDemo }) => {
  const { signIn, signUp, startDemo, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup State
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const res = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.error || 'Failed to sign in. Please check credentials.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const res = await signUp({
      email: signupEmail,
      password: signupPassword,
      fullName: fullName,
    });
    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } else {
      setErrorMsg(res.error || 'Failed to register account.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const res = await resetPassword(resetEmail);
    setIsLoading(false);

    if (res.success) {
      setResetSuccess(true);
    } else {
      setErrorMsg(res.error || 'Failed to send password reset email.');
    }
  };

  const handleDemoClick = (role: 'driver' | 'owner') => {
    startDemo(role);
    onSuccess();
  };

  return (
    <div className="h-full flex flex-col justify-between p-6 sm:p-8 bg-[#F8F8F5] text-slate-900 overflow-y-auto select-none animate-fade-in">
      
      {/* Top Brand Header */}
      <div className="text-center pt-2 space-y-2">
        <div className="inline-flex items-center space-x-1.5 bg-white border border-slate-200 px-3.5 py-1 rounded-full text-xs font-black text-slate-800 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>iDAM Mobile Account</span>
        </div>
        
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {mode === 'login' 
            ? 'Sign in to access your digital parking passes & garage.'
            : 'Join iDAM to reserve smart parking spots instantly.'}
        </p>
      </div>

      {/* Mode Toggle Pills */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex my-4">
        <button
          type="button"
          onClick={() => { setMode('login'); setErrorMsg(null); }}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            mode === 'login' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setErrorMsg(null); }}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            mode === 'signup' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Register
        </button>
      </div>

      {/* Main Form Body */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200/80 space-y-4 my-auto">
        
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start space-x-2 text-xs text-rose-800 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="py-6 text-center space-y-2 animate-scale-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7 text-emerald-700" />
            </div>
            <h3 className="text-base font-black text-slate-900">Account Created!</h3>
            <p className="text-xs text-slate-500 font-medium">Entering iDAM App...</p>
          </div>
        ) : mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-extrabold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setErrorMsg(null); }}
                  className="text-[11px] font-bold text-emerald-800 hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-2xl shadow-md text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-75"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </form>
        ) : mode === 'forgot' ? (
          resetSuccess ? (
            <div className="py-6 text-center space-y-3 animate-scale-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>
              <h3 className="text-base font-black text-slate-900">Reset Email Sent!</h3>
              <p className="text-xs text-slate-500 font-medium">Check your inbox for password recovery instructions.</p>
              <button
                type="button"
                onClick={() => { setMode('login'); setResetSuccess(false); setErrorMsg(null); }}
                className="text-xs font-black text-emerald-800 hover:underline pt-2 block mx-auto"
              >
                Back to Sign In →
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-2xl shadow-md text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-75"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 pt-1"
              >
                Return to Sign In
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSignupSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-2xl shadow-md text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-75"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Demo Mode / Investor Fast Track */}
      <div className="space-y-2 pt-2">
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-300 w-full" />
          <span className="bg-[#F8F8F5] px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest absolute">
            Investor & Demo Fast Track
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleDemoClick('driver')}
            className="w-full bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 border border-emerald-300/80 font-black py-2.5 px-2 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Driver Demo 🚗</span>
          </button>
          <button
            type="button"
            onClick={() => handleDemoClick('owner')}
            className="w-full bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300/80 font-black py-2.5 px-2 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Owner Portal 🔑</span>
          </button>
        </div>

        {onSkipDemo && (
          <button
            type="button"
            onClick={onSkipDemo}
            className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors py-1"
          >
            Skip for now & explore spots &rarr;
          </button>
        )}
      </div>

    </div>
  );
};
