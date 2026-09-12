'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Car,
  Calendar,
  CreditCard,
  Building2,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SupportHubNav } from '@/components/shared/SupportHubNav';
import { Language } from '@/types';

// Help Center FAQ Data
const HELP_CATEGORIES = [
  {
    id: 'finding-parking',
    title: 'Finding Parking',
    icon: Car,
    badgeColor: 'bg-emerald-100 text-emerald-800',
    questions: [
      {
        q: 'How do I find a parking space?',
        a: 'Open the IDAM Explore Map or Home page search bar. Enter your destination in Madurai (e.g. Meenakshi Temple, Periyar Bus Stand, Railway Junction) to view interactive OpenStreetMap pins with live rates and available spots.'
      },
      {
        q: 'How do I search near my destination?',
        a: 'Use the location search input on the top header or allow browser location permission to automatically display available parking locations within walking distance of your current spot.'
      },
      {
        q: 'How do I check parking availability?',
        a: 'Each spot marker displays real-time available capacity (e.g., 8 free spots). Green badges indicate active open availability, while updated counts sync live with gate hardware.'
      },
      {
        q: 'Can I filter parking by vehicle type and price?',
        a: 'Yes! Toggle between "Car" or "Bike" filters on the Explore map, or sort results by distance (meters) and hourly rate (₹/hr).'
      }
    ]
  },
  {
    id: 'booking',
    title: 'Booking',
    icon: Calendar,
    badgeColor: 'bg-blue-100 text-blue-800',
    questions: [
      {
        q: 'How do I reserve a parking space?',
        a: 'Select a location on the map, choose your vehicle type, select date and duration, and click "Book Space". Once confirmed, a digital QR pass (e.g. IDM-82931) is generated instantly.'
      },
      {
        q: 'Can I change my booking?',
        a: 'You can modify or reschedule active bookings from your Driver Dashboard prior to the arrival start time.'
      },
      {
        q: 'Where can I find my booking details?',
        a: 'All confirmed digital passes, QR codes, and entry directions are stored in your Profile Dashboard under "Active Passes" or "My Passes".'
      },
      {
        q: 'What happens if I arrive late?',
        a: 'Your reserved spot remains held for your booking duration. However, check-out time remains fixed unless extended from your dashboard.'
      }
    ]
  },
  {
    id: 'payment-refunds',
    title: 'Payment & Refunds',
    icon: CreditCard,
    badgeColor: 'bg-amber-100 text-amber-800',
    questions: [
      {
        q: 'What payment methods are supported?',
        a: 'IDAM supports all major Indian payment methods including UPI (GPay, PhonePe, Paytm), Net Banking, and Debit/Credit Cards. (Note: In demo environments, payments are simulated).'
      },
      {
        q: 'How are parking fees calculated?',
        a: 'Fees are calculated based on hourly tariffs (e.g. ₹40/hr for Cars, ₹20/hr for Bikes) plus applicable platform convenience fee and GST (18%).'
      },
      {
        q: 'How do I cancel a booking?',
        a: 'Go to your Profile Dashboard, click on your active booking, and select "Cancel Pass". Cancellations made >1 hour prior to start time receive a 100% fare refund.'
      },
      {
        q: 'When will I receive my refund?',
        a: 'Approved refunds are credited back to your original payment account within 3-5 business days.'
      }
    ]
  },
  {
    id: 'parking-owners',
    title: 'Parking Owners',
    icon: Building2,
    badgeColor: 'bg-purple-100 text-purple-800',
    questions: [
      {
        q: 'How can I list my parking space?',
        a: 'Click "List Your Space" in the top navigation bar or switch to Owner Mode on your Profile Dashboard to submit location details, photos, and capacity.'
      },
      {
        q: 'How do I set my price?',
        a: 'You have complete flexibility to set hourly rates for Cars and Bikes based on local demand and location prominence.'
      },
      {
        q: 'How do I manage availability?',
        a: 'The Owner Dashboard gives you real-time controls to open, close, or reserve spots for specific hours.'
      },
      {
        q: 'How do I receive my earnings?',
        a: 'Earnings are automatically accumulated and transferred directly to your linked bank account or UPI ID on weekly/monthly cycles.'
      }
    ]
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    icon: ShieldCheck,
    badgeColor: 'bg-slate-100 text-slate-800',
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'IDAM uses passwordless OTP mobile sign-in. Simply enter your mobile phone number on the login page to receive a 4-digit verification code.'
      },
      {
        q: 'How do I update my profile?',
        a: 'Visit your Profile Dashboard to edit your name, phone number, vehicle registration number, and preferences.'
      },
      {
        q: 'How does IDAM protect my information?',
        a: 'IDAM uses SSL encryption and strict data protection standards. Payment processing is handled by PCI-DSS compliant payment gateways.'
      },
      {
        q: 'How do I report suspicious activity?',
        a: 'Use our "Report an Issue" page to flag unauthorized space listings, payment discrepancies, or suspicious user behavior.'
      }
    ]
  }
];

