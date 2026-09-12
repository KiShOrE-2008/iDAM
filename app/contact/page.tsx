'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SupportHubNav } from '@/components/shared/SupportHubNav';
import { Language } from '@/types';

export default function ContactPage() {
  const [lang, setLang] = useState<Language>('en');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bookingId: '',
    subject: 'Booking',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({
        name: '',
        email: '',
        bookingId: '',
        subject: 'Booking',
        message: '',
      });
    }, 700);
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
        
        {/* Unified Support Hub Nav */}
        <SupportHubNav activeTab="contact" />

        {/* Page Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            We're here to help.
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Have a question, problem, or suggestion? Reach out to the IDAM team.
          </p>
        </div>

        {/* Quick Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email</p>
              <a href="mailto:support@idam.example" className="text-sm font-extrabold text-gray-900 hover:text-emerald-800 transition-colors">
                support@idam.example
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone</p>
              <p className="text-sm font-extrabold text-gray-900">
                +91 98765 43210
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-800 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location</p>
              <p className="text-sm font-extrabold text-gray-900">
                Tamil Nadu, India
              </p>
            </div>
          </div>
        </div>

        {/* Send us a message form */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-200/80 space-y-6 max-w-3xl mx-auto">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xl font-extrabold text-gray-900">Send us a message</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Fill out the form below and our team will get back to you promptly.
            </p>
          </div>

          {isSuccess ? (
            <div className="py-10 text-center space-y-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-700" />
              </div>
              <h4 className="text-2xl font-extrabold text-gray-900">Message Sent Successfully!</h4>
              <p className="text-xs text-gray-600 font-medium max-w-md mx-auto">
                Thank you for contacting IDAM. Our support team will review your query and respond shortly.
              </p>
              <button
                onClick={() => setIsSuccess(false)}
                className="bg-emerald-950 text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-emerald-900 transition-colors"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Booking ID (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. IDM-82931"
                    value={formData.bookingId}
                    onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs font-mono bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs bg-gray-50/50"
                  >
                    <option value="Booking">Booking</option>
                    <option value="Payment">Payment</option>
                    <option value="Cancellation / Refund">Cancellation / Refund</option>
                    <option value="Parking Owner">Parking Owner</option>
                    <option value="Account">Account</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us how we can help..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 text-xs bg-gray-50/50"
                />
              </div>

              {/* Callout Notice */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-emerald-950 text-xs leading-relaxed font-medium flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  For urgent parking issues, include your <strong>Booking ID</strong> so our team can identify your reservation quickly.
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 text-xs transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Message...' : 'Send Message →'}</span>
              </button>
            </form>
          )}
        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
