'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';

type Step = { title: string; body: string; link?: { href: string; label: string } };

const DRIVER_STEPS: Step[] = [
  {
    title: 'Search where you’re going',
    body: 'Type a landmark such as Meenakshi Temple, Madurai Junction or Mattuthavani. You see parking within walking distance and how many spaces are free right now.',
    link: { href: '/explore', label: 'Open the map' },
  },
  {
    title: 'Pick a time and vehicle',
    body: 'Choose car or bike, the day, when you’ll arrive and how many hours you need. Extras like EV charging are optional.',
  },
  {
    title: 'Pay once, get your pass',
    body: 'The price is itemised before you pay, with no surge pricing. Pay through Razorpay with UPI, a card or net banking, and your QR pass appears straight away.',
  },
  {
    title: 'Show the pass at the gate',
    body: 'Follow directions to the place. The owner scans your QR code and checks your number plate, and you park.',
  },
];

const OWNER_STEPS: Step[] = [
  {
    title: 'Tell us about your space',
    body: 'Add the address, how many cars and bikes fit, your opening hours, rates and a few photos.',
    link: { href: '/list-your-space', label: 'Start a listing' },
  },
  {
    title: 'We check it',
    body: 'Our team confirms the location and that vehicles can get in and out safely. Approved spaces go live on the map.',
  },
  {
    title: 'Run it from your phone',
    body: 'See today’s earnings and expected arrivals, change rates, or close the space for a day whenever you need it back.',
  },
  {
    title: 'Scan passes, get paid',
    body: 'Scan each driver’s pass with the iDAM app. Payments reach your bank account daily.',
  },
];

const SAFEGUARDS = [
  {
    title: 'Codes can’t be guessed',
    body: 'Each pass carries a long random token, not a running number, so one pass can’t be used to work out another.',
  },
  {
    title: 'We never store the code itself',
    body: 'Only a one-way fingerprint of the token is kept. A scanned pass is matched against it and against the booking’s place and time.',
  },
  {
    title: 'Each pass works once',
    body: 'After check-in the booking is marked as parked. A screenshot of the same pass is flagged on the next scan.',
  },
];

const StepList: React.FC<{ steps: Step[] }> = ({ steps }) => (
  <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t-2 border-ink">
    {steps.map((s, i) => (
      <li key={s.title} className="pt-6 pb-8 sm:pr-8 border-b sm:border-b-0 border-slate-300 lg:border-r lg:last:border-r-0 lg:pl-6 lg:first:pl-0">
        <span className="block text-5xl font-black text-brand-700 tabular leading-none" aria-hidden>
          {i + 1}
        </span>
        <h3 className="mt-4 text-lg font-bold text-ink">{s.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
        {s.link && (
          <Link href={s.link.href} className="inline-block mt-3 text-[15px] font-bold text-brand-700 underline underline-offset-4 decoration-brand-200 hover:decoration-brand-700">
            {s.link.label}
          </Link>
        )}
      </li>
    ))}
  </ol>
);

export default function HowItWorksPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="How iDAM works"
      titleTa="iDAM எவ்வாறு செயல்படுகிறது"
      subtitle="Drivers book a space before they leave home. Owners earn from driveways and plots that would otherwise sit empty."
      subtitleTa="ஓட்டுநர்கள் புறப்படும் முன்பே இடம் பிடிக்கிறார்கள். உரிமையாளர்கள் காலியான இடங்களில் இருந்து சம்பாதிக்கிறார்கள்."
      breadcrumbs={[{ label: 'How it works' }]}
      lang={lang}
      onLanguageToggle={setLang}
      maxWidthClass="max-w-7xl"
    >
      <div className="space-y-20">
        <section aria-labelledby="drivers">
          <h2 id="drivers" className="text-3xl font-black tracking-tight">If you’re driving</h2>
          <p className="text-slate-600 mt-2 mb-8 max-w-2xl">Four steps, and the first three happen before you leave home.</p>
          <StepList steps={DRIVER_STEPS} />
        </section>

        <section aria-labelledby="owners">
          <h2 id="owners" className="text-3xl font-black tracking-tight">If you have a space</h2>
          <p className="text-slate-600 mt-2 mb-8 max-w-2xl">No barrier, ticket machine or attendant booth needed. A phone is enough.</p>
          <StepList steps={OWNER_STEPS} />
        </section>

        <section aria-labelledby="passes" className="asphalt text-white rounded-xl p-7 sm:p-10">
          <h2 id="passes" className="text-2xl sm:text-3xl font-black">Why a pass can’t be copied</h2>
          <p className="text-white/70 mt-2 max-w-2xl">Owners need to trust the QR code a driver shows them. Three things make sure they can.</p>
          <dl className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 border-t-[3px] border-paint pt-6">
            {SAFEGUARDS.map((g) => (
              <div key={g.title}>
                <dt className="font-bold text-lg text-amber-300">{g.title}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-white/80">{g.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-300 rounded-xl p-7 sm:p-8">
            <h2 className="text-2xl font-black">Parking today?</h2>
            <p className="text-slate-600 mt-2">See what’s free near your destination and book in about a minute.</p>
            <Link href="/explore" className="inline-block mt-6 bg-ink hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-md">
              Find parking
            </Link>
          </div>
          <div className="bg-brand-700 text-white rounded-xl p-1.5">
            <div className="border-2 border-white/90 rounded-lg p-6 sm:p-7 h-full">
              <h2 className="text-2xl font-black">Have an empty space?</h2>
              <p className="text-white/85 mt-2">List a driveway, plot or business lot and start taking bookings.</p>
              <Link href="/list-your-space" className="inline-block mt-6 bg-paint hover:bg-amber-400 text-ink font-black px-5 py-3 rounded-md">
                List your space
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
