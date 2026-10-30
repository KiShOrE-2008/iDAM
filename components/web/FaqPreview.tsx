'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Minus } from 'lucide-react';
import { Language } from '@/types';

interface FaqPreviewProps {
  lang: Language;
}

const previewFaqs = [
  {
    q: 'Is my space really held when I arrive?',
    a: 'Yes. Once payment goes through, one space is set aside for your vehicle for the hours you booked. The owner sees your booking and your number plate before you arrive.',
  },
  {
    q: 'Can I cancel if my plans change?',
    a: 'Cancel up to 30 minutes before your start time and the full amount goes back to the payment method you used.',
  },
  {
    q: 'What do I show at the gate?',
    a: 'Open your pass in the app or on the website. The owner scans the QR code with the iDAM app, which checks the pass and matches your number plate.',
  },
  {
    q: 'How do I list my own parking space?',
    a: 'Use “List your space” and add the address, how many cars and bikes fit, your hourly rates and a few photos. We review each listing before drivers can book it.',
  },
];

export const FaqPreview: React.FC<FaqPreviewProps> = ({ lang }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-slate-300/70 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <h2 className={`text-3xl sm:text-[2.5rem] font-black tracking-tight text-ink leading-tight ${lang === 'ta' ? 'font-tamil' : ''}`}>
            {lang === 'ta' ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Questions drivers ask'}
          </h2>
          <p className="mt-3 text-slate-600">
            More answers on{' '}
            <Link href="/faq" className="font-bold text-brand-700 underline underline-offset-4">
              the help page
            </Link>
            .
          </p>
        </div>

        <div className="lg:col-span-8 border-t-2 border-ink">
          {previewFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="border-b border-slate-300">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-${idx}`}
                    className="w-full py-5 flex items-center justify-between gap-6 text-left text-lg font-bold text-ink cursor-pointer hover:text-brand-700"
                  >
                    {faq.q}
                    {isOpen ? <Minus className="w-5 h-5 shrink-0" aria-hidden /> : <Plus className="w-5 h-5 shrink-0" aria-hidden />}
                  </button>
                </h3>
                {isOpen && (
                  <p id={`faq-${idx}`} className="pb-6 -mt-1 text-[15px] text-slate-600 leading-relaxed max-w-2xl animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
