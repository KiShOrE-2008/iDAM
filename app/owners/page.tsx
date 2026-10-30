'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';

const SPACE_TYPES = [
  {
    title: 'A house driveway',
    body: 'Empty while you’re at work or away for the weekend? One or two cars can park there and pay you for it.',
    where: 'Independent houses near the temple, markets and schools',
  },
  {
    title: 'A shop or office lot',
    body: 'Offices, wedding halls and complexes often have bays that sit unused at night or on quiet days.',
    where: 'West Masi Street, North Veli Street, the bypass road',
  },
  {
    title: 'Apartment visitor bays',
    body: 'Associations can rent out spare visitor parking on weekdays and put the money back into the building.',
    where: 'Gated communities and residential societies',
  },
  {
    title: 'An empty plot',
    body: 'A fenced plot near a bus stand or the railway station can hold many cars and bikes.',
    where: 'Near Madurai Junction or Mattuthavani Bus Stand',
  },
];

const CONTROLS = [
  { k: 'Your rates', v: 'Set separate hourly rates for cars and bikes, and raise them for festival days or weekends.' },
  { k: 'Your hours', v: 'Choose which days and hours you’re open. Need the space back? Close it for the day in one tap.' },
  { k: 'Just a phone', v: 'Scan drivers’ QR passes with the iDAM app on any Android or iPhone. No machines to install.' },
  { k: 'Known drivers', v: 'Every booking has a signed-in driver, a phone number and a number plate that you check at the gate.' },
];

const REVIEW_STEPS = [
  { title: 'Send your listing', body: 'Add the address, how many cars and bikes fit, your hours and some photos. It takes a few minutes.' },
  { title: 'We review it', body: 'Our team checks the location and that vehicles can get in and out safely. You’ll see “Pending review” meanwhile.' },
  { title: 'Take bookings', body: 'Once approved, your space shows on the map and drivers can book and pay in advance.' },
];

export default function OwnersPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="Earn from the parking space you already have"
      titleTa="உங்களிடம் உள்ள பார்க்கிங் இடத்திலிருந்து சம்பாதியுங்கள்"
      subtitle="Central Madurai has more cars than street space. List your driveway, lot or plot on iDAM and drivers who have already paid will use it."
      subtitleTa="மதுரை மையத்தில் தெருவில் இடம் போதவில்லை. உங்கள் இடத்தை iDAM-இல் பட்டியலிடுங்கள்."
      breadcrumbs={[{ label: 'For space owners' }]}
      lang={lang}
      onLanguageToggle={setLang}
      maxWidthClass="max-w-7xl"
    >
      <div className="space-y-20">
        <div className="flex flex-wrap gap-3 -mt-2">
          <Link href="/list-your-space" className="bg-brand-700 hover:bg-brand-800 text-white font-black px-6 py-3.5 rounded-md">
            List your space
          </Link>
          <Link href="/owner" className="bg-white border border-slate-300 hover:border-ink font-bold px-6 py-3.5 rounded-md">
            See the owner dashboard
          </Link>
        </div>

        <section aria-labelledby="types">
          <h2 id="types" className="text-3xl font-black tracking-tight">What you can list</h2>
          <p className="text-slate-600 mt-2 max-w-2xl">From a single car porch to a fifty-vehicle basement.</p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 border-t-2 border-ink">
            {SPACE_TYPES.map((t, i) => (
              <div
                key={t.title}
                className={`py-7 border-b border-slate-300 ${i % 2 === 0 ? 'md:pr-10 md:border-r' : 'md:pl-10'}`}
              >
                <h3 className="text-xl font-bold">{t.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600 max-w-lg">{t.body}</p>
                <p className="mt-3 text-sm text-slate-500">Good fit: {t.where}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="control" className="bg-brand-700 text-white rounded-xl p-1.5">
          <div className="border-2 border-white/90 rounded-lg p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <h2 id="control" className="text-3xl font-black leading-tight">You decide who parks, when, and for how much</h2>
            </div>
            <dl className="lg:col-span-7 lg:col-start-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {CONTROLS.map((c) => (
                <div key={c.k} className="border-t border-white/30 pt-4">
                  <dt className="font-bold text-lg">{c.k}</dt>
                  <dd className="mt-1.5 text-white/80 leading-relaxed">{c.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="review">
          <h2 id="review" className="text-3xl font-black tracking-tight">From listing to first booking</h2>
          <p className="text-slate-600 mt-2 max-w-2xl">We check every new space so drivers can rely on it.</p>
          <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 border-t-2 border-ink">
            {REVIEW_STEPS.map((s, i) => (
              <li key={s.title} className="pt-6 pb-8 md:pr-8 border-b md:border-b-0 border-slate-300 md:border-r md:last:border-r-0 md:pl-6 md:first:pl-0">
                <span className="block text-5xl font-black text-brand-700 tabular leading-none" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="asphalt text-white rounded-xl overflow-hidden">
          <div className="kerb h-2" aria-hidden />
          <div className="p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black">Ready to list your space?</h2>
              <p className="text-white/70 mt-2">It takes a few minutes. You can change anything later.</p>
            </div>
            <Link href="/list-your-space" className="shrink-0 bg-paint hover:bg-amber-400 text-ink font-black px-6 py-3.5 rounded-md">
              Start your listing
            </Link>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
