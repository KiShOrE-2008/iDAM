'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  UserCheck,
  Upload,
  CheckCircle2,
  ShieldAlert,
  Send
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SupportHubNav } from '@/components/shared/SupportHubNav';
import { Language } from '@/types';

const REPORT_CATEGORIES = [
  {
    id: 'space',
    icon: Building2,
    title: 'Parking Space',
    color: 'border-emerald-200 bg-emerald-50/50 text-emerald-950',
    issues: [
      'Parking space unavailable',
      'Incorrect location on map',
      'Misleading photos or details',
      'Unsafe parking area',
      'Owner asked for extra payment'
    ]
  },
  {
    id: 'booking',
    icon: Calendar,
    title: 'Booking',
    color: 'border-blue-200 bg-blue-50/50 text-blue-950',
    issues: [
      'Booking not recognized at gate',
      'Unable to access parking lot',
      'Incorrect booking information',
      'Owner cancelled unexpectedly'
    ]
  },
  {
    id: 'payment',
    icon: CreditCard,
    title: 'Payment',
    color: 'border-amber-200 bg-amber-50/50 text-amber-950',
    issues: [
      'Payment failed during checkout',
      'Charged incorrectly',
      'Refund issue / delay',
      'Duplicate payment charged'
    ]
  },
  {
    id: 'user',
    icon: UserCheck,
    title: 'User / Owner',
    color: 'border-purple-200 bg-purple-50/50 text-purple-950',
    issues: [
      'Suspicious activity',
      'Harassment or rude behavior',
      'Fraudulent space listing',
      'Other inappropriate behavior'
    ]
  }
];

export default function ReportIssuePage() {
  const [lang, setLang] = useState<Language>('en');
  const [selectedCategory, setSelectedCategory] = useState<string>('space');
  const [selectedIssue, setSelectedIssue] = useState<string>('Parking space unavailable');
  const [bookingId, setBookingId] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const activeCategoryObj = REPORT_CATEGORIES.find(c => c.id === selectedCategory) || REPORT_CATEGORIES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setDescription('');
      setBookingId('');
      setFileName(null);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans text-gray-800">
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-10">
        
        {/* Support Hub Header Navigation */}
        <SupportHubNav activeTab="report" />

        {/* Page Title */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Something went wrong?
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Help us keep IDAM safe and reliable. Report problems with parking spaces, bookings, payments, or other users.
          </p>
        </div>

        {/* What would you like to report? Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-gray-900 text-center sm:text-left">
            What would you like to report?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REPORT_CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedIssue(cat.issues[0]);
                  }}
                  className={`p-5 rounded-3xl border-2 text-left transition-all relative ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-600/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2.5 rounded-2xl ${cat.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h4 className="font-extrabold text-sm text-gray-900">{cat.title}</h4>
                  </div>
                  <ul className="text-[11px] text-gray-500 space-y-1 font-medium">
                    {cat.issues.slice(0, 3).map((iss, i) => (
                      <li key={i} className="truncate">• {iss}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-200/80 space-y-6 max-w-3xl mx-auto">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xl font-extrabold text-gray-900">Report Form</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Category: <span className="font-bold text-emerald-800 uppercase">{activeCategoryObj.title}</span>
            </p>
          </div>

          {isSuccess ? (
            <div className="py-10 text-center space-y-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-700" />
              </div>
              <h4 className="text-2xl font-extrabold text-gray-900">Report Submitted!</h4>
              <p className="text-xs text-gray-600 font-medium max-w-md mx-auto">
                Thank you for helping keep IDAM safe. We'll review the information you provided and may contact you if additional details are needed.
              </p>
              <button
                onClick={() => setIsSuccess(false)}
                className="bg-emerald-950 text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-emerald-900 transition-colors"
              >
                Submit Another Report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Booking ID (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. IDM-82931"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs font-mono bg-gray-50/50"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Issue Type</label>
                  <select
                    value={selectedIssue}
                    onChange={(e) => setSelectedIssue(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs bg-gray-50/50"
                  >
                    {activeCategoryObj.issues.map((iss, i) => (
                      <option key={i} value={iss}>{iss}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Describe the problem</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us what happened..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs bg-gray-50/50"
                />
              </div>

              {/* Upload evidence field */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Upload evidence (optional)</label>
                <div className="border-2 border-dashed border-gray-200 hover:border-emerald-600 rounded-2xl p-4 text-center cursor-pointer bg-gray-50/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFileName(e.target.files[0].name);
                      }
                    }}
                    className="hidden"
                    id="evidence-file"
                  />
                  <label htmlFor="evidence-file" className="cursor-pointer flex flex-col items-center space-y-1">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-600 font-semibold">
                      {fileName ? `File attached: ${fileName}` : 'Add photos or screenshots'}
                    </span>
                    <span className="text-[10px] text-gray-400">PNG, JPG up to 5MB</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 text-xs transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting Report...' : 'Submit Report →'}</span>
              </button>
            </form>
          )}

          {/* After submit & Emergency Banner */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium">
              <strong>After you submit:</strong> We'll review the information you provide and may contact you for additional details.
            </p>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs leading-relaxed font-medium flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Emergency Warning:</strong> If you believe there is an immediate danger or emergency, contact the appropriate local emergency services rather than relying on IDAM support.
              </div>
            </div>
          </div>

        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
