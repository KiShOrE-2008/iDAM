'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState<Language>('en');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdateSuccess, setIsUpdateSuccess] = useState(false);

  const { resetPassword, updatePassword, isPasswordRecovery } = useAuth();

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await resetPassword(email);
    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
    } else {
      setErrorMessage(res.error || 'Failed to send password reset email.');
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await updatePassword(newPassword);
    setIsLoading(false);

    if (res.success) {
      setIsUpdateSuccess(true);
    } else {
      setErrorMessage(res.error || 'Failed to update password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] flex flex-col justify-between font-sans selection:bg-emerald-200 text-slate-900">
      
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
          href="/login"
          className="inline-flex items-center space-x-2 text-xs font-extrabold text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-5 max-w-sm mx-auto w-full">
          
          <div className="text-center space-y-1.5">
            <div className="text-xl font-black tracking-widest text-slate-900 uppercase">
              iDAM <span className="text-emerald-700 font-tamil">இடம்</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              {isPasswordRecovery ? 'Set New Password' : 'Reset Password'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isPasswordRecovery 
                ? 'Create a new secure password for your iDAM account.' 
                : 'Enter your email address to receive password recovery instructions.'}
            </p>
          </div>

          {isUpdateSuccess ? (
            <div className="py-6 text-center space-y-3 animate-scale-in">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-base font-black text-slate-900">Password Updated!</h3>
              <p className="text-xs text-slate-500 font-medium">Your password has been changed successfully. You can now sign in.</p>
              <Link href="/login" className="inline-block pt-2 text-xs font-extrabold text-emerald-800 hover:underline">
                Sign In Now →
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="py-6 text-center space-y-3 animate-scale-in">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-base font-black text-slate-900">Reset Email Sent!</h3>
              <p className="text-xs text-slate-500 font-medium">Check your inbox for instructions to reset your password.</p>
              <Link href="/login" className="inline-block pt-2 text-xs font-extrabold text-emerald-800 hover:underline">
                Return to Sign In →
              </Link>
            </div>
          ) : isPasswordRecovery ? (
            <>
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start space-x-2 text-xs text-rose-800 font-semibold animate-scale-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl shadow-md text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-75"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <span>Update Password →</span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start space-x-2 text-xs text-rose-800 font-semibold animate-scale-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl shadow-md text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-75"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <span>Send Reset Email →</span>
                  )}
                </button>
              </form>
            </>
          )}

        </div>

      </div>

      <Footer lang={lang} />

    </div>
  );
}
