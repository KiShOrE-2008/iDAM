'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, HelpCircle } from 'lucide-react';
import { Language } from '@/types';

interface FaqPreviewProps {
  lang: Language;
}

export const FaqPreview: React.FC<FaqPreviewProps> = ({ lang }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const previewFaqs = [
    {
      q: 'How does advance parking discovery and reservation work on iDAM?',
      a: 'iDAM maps verified parking lots, commercial basements, and private driveways in real-time. Simply search your destination, pick your preferred slot, choose duration, and pay instantly. Your slot is guaranteed when you arrive.'
    },
    {
      q: 'Can I cancel my reservation if my plans change?',
      a: 'Yes. iDAM provides free cancellation up to 30 minutes before your reserved start time. 100% of your booking amount is instantly refunded back to your original payment method.'
    },
    {
      q: 'How do space owners verify my booking at the entrance?',
      a: 'When you arrive, display the digital QR pass from the app. The attendant or space owner scans your pass using the iDAM Owner Scanner, performing an instant cryptographic check against your vehicle plate.'
    },
    {
      q: 'How do property owners list empty spaces and monetize them?',
      a: 'Property owners can apply via our "List Your Space" wizard in under 3 minutes. Specify your address, capacity (cars/bikes), hourly rates, and photos. Once reviewed, your space goes live to thousands of Madurai drivers.'
    }
  ];

  return (
    <section className="py-16 sm:py-20 bg-white border-t border-slate-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-900 border border-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-black">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-500 font-medium max-w-xl mx-auto">
            Everything you need to know about finding guaranteed spots, digital QR passes, and owner monetization.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3 max-w-3xl mx-auto">
          {previewFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#F8F8F5] rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-xs sm:text-sm font-black text-slate-900 hover:bg-slate-100/60 transition-colors cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-emerald-700' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* View All FAQ CTA */}
        <div className="text-center pt-2">
          <Link
            href="/faq"
            className="inline-flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs px-6 py-3 rounded-full shadow-md transition-all active:scale-95"
          >
            <span>View All Help & FAQ Categories</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </Link>
        </div>

      </div>
    </section>
  );
};
