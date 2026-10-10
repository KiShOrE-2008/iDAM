'use client';

import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, AlertTriangle, ShieldCheck, ChevronRight, ChevronDown, FileText, CheckCircle2, MessageSquare, Send, Bot, Sparkles, Phone, Clock } from 'lucide-react';
import { Language } from '@/types';
import { useRegisterModal } from '@/context/BackNavigationContext';

interface SupportHubScreenProps {
  lang: Language;
  onBack: () => void;
}

export const SupportHubScreen: React.FC<SupportHubScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'help' | 'chat' | 'report'>('help');
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; category: string } | null>(null);

  // Accordion state for FAQs
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Hello! I am iDAM AI Support Assistant. How can I help with your parking reservation today?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState('Occupied Reserved Spot');
  const [ticketDetails, setTicketDetails] = useState('');
  const [ticketContact, setTicketContact] = useState('');

  // Android Back navigation: if in chat or report tab, Back brings user back to FAQs first
  useRegisterModal(
    activeTab !== 'help',
    () => {
      setActiveTab('help');
      setSubmittedTicket(null);
    },
    'support-hub-subtab'
  );

  const faqs = [
    {
      q: 'How do I reserve a parking spot?',
      a: 'Select your destination on the map, choose your spot (Car/EV/Valet), pick date & duration, and complete instant payment via Razorpay or Instant UPI fast-track.'
    },
    {
      q: 'What if I need to cancel my reservation?',
      a: 'Free cancellation is allowed up to 30 minutes before your scheduled start time. Instant 100% refund is credited back to your original payment method within minutes.'
    },
    {
      q: 'How do space owners verify my pass?',
      a: 'When you arrive at the parking facility, show your encrypted QR pass from the "My Passes" tab. The facility attendant or owner scans it with the iDAM Owner Scanner for instant validation and check-in.'
    },
    {
      q: 'Can I extend my parking duration after arrival?',
      a: 'Yes, if the spot has no conflicting reservations immediately following your slot, you can extend directly from the My Passes screen by tapping "Extend Slot".'
    },
    {
      q: 'How do property owners monetize their spaces?',
      a: 'Switch to Owner Portal from your Profile dashboard or tap "List Your Space". Submit your location details and hourly pricing to start accepting verified bookings.'
    }
  ];

  const handleSendMessage = (textToSend?: string) => {
    const userMsg = textToSend || chatInput;
    if (!userMsg.trim()) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    if (!textToSend) setChatInput('');

    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let botReply = 'I can help with that! Free cancellation is allowed up to 30 mins before arrival. Would you like to check your active passes?';
      if (lower.includes('refund') || lower.includes('cancel')) {
        botReply = 'Instant refunds are credited back to your original payment method within 15 minutes of cancellation with 0 cancellation fees!';
      } else if (lower.includes('owner') || lower.includes('space') || lower.includes('list')) {
        botReply = 'To list your space, switch to Owner Portal in your Profile tab and submit your driveway or parking lot details!';
      } else if (lower.includes('ev') || lower.includes('charge')) {
        botReply = 'EV fast charging spots include standard Type 2 AC or 30kW DC CCS2 plugs. You can filter for EV spots on the live map!';
      } else if (lower.includes('qr') || lower.includes('scan') || lower.includes('pass')) {
        botReply = 'Your QR pass is cryptographically signed and stored in My Passes. Simply present it to the lot attendant upon entry.';
      }
      setChatMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    }, 700);
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const randomTicketId = `IDM-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedTicket({
      id: randomTicketId,
      category: ticketCategory
    });
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F8F5] relative overflow-y-auto no-scrollbar animate-fade-in text-slate-900 select-none">
      
      {/* Top Header */}
      <div className="p-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button
          onClick={onBack}
          className="p-1 rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
          Support Hub & Help Center
        </h3>
        <div className="w-5" />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white px-3 py-2 border-b border-slate-200/80 flex space-x-1.5 text-xs font-black">
        <button
          onClick={() => { setActiveTab('help'); setSubmittedTicket(null); }}
          className={`flex-1 py-2 rounded-xl text-center transition-all ${
            activeTab === 'help' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          FAQs
        </button>
        <button
          onClick={() => { setActiveTab('chat'); setSubmittedTicket(null); }}
          className={`flex-1 py-2 rounded-xl text-center transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'chat' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-emerald-400" />
          <span>AI Assistant</span>
        </button>
        <button
          onClick={() => { setActiveTab('report'); setSubmittedTicket(null); }}
          className={`flex-1 py-2 rounded-xl text-center transition-all ${
            activeTab === 'report' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          Report Ticket
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-3.5 flex-1 flex flex-col">
        {activeTab === 'help' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Frequently Asked Questions
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                24/7 Verified
              </span>
            </div>

            <div className="space-y-2 text-xs font-medium">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3.5 flex items-center justify-between text-left text-xs font-black text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <span className="pr-2">{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-600' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-0 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Emergency Hotline Card */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-black text-slate-900">Direct Support Hotline</h5>
                  <p className="text-[10px] text-emerald-900 font-semibold">Toll-free 1800-419-IDAM (9 AM - 9 PM)</p>
                </div>
              </div>
              <span className="text-emerald-800 font-black text-[11px]">Call</span>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col justify-between space-y-3 bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-md min-h-[380px]">
            <div className="space-y-2.5 overflow-y-auto max-h-[290px] p-1 no-scrollbar">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-950 text-white font-semibold rounded-br-none shadow-xs'
                        : 'bg-slate-100 text-slate-800 font-medium rounded-bl-none border border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Suggestion Prompts */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {['How to cancel booking?', 'EV charging availability', 'How do owners list space?'].map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold shrink-0 border border-slate-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask iDAM AI assistant..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSendMessage()}
                className="bg-slate-950 hover:bg-slate-900 text-white p-2.5 rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-3">
            {submittedTicket ? (
              <div className="bg-white border border-emerald-300 p-6 rounded-3xl text-center space-y-3 shadow-md animate-scale-in">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">Issue Ticket Logged</h4>
                  <p className="text-xs text-emerald-800 font-extrabold mt-0.5">Reference Code: {submittedTicket.id}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our operations team has received your ticket regarding <span className="font-bold text-slate-800">{submittedTicket.category}</span>. We will review and respond within 2 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmittedTicket(null);
                    setTicketDetails('');
                  }}
                  className="px-4 py-2 bg-slate-950 text-white font-black text-xs rounded-xl shadow-xs"
                >
                  Log Another Issue
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleTicketSubmit}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 space-y-3.5 text-xs shadow-md"
              >
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Report Parking Issue Ticket</h4>
                  <p className="text-[11px] text-slate-500 font-medium">We resolve driver and owner disputes promptly</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Issue Category
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option>Occupied Reserved Spot</option>
                    <option>Payment / Billing Dispute</option>
                    <option>QR Scanner Failure</option>
                    <option>Listing Location Inaccuracy</option>
                    <option>EV Charger Malfunction</option>
                    <option>Other Feedback</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Issue Description
                  </label>
                  <textarea
                    rows={3}
                    value={ticketDetails}
                    onChange={(e) => setTicketDetails(e.target.value)}
                    placeholder="Provide details about what went wrong at the parking spot..."
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Contact Email or Phone
                  </label>
                  <input
                    type="text"
                    value={ticketContact}
                    onChange={(e) => setTicketContact(e.target.value)}
                    placeholder="e.g. driver@idam.park or +91 98765 43210"
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black py-3 rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  Submit Ticket
                </button>
              </form>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
