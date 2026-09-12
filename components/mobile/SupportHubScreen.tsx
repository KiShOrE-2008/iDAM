'use client';

import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, AlertTriangle, ShieldCheck, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import { Language } from '@/types';

interface SupportHubScreenProps {
  lang: Language;
  onBack: () => void;
}

export const SupportHubScreen: React.FC<SupportHubScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'help' | 'contact' | 'report'>('help');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="h-full flex flex-col justify-between bg-slate-50 relative overflow-y-auto">
      
      {/* Top Header */}
      <div className="p-3 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button onClick={onBack} className="p-1 rounded-lg text-slate-700 hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-xs text-slate-900">Support Hub & Policies</h3>
        <div className="w-5" />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white px-3 py-1.5 border-b border-slate-200 flex space-x-1 text-[10px] font-bold">
        <button
          onClick={() => { setActiveTab('help'); setSubmitted(false); }}
          className={`flex-1 py-1 rounded-lg text-center ${
            activeTab === 'help' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'text-slate-500'
          }`}
        >
          Help Center
        </button>
        <button
          onClick={() => { setActiveTab('contact'); setSubmitted(false); }}
          className={`flex-1 py-1 rounded-lg text-center ${
            activeTab === 'contact' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'text-slate-500'
          }`}
        >
          Contact Us
        </button>
        <button
          onClick={() => { setActiveTab('report'); setSubmitted(false); }}
          className={`flex-1 py-1 rounded-lg text-center ${
            activeTab === 'report' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'text-slate-500'
          }`}
        >
          Report Issue
        </button>
      </div>

      {/* Main Content */}
      <div className="p-3 space-y-3 flex-1">
        {activeTab === 'help' && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Frequently Asked Questions</h4>

            <div className="space-y-1.5">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-800">How do I find & reserve parking?</p>
                <p className="text-[10px] text-slate-500">Search your destination, pick a spot on the map, select duration, and complete payment.</p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-800">What if I need to cancel?</p>
                <p className="text-[10px] text-slate-500">Free cancellation up to 30 mins before arrival. Instant refund to original payment source.</p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                <p className="text-xs font-bold text-slate-800">How do parking owners list spaces?</p>
                <p className="text-[10px] text-slate-500">Switch to Owner View in Profile Dashboard, tap 'List Your Space', and specify rates.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-2">
            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">Message Sent Successfully!</p>
                <p className="text-[10px] text-emerald-700">Our support team will contact you within 24 hours.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 text-xs"
              >
                <h4 className="font-bold text-slate-900 text-xs">Send Support Message</h4>
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px]"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px]"
                />
                <textarea
                  rows={2}
                  placeholder="How can we help you?"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px]"
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs hover:bg-emerald-900"
                >
                  Send Inquiry
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-2">
            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">Issue Ticket Logged!</p>
                <p className="text-[10px] text-emerald-700">Ticket #IDM-ISSUE-491 has been assigned to support.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 text-xs"
              >
                <h4 className="font-bold text-slate-900 text-xs">Report Parking Issue</h4>
                <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700">
                  <option>Occupied Reserved Spot</option>
                  <option>Payment / Billing Dispute</option>
                  <option>Gate Pass Scan Failure</option>
                  <option>Owner Listing Inaccuracy</option>
                </select>
                <textarea
                  rows={2}
                  placeholder="Describe the issue in detail..."
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px]"
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs hover:bg-emerald-900"
                >
                  Submit Report
                </button>
              </form>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
