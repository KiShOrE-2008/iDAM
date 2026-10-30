'use client';

import React from 'react';
import Link from 'next/link';
import { Language } from '@/types';
import { BrandMark } from '@/components/shared/BrandMark';

interface FooterProps {
  lang: Language;
}

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'iDAM',
    links: [
      ['/about', 'About'],
      ['/how-it-works', 'How it works'],
      ['/features', 'Features'],
      ['/explore', 'Find parking'],
    ],
  },
  {
    title: 'Space owners',
    links: [
      ['/owners', 'Why list with iDAM'],
      ['/list-your-space', 'List your space'],
      ['/owner-policy', 'Owner policy'],
      ['/owner', 'Owner dashboard'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['/faq', 'Help and FAQ'],
      ['/contact', 'Contact support'],
      ['/report-issue', 'Report a problem'],
      ['/accessibility', 'Accessibility'],
      ['/security', 'Security'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['/terms', 'Terms of service'],
      ['/privacy-policy', 'Privacy policy'],
      ['/cancellation-refund', 'Cancellations and refunds'],
      ['/cookie-policy', 'Cookies'],
      ['/privacy-requests', 'Privacy requests'],
      ['/account-deletion', 'Delete your account'],
    ],
  },
];

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  return (
    <footer className="bg-asphalt text-white/75">
      <div className="kerb h-2" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-x-8 gap-y-10">
          <div className="col-span-2">
            <Link href="/" aria-label="iDAM home">
              <BrandMark size={38} inverted />
            </Link>
            <p className={`mt-5 text-sm leading-relaxed max-w-xs ${lang === 'ta' ? 'font-tamil' : ''}`}>
              {lang === 'ta'
                ? 'மதுரையில் பார்க்கிங்கை முன்கூட்டியே தேடி, முன்பதிவு செய்து, செலுத்துங்கள்.'
                : 'Find, book and pay for parking in Madurai before you leave home.'}
            </p>
            <p className="font-tamil mt-3 text-sm text-amber-300 font-semibold">இடம் தேடு. நிறுத்து. போ.</p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-bold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-white hover:underline underline-offset-4">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-white/15 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/55">
          <p>© 2026 iDAM. Made in Madurai.</p>
          <p className="max-w-xl sm:text-right">
            Spaces, prices and payments shown in demo mode are sample data for evaluation.
          </p>
        </div>
      </div>
    </footer>
  );
};