export default function HelpCenterPage() {
  const [lang, setLang] = useState<Language>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [openQuestionIndex, setOpenQuestionIndex] = useState<string | null>('finding-parking-0');

  const toggleQuestion = (id: string) => {
    setOpenQuestionIndex(openQuestionIndex === id ? null : id);
  };

  const filteredCategories = HELP_CATEGORIES.map(cat => {
    const questions = cat.questions.filter(
      item =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, questions };
  }).filter(cat => cat.questions.length > 0);

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
        
        {/* Unified Support Hub Nav Header */}
        <SupportHubNav activeTab="help" />

        {/* Search Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-200/80 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            How can we help?
          </h2>
          <p className="text-xs text-gray-500 font-medium max-w-xl mx-auto">
            Welcome to the IDAM Help Center. Find quick answers about discovering, booking, and managing parking across Madurai.
          </p>

          {/* Interactive Search Bar */}
          <div className="relative max-w-xl mx-auto pt-2">
            <Search className="w-5 h-5 absolute left-4 top-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search e.g. cancellation, invoice, map, payment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-600 shadow-xs"
            />
          </div>
        </div>

        {/* Help Categories Accordion Sections */}
        <div className="space-y-8">
          {filteredCategories.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-gray-200">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900">No matching questions found</h3>
              <p className="text-xs text-gray-500 font-medium">
                Try searching with a different keyword or browse our support categories below.
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.id}
                  className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200/80 space-y-4"
                >
                  <div className="flex items-center space-x-3 border-b border-gray-100 pb-4">
                    <div className={`p-2.5 rounded-2xl ${category.badgeColor}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900">
                      {category.title}
                    </h3>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {category.questions.map((item, index) => {
                      const qId = `${category.id}-${index}`;
                      const isOpen = openQuestionIndex === qId;

                      return (
                        <div key={index} className="py-3.5">
                          <button
                            onClick={() => toggleQuestion(qId)}
                            className="w-full text-left flex items-center justify-between font-extrabold text-sm text-gray-900 hover:text-emerald-800 transition-colors py-1"
                          >
                            <span>{item.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-emerald-700 shrink-0 ml-2" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                            )}
                          </button>

                          {isOpen && (
                            <p className="text-xs text-gray-600 font-medium leading-relaxed mt-2 pl-1 animate-in fade-in duration-150">
                              {item.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Still Need Help CTA Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-3xl p-8 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-extrabold">Still need help?</h3>
            <p className="text-xs text-slate-300 font-medium">
              Contact our support team and we will assist you right away.
            </p>
          </div>

          <Link
            href="/contact"
            className="bg-white text-emerald-950 font-bold text-xs px-6 py-3.5 rounded-2xl shadow-lg hover:bg-emerald-50 transition-all flex items-center space-x-2 shrink-0"
          >
            <span>Contact Support</span>
            <ArrowRight className="w-4 h-4 text-emerald-800" />
          </Link>
        </div>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
