'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Clock, ShieldCheck, MessageSquare, ArrowRight } from 'lucide-react';

export default function ContactPage() {
  const [lang, setLang] = useState<Language>('en');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bookingId: '',
    category: 'General Question',
    message: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; timestamp: string } | null>(null);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Please provide your full name.';
    if (!formData.email.trim()) {
      errs.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = 'Please provide details with at least 10 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const ticketId = `IDM-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      setIsSubmitting(false);
      setSubmittedTicket({
        id: ticketId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setFormData({
        name: '',
        email: '',
        phone: '',
        bookingId: '',
        category: 'General Question',
        message: ''
      });
    }, 600);
  };

  return (
    <PageContainer
      title="Contact Support & Operations"
      titleTa="தொடர்புக்கு — உதவி மற்றும் ஆதரவு"
      subtitle="Have an inquiry, booking dispute, or space listing question? Reach out to our Madurai operations team."
      subtitleTa="எங்கள் வாடிக்கையாளர் சேவை குழுவை தொடர்பு கொள்ளுங்கள்."
      badge="Customer Support & Partnerships"
      breadcrumbs={[{ label: 'Contact Us' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="space-y-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Direct Support Contacts */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                  Madurai Operations Desk
                </span>
                <h3 className="text-xl font-black text-slate-900">Direct Support Channels</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  We resolve driver queries, booking disputes, and parking host onboarding issues promptly.
                </p>
              </div>

              <div className="space-y-4 text-xs font-bold text-slate-700">
                <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Support</span>
                    <a href="mailto:support@idam.park" className="text-slate-900 font-black hover:text-emerald-700 text-sm">
                      support@idam.park
                    </a>
                    <span className="text-[10px] text-slate-500 block">Response within 2 hours</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Direct Helpline</span>
                    <span className="text-slate-900 font-black text-sm block">+91 452 234 5678</span>
                    <span className="text-[10px] text-slate-500 block">Toll-free 08:00 AM – 10:00 PM IST</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Local Hub Address</span>
                    <span className="text-slate-900 font-black text-xs block">
                      124 West Masi Street, Near Meenakshi Temple, Madurai, Tamil Nadu 625001
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Level Agreement Badge */}
              <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-2xl text-xs text-emerald-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-black">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>SLA Guarantee</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Booking cancellation disputes and obstructed space reports are resolved within 30 minutes during active reservation hours.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
              
              {submittedTicket ? (
                <div className="py-8 text-center space-y-4 animate-scale-in">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10 text-emerald-700" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900">Support Ticket Logged</h3>
                    <p className="text-xs text-emerald-800 font-extrabold font-mono">
                      Reference Code: {submittedTicket.id}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-sm mx-auto text-xs text-slate-600 leading-relaxed font-medium">
                    Thank you! Our operations team has received your inquiry. A confirmation has been recorded and an agent will reply within 2 hours.
                  </div>

                  <button
                    onClick={() => setSubmittedTicket(null)}
                    className="px-6 py-2.5 bg-slate-950 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900">Send Us an Inquiry</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Fill out the form below. All fields marked with * are required.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-800 block">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          errors.name ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                        }`}
                      />
                      {errors.name && <p className="text-[10px] text-rose-600 font-bold">{errors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-800 block">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. ramesh@example.com"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          errors.email ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                        }`}
                      />
                      {errors.email && <p className="text-[10px] text-rose-600 font-bold">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-800 block">
                        Inquiry Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option>General Question</option>
                        <option>Booking & Slot Access Issue</option>
                        <option>Payment or Refund Dispute</option>
                        <option>Space Owner Partnership</option>
                        <option>Technical / App Bug Report</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-800 block">
                        Booking ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.bookingId}
                        onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                        placeholder="e.g. IDM-82931"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-800 block">
                      Message Details *
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please explain your question or issue in detail..."
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        errors.message ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                      }`}
                    />
                    {errors.message && <p className="text-[10px] text-rose-600 font-bold">{errors.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>{isSubmitting ? 'Transmitting Ticket...' : 'Send Message to Operations'}</span>
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </PageContainer>
  );
}
