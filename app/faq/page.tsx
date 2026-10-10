'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Search, ChevronDown, Car, Calendar, CreditCard, QrCode, Building2, Shield, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';

export default function FaqPage() {
  const [lang, setLang] = useState<Language>('en');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ 'find-1': true });

  const categories = [
    { id: 'all', label: 'All FAQs', icon: Search },
    { id: 'finding', label: 'Finding Parking', icon: Car },
    { id: 'reservations', label: 'Reservations & Slots', icon: Calendar },
    { id: 'payments', label: 'Payments & Refunds', icon: CreditCard },
    { id: 'qr-passes', label: 'QR Passes & Check-In', icon: QrCode },
    { id: 'listing', label: 'Listing a Space', icon: Building2 },
    { id: 'account', label: 'Account & Privacy', icon: Shield }
  ];

  const faqData = [
    // 1. Finding parking
    {
      id: 'find-1',
      cat: 'finding',
      q: 'How do I search for parking near my destination in Madurai?',
      a: 'Open the Explore Map or use the search bar on our homepage. Enter key Madurai landmarks such as Meenakshi Amman Temple, Madurai Railway Junction, or Mattuthavani. The map calculates exact walking distance and shows verified available spots.',
      linkText: 'Open Live Explore Map',
      linkHref: '/explore'
    },
    {
      id: 'find-2',
      cat: 'finding',
      q: 'Can I filter parking spots for EV Charging or Two-Wheelers?',
      a: 'Yes. On the Explore Map, tap the vehicle filter chips (All, Car, Bike, or EV ⚡). EV spots indicate connector availability, while bike bays display specialized two-wheeler rates.'
    },
    {
      id: 'find-3',
      cat: 'finding',
      q: 'Are parking spots open 24/7 or only during business hours?',
      a: 'Operating hours vary by location and are set by each space owner. When selecting a lot, the operating window (e.g. 08:00 AM – 10:00 PM or 24/7) is clearly visible on the details card.'
    },

    // 2. Reservations and time slots
    {
      id: 'res-1',
      cat: 'reservations',
      q: 'How far in advance can I reserve a parking spot?',
      a: 'You can reserve spots up to 4 days in advance through the date picker, or book on-demand for immediate arrival. Your spot is held for 15 minutes beyond your scheduled start time.',
      linkText: 'Check Active Passes',
      linkHref: '/my-bookings'
    },
    {
      id: 'res-2',
      cat: 'reservations',
      q: 'Can I extend my reservation duration after arriving?',
      a: 'Yes, if no conflicting driver has reserved the same bay immediately after your slot. Open your active pass under "My Passes" and tap "Extend Slot".'
    },
    {
      id: 'res-3',
      cat: 'reservations',
      q: 'What happens if my assigned bay is blocked or occupied upon arrival?',
      a: 'In the rare event of an obstructed bay, tap "Report Issue" in your digital pass or call our helpline immediately. We will assign an alternative bay or issue an instant 100% refund.',
      linkText: 'Report Issue Form',
      linkHref: '/contact'
    },

    // 3. Payments and refunds
    {
      id: 'pay-1',
      cat: 'payments',
      q: 'What payment methods does iDAM accept?',
      a: 'iDAM supports all major Indian payment methods through Razorpay: UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards (Visa, MasterCard, RuPay), and Net Banking. In-app iDAM Wallet is also supported.',
      linkText: 'Read Refund Policy',
      linkHref: '/cancellation-refund'
    },
    {
      id: 'pay-2',
      cat: 'payments',
      q: 'What is the cancellation policy and how fast are refunds processed?',
      a: 'Free cancellation is allowed up to 30 minutes before your scheduled start time. 100% of your booking amount is refunded instantly to your original payment method (or iDAM Wallet) with 0 fees.',
      linkText: 'View Cancellation & Refund Terms',
      linkHref: '/cancellation-refund'
    },
    {
      id: 'pay-3',
      cat: 'payments',
      q: 'Are there surge pricing or hidden platform charges?',
      a: 'No surge pricing. What you see on the transparent quote breakdown (hourly rate + GST + 2% platform security fee) is exactly what you pay.'
    },

    // 4. QR passes and check-in
    {
      id: 'qr-1',
      cat: 'qr-passes',
      q: 'How does the digital QR parking pass work?',
      a: 'Upon payment confirmation, a unique, cryptographically signed QR pass is generated in your app. It contains your vehicle plate number, bay identifier, and reservation window.',
      linkText: 'Learn How Pass Security Works',
      linkHref: '/how-it-works'
    },
    {
      id: 'qr-2',
      cat: 'qr-passes',
      q: 'What if my smartphone battery dies or camera is damaged?',
      a: 'Every digital pass features a human-readable alphanumeric code (e.g. #IDM-82931). You can verbally provide this reference code to the attendant for manual entry.'
    },
    {
      id: 'qr-3',
      cat: 'qr-passes',
      q: 'Can someone else screenshot and reuse my QR pass?',
      a: 'No. Passes use one-way SHA-256 hash validation and are locked immediately upon the first check-in scan. Duplicate scans are flagged as already used.'
    },

    // 5. Listing a parking space
    {
      id: 'list-1',
      cat: 'listing',
      q: 'Who can list a parking space on iDAM?',
      a: 'Any property owner, tenant with leasing rights, commercial complex, or association with vacant parking slots in Madurai can apply. Residential driveways, empty plots, and basements are all eligible.',
      linkText: 'Start Listing Application',
      linkHref: '/list-your-space'
    },
    {
      id: 'list-2',
      cat: 'listing',
      q: 'How long does listing review and approval take?',
      a: 'Listing applications are placed in "Pending Review" status. Our local operations team verifies coordinates and safety within 24 to 48 hours before activating the space on the live map.'
    },
    {
      id: 'list-3',
      cat: 'listing',
      q: 'How do space owners receive their earnings payouts?',
      a: 'Earnings accumulate in your Owner Portal and are transferred weekly directly to your verified bank account or UPI ID with complete transaction ledgers.'
    },

    // 6. Account and privacy
    {
      id: 'acc-1',
      cat: 'account',
      q: 'Do I need to create an account to browse parking spaces?',
      a: 'No. Anyone can search destinations, view live lot availability, and compare hourly rates without an account. An account is only required when completing a reservation to tie your vehicle plate to your pass.'
    },
    {
      id: 'acc-2',
      cat: 'account',
      q: 'How is my personal data and vehicle number protected?',
      a: 'We adhere to the Digital Personal Data Protection (DPDP) Act. We never sell vehicle registration plates or phone numbers to third-party advertisers. Data is encrypted in transit (TLS 1.3) and at rest.',
      linkText: 'Read Full Privacy Policy',
      linkHref: '/privacy-policy'
    },
    {
      id: 'acc-3',
      cat: 'account',
      q: 'Can I permanently delete my account and garage records?',
      a: 'Yes. You can request immediate permanent deletion of your account, vehicle garage, and transaction history at any time via our Account Deletion portal.',
      linkText: 'Account Deletion Portal',
      linkHref: '/account-deletion'
    }
  ];

  const filteredFaqs = useMemo(() => {
    return faqData.filter(item => {
      const matchesCat = activeCategory === 'all' || item.cat === activeCategory;
      const matchesSearch = !searchQuery.trim() || 
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [faqData, activeCategory, searchQuery]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <PageContainer
      title="Help Center & Frequently Asked Questions"
      titleTa="உதவி மையம் மற்றும் அடிக்கடி கேட்கப்படும் கேள்விகள்"
      subtitle="Find clear answers about discovering spots, digital QR passes, cancellation refunds, and owner monetization."
      subtitleTa="பார்க்கிங் முன்பதிவு, கட்டணம் மற்றும் ரத்து செய்தல் குறித்த தகவல்கள்."
      badge="Comprehensive Knowledge Hub"
      breadcrumbs={[{ label: 'Help & FAQ' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="space-y-10">

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g. refund, QR code, EV, listing, cancellation)..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Pills Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((c) => {
            const Icon = c.icon;
            const isActive = activeCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-slate-200">
              <p className="text-sm font-black text-slate-900">No matching questions found.</p>
              <p className="text-xs text-slate-500">Try searching with a different keyword or contact our support team directly.</p>
              <Link
                href="/contact"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black"
              >
                <span>Contact Support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = !!openItems[faq.id];
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-xs sm:text-sm font-black text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-700' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 space-y-3">
                      <p>{faq.a}</p>
                      {faq.linkText && faq.linkHref && (
                        <div>
                          <Link
                            href={faq.linkHref}
                            className="inline-flex items-center space-x-1 text-xs font-black text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            <span>{faq.linkText}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Still Have Questions Contact Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-xl font-black text-emerald-950">Still Have Questions?</h3>
            <p className="text-xs sm:text-sm text-emerald-800 font-medium">
              Our local Madurai operations team is available 7 days a week to assist drivers and space owners.
            </p>
          </div>

          <Link
            href="/contact"
            className="bg-slate-950 hover:bg-slate-900 text-white font-black px-6 py-3 rounded-2xl text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <span>Send Us a Message</span>
          </Link>
        </div>

      </div>
    </PageContainer>
  );
}
