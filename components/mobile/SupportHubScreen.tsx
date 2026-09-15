'use client';

import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, AlertTriangle, ShieldCheck, ChevronRight, FileText, CheckCircle2, MessageSquare, Send, Bot, Sparkles } from 'lucide-react';
import { Language } from '@/types';

interface SupportHubScreenProps {
  lang: Language;
  onBack: () => void;
}

export const SupportHubScreen: React.FC<SupportHubScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'help' | 'chat' | 'report'>('help');
  const [submitted, setSubmitted] = useState(false);

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Hello! I am iDAM AI Support Assistant. How can I help with your parking reservation today?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      let botReply = 'I can help with that! Free cancellation is allowed up to 30 mins before arrival. Would you like me to open your active passes?';
      if (userMsg.toLowerCase().includes('refund') || userMsg.toLowerCase().includes('cancel')) {
        botReply = 'Instant refunds are credited back to your original payment method within 15 minutes of cancellation!';
      } else if (userMsg.toLowerCase().includes('owner') || userMsg.toLowerCase().includes('space')) {
        botReply = 'To list your space, switch to Owner View in your Profile dashboard and tap Add Property!';
      }
      setChatMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-slate-50 relative overflow-y-auto animate-fade-in">
      
      {/* Top Header */}
      <div className="p-3.5 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button onClick={onBack} className="p-1 rounded-lg text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-black text-xs text-slate-900">Support Hub & Policies</h3>
        <div className="w-5" />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white px-3 py-2 border-b border-slate-200 flex space-x-1.5 text-xs font-black">
        <button
          onClick={() => { setActiveTab('help'); setSubmitted(false); }}
          className={`flex-1 py-1.5 rounded-xl text-center transition-all ${
            activeTab === 'help' ? 'bg-emerald-950 text-white shadow-xs' : 'text-slate-600 bg-slate-100'
          }`}
        >
          FAQs
        </button>
        <button
          onClick={() => { setActiveTab('chat'); setSubmitted(false); }}
          className={`flex-1 py-1.5 rounded-xl text-center transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'chat' ? 'bg-emerald-950 text-white shadow-xs' : 'text-slate-600 bg-slate-100'
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-emerald-400" />
          <span>AI Assistant</span>
        </button>
        <button
          onClick={() => { setActiveTab('report'); setSubmitted(false); }}
          className={`flex-1 py-1.5 rounded-xl text-center transition-all ${
            activeTab === 'report' ? 'bg-emerald-950 text-white shadow-xs' : 'text-slate-600 bg-slate-100'
          }`}
        >
          Report Ticket
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {activeTab === 'help' && (
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Frequently Asked Questions</h4>

            <div className="space-y-2 text-xs font-medium">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1 shadow-2xs">
                <p className="font-black text-slate-900">How do I reserve a parking spot?</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">Select your destination on the map, choose your spot (Car/EV/Valet), pick date & duration, and complete instant payment.</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1 shadow-2xs">
                <p className="font-black text-slate-900">What if I need to cancel my reservation?</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">Free cancellation up to 30 minutes before start time with instant 100% refund to original UPI or Card source.</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1 shadow-2xs">
                <p className="font-black text-slate-900">How do space owners monetize parking?</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">Switch to Owner View in Profile, list your empty driveway or lot, set hourly pricing, and accept real-time bookings.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col justify-between space-y-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs min-h-[360px]">
            <div className="space-y-2 overflow-y-auto max-h-[300px] p-1">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-2xl text-xs ${
                      msg.sender === 'user'
                        ? 'bg-emerald-950 text-white font-semibold rounded-br-none'
                        : 'bg-slate-100 text-slate-800 font-medium rounded-bl-none border border-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask AI Support..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="bg-emerald-950 text-white p-2 rounded-xl hover:bg-emerald-900 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="space-y-3">
            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl text-center space-y-2 animate-scale-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-black text-emerald-900">Issue Ticket Logged!</p>
                <p className="text-xs text-emerald-700">Ticket #IDM-ISSUE-491 has been created. Response within 2 hours.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs shadow-2xs"
              >
                <h4 className="font-black text-slate-900 text-xs">Report Parking Issue Ticket</h4>
                <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800">
                  <option>Occupied Reserved Spot</option>
                  <option>Payment / Billing Dispute</option>
                  <option>QR Scanner Failure</option>
                  <option>Listing Location Inaccuracy</option>
                </select>
                <textarea
                  rows={3}
                  placeholder="Describe your issue in detail..."
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-950 text-white font-extrabold py-3 rounded-xl text-xs hover:bg-emerald-900 shadow-md"
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
