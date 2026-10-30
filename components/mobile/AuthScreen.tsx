'use client';

import React, { useState } from 'react';
import { ArrowRight, Sparkles, User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandSign } from '@/components/shared/BrandMark';
import { Language } from '@/types';

interface AuthScreenProps {
  lang?: Language;
  onSuccess: () => void;
  onSkipDemo?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onSkipDemo }) => {
  const { signIn, signUp, startDemo, resetPassword, resendConfirmation } = useAuth();
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

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
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const res = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setNeedsConfirmation(res.code === 'EMAIL_NOT_CONFIRMED');
      setResendState('idle');
      setErrorMsg(res.error || 'Failed to sign in. Please check credentials.');
    }
  };

  const handleResendConfirmation = async () => {
    setResendState('sending');
    const res = await resendConfirmation(loginEmail);
    if (res.success) {
      setResendState('sent');
    } else {
      setResendState('idle');
      setErrorMsg(res.error || 'Could not resend the confirmation email.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const res = await signUp({
      email: signupEmail,
      password: signupPassword,
      fullName: fullName,
    });
    setIsLoading(false);

    if (res.success && res.needsEmailConfirmation) {
      // Not signed in yet: send them to the login form to come back after confirming
      setMode('login');
      setLoginEmail(signupEmail);
      setInfoMsg(`Account created. We sent a confirmation link to ${signupEmail}. Open it, then sign in here.`);
      setNeedsConfirmation(true);
      setResendState('idle');
    } else if (res.success) {
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
    <div className="h-full flex flex-col p-6 bg-limewash text-ink overflow-y-auto animate-fade-in">
      
      <div className="pt-2">
        <BrandSign size={40} />
        <h1 className="text-[1.75rem] font-black tracking-tight text-ink mt-5 leading-tight">
          {mode === 'login' ? 'Sign in to iDAM' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
        </h1>
        <p className="text-[15px] text-slate-600 mt-1">
          {mode === 'signup' ? 'Book spaces and keep your passes in one place.' : 'Your passes and saved vehicles are waiting.'}
        </p>
      </div>

      <div className="flex border-b border-slate-300 mt-6 mb-5" role="tablist">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setErrorMsg(null); }}
            className={`flex-1 pb-2.5 text-[15px] font-bold border-b-[3px] -mb-px cursor-pointer ${
              mode === m ? 'border-brand-700 text-ink' : 'border-transparent text-slate-500'
            }`}
          >
            {m === 'login' ? 'Sign in' : 'New account'}
          </button>
        ))}
      </div>

      {/* Main Form Body */}
      <div className="space-y-4">
        
        {errorMsg && (
          <div className="bg-rose-50 border-l-4 border-rose-600 p-3 rounded flex items-start gap-2 text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div role="status" className="bg-brand-50 border-l-4 border-brand-700 p-3 rounded text-sm text-brand-900">
            {infoMsg}
          </div>
        )}

        {needsConfirmation && mode === 'login' && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendState !== 'idle'}
            className="w-full text-xs font-extrabold text-brand-800 bg-brand-50 border border-brand-200 rounded-2xl py-2.5 disabled:opacity-70"
          >
            {resendState === 'sent'
              ? `Confirmation email sent to ${loginEmail}. Check inbox and spam.`
              : resendState === 'sending' ? 'Sending...' : "Didn't get the email? Resend it"}
          </button>
        )}

        {isSuccess ? (
          <div className="py-6 text-center space-y-2 animate-scale-in">
            <div className="w-12 h-12 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7 text-brand-700" />
            </div>
            <h3 className="text-base font-black text-slate-900">Account Created!</h3>
            <p className="text-xs text-slate-500 font-medium">Entering iDAM App...</p>
          </div>
        ) : mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-md text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setErrorMsg(null); }}
                  className="text-sm font-semibold text-brand-700 underline underline-offset-4"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-md text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-black py-3.5 rounded-lg text-base flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  
                </>
              )}
            </button>
          </form>
        ) : mode === 'forgot' ? (
          resetSuccess ? (
            <div className="py-6 text-center space-y-3 animate-scale-in">
              <div className="w-12 h-12 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-7 h-7 text-brand-700" />
              </div>
              <h3 className="text-base font-black text-slate-900">Reset Email Sent!</h3>
              <p className="text-xs text-slate-500 font-medium">Check your inbox for password recovery instructions.</p>
              <button
                type="button"
                onClick={() => { setMode('login'); setResetSuccess(false); setErrorMsg(null); }}
                className="text-xs font-black text-brand-800 hover:underline pt-2 block mx-auto"
              >
                Back to Sign In →
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-3.5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-md text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-black py-3.5 rounded-lg text-base flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-md text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-md text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-md text-[15px] text-ink placeholder:text-slate-400 focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-700 hover:bg-brand-800 text-white font-black py-3.5 rounded-lg text-base flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Create account</span>
                  
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <div className="mt-auto pt-8">
        <p className="text-sm text-slate-600 mb-2.5">Just looking around? Try the app with sample data.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleDemoClick('driver')}
            className="bg-white border border-slate-300 hover:border-ink py-3 rounded-md text-sm font-bold cursor-pointer"
          >
            Try as a driver
          </button>
          <button
            type="button"
            onClick={() => handleDemoClick('owner')}
            className="bg-white border border-slate-300 hover:border-ink py-3 rounded-md text-sm font-bold cursor-pointer"
          >
            Try as an owner
          </button>
        </div>
        {onSkipDemo && (
          <button
            type="button"
            onClick={onSkipDemo}
            className="w-full text-center text-sm font-semibold text-slate-600 underline underline-offset-4 py-3 mt-1 cursor-pointer"
          >
            Skip and browse parking
          </button>
        )}
      </div>
    </div>
  );
};
