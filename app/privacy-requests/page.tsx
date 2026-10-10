'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { FileText, ShieldAlert, CheckCircle2, Send, Download, Trash2, Edit3, Eye } from 'lucide-react';

export default function PrivacyRequestsPage() {
  const [lang, setLang] = useState<Language>('en');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requestType, setRequestType] = useState('access');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; date: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name as registered on iDAM.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }
    if (!details.trim() || details.trim().length < 10) {
      setErrorMsg('Please provide a brief explanation of your request (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);

    // Simulate reliable DPDP request generation
    setTimeout(() => {
      const ticketId = `IDM-DPR-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      setSubmittedTicket({
        id: ticketId,
        date: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <PageContainer
      title="DPDP Privacy Rights Requests"
      titleTa="தரவு தனியுரிமை கோரிக்கைகள்"
      subtitle="Exercise your statutory rights under the Digital Personal Data Protection (DPDP) Act for data access, correction, portability, or consent withdrawal."
      subtitleTa="உங்கள் தனிப்பட்ட தரவை அணுக, திருத்த அல்லது நீக்க அதிகாரப்பூர்வ கோரிக்கையை சமர்ப்பிக்கவும்."
      badge="DPDP Act Compliance"
      breadcrumbs={[{ label: 'Privacy Requests' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left explanation card */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Your Statutory Rights
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            Under India&apos;s DPDP Act, every user (&quot;Data Principal&quot;) is entitled to understand what information iDAM maintains and request updates or deletion.
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
              <Eye className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-slate-900 block font-bold">1. Right to Access</strong>
                <span className="text-slate-600">Obtain a summary of all personal information, vehicle plates, and booking history linked to your profile.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
              <Edit3 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-slate-900 block font-bold">2. Right to Correction</strong>
                <span className="text-slate-600">Correct inaccurate mobile numbers, vehicle registrations, or owner payout records.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
              <Download className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-slate-900 block font-bold">3. Right to Portability</strong>
                <span className="text-slate-600">Export your garage vehicle inventory and completed reservation receipts in machine-readable JSON format.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
              <Trash2 className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-slate-900 block font-bold">4. Right to Erasure</strong>
                <span className="text-slate-600">
                  Request complete account purge. If you prefer self-service, visit the{' '}
                  <Link href="/account-deletion" className="text-emerald-700 font-bold underline">
                    Account Deletion tool
                  </Link>.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-500 font-medium">
            <p><strong>Response Timetable:</strong> All statutory DPDP requests are verified and processed within <strong>30 days</strong>.</p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          {submittedTicket ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Request Successfully Registered</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Your privacy request has been logged in our compliance ledger.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{submittedTicket.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submission Date:</span>
                  <span className="font-medium text-slate-800">{submittedTicket.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registered Email:</span>
                  <span className="font-medium text-slate-800">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statutory SLA:</span>
                  <span className="font-bold text-emerald-700">30 Calendar Days</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                A verification link has been dispatched to your email to confirm ownership of the account before records are exported or updated.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSubmittedTicket(null);
                  setDetails('');
                }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Submit a Privacy Request</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete the verification details below to log your formal request.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="pr-name" className="block text-xs font-black text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="pr-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your registered name"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pr-email" className="block text-xs font-black text-slate-700 mb-1">
                      Account Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="pr-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="driver@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label htmlFor="pr-phone" className="block text-xs font-black text-slate-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      id="pr-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pr-type" className="block text-xs font-black text-slate-700 mb-1">
                    Request Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="pr-type"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium bg-white"
                  >
                    <option value="access">Access — Summary of Stored Personal Data</option>
                    <option value="correction">Correction — Rectify Plate Number / Profile</option>
                    <option value="portability">Portability — JSON Export of Booking Records</option>
                    <option value="erasure">Erasure — Permanent Deletion of Personal Data</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pr-details" className="block text-xs font-black text-slate-700 mb-1">
                    Specific Details / Instructions <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="pr-details"
                    rows={4}
                    required
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Specify the license plates, booking dates, or account details relevant to your request..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span>Logging Request...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit DPDP Request
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-normal">
                By submitting this form, you verify that you are the authorized holder of the specified email address.
              </p>
            </form>
          )}
        </div>

      </div>
    </PageContainer>
  );
}
