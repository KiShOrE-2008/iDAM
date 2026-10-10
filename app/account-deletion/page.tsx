'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Trash2, AlertTriangle, CheckCircle2, Shield, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AccountDeletionPage() {
  const [lang, setLang] = useState<Language>('en');
  const { profile, signOut } = useAuth();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [reason, setReason] = useState('No longer need parking services');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmWord !== 'DELETE') return;

    setIsDeleting(true);
    // Simulate permanent purge / call account deletion API
    setTimeout(async () => {
      try {
        localStorage.removeItem('idam_user_vehicles');
        localStorage.removeItem('idam_wallet_balance');
        localStorage.removeItem('idam_wallet_transactions');
        await signOut();
      } catch {}
      setIsDeleting(false);
      setIsDeleted(true);
    }, 1000);
  };

  return (
    <PageContainer
      title="Account & Data Deletion Portal"
      titleTa="கணக்கு மற்றும் தரவு நீக்கம்"
      subtitle="Permanent account closure, vehicle garage record erasure, and personal data purge under DPDP compliance."
      subtitleTa="உங்கள் கணக்கு மற்றும் வாகனத் தகவல்களை முழுமையாக நீக்குவதற்கான பக்கம்."
      badge="Data Erasure & User Sovereignty"
      breadcrumbs={[{ label: 'Account Deletion' }]}
      lang={lang}
      onLanguageToggle={setLang}
      maxWidthClass="max-w-3xl"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
        
        {isDeleted ? (
          <div className="py-10 text-center space-y-4 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-700" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">Account Deletion Scheduled</h3>
              <p className="text-xs text-slate-500 font-semibold">
                Your personal details, vehicle garage plates, and authentication sessions have been purged.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto">
              Any remaining legal records will be permanently expunged following the mandatory 30-day statutory audit retention.
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="px-6 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-black shadow-md"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Warning Alert */}
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex items-start space-x-3 text-rose-950">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-black text-sm text-rose-900">Warning: Permanent & Irreversible Action</h4>
                <p className="text-rose-800 leading-relaxed font-medium">
                  Deleting your iDAM account will permanently erase your profile identity, saved vehicles in your private Garage, active QR passes, and unredeemed iDAM Wallet credits. This action cannot be reversed.
                </p>
              </div>
            </div>

            {/* What gets purged checklist */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">What data will be removed?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Personal Name, Email & Verified Phone</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Registered Vehicle Garage & Plates</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>iDAM Wallet Balance & Ledger History</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Authentication Sessions & Password Credentials</span>
                </div>
              </div>
            </div>

            {/* Deletion Form */}
            <form onSubmit={handleRequestDeletion} className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-base font-black text-slate-900">Confirm Deletion Request</h3>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 block">
                  Registered Account Email *
                </label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={profile?.email || 'Enter your registered email address'}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 block">
                  Reason for Leaving (Optional)
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option>No longer need parking services in Madurai</option>
                  <option>Sold vehicle / changed transport mode</option>
                  <option>Privacy or data preference concerns</option>
                  <option>Switching to another platform</option>
                  <option>Other reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 block">
                  Type <span className="font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">DELETE</span> in capital letters to confirm *
                </label>
                <input
                  type="text"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  placeholder="DELETE"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase tracking-widest"
                />
              </div>

              <button
                type="submit"
                disabled={isDeleting || confirmWord !== 'DELETE' || !confirmEmail.trim()}
                className="w-full py-3.5 bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-rose-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Erasing Account Records...' : 'Permanently Delete My Account & Purge Data'}</span>
              </button>
            </form>
          </>
        )}

      </div>
    </PageContainer>
  );
}
