'use client';

import React from 'react';
import { Language } from '@/types';

interface HowItWorksProps {
  lang: Language;
  onOpenOwnerModal: () => void;
}

const COPY = {
  en: {
    heading: 'From your front door to a parked car',
    sub: 'No circling the Masi streets. Your space is held for you before you start the engine.',
    steps: [
      { title: 'Search where you’re going', body: 'Type a landmark like Meenakshi Temple or Periyar Bus Stand and see parking within walking distance.' },
      { title: 'Pick a time', body: 'Choose the date, when you’ll arrive and how many hours you need, for a car or a bike.' },
      { title: 'Pay once', body: 'UPI, card or net banking through Razorpay. The price you see is the price you pay.' },
      { title: 'Show your pass', body: 'The owner scans your QR pass at the gate and checks your number plate. Park and walk on.' },
    ],
    ownerHeading: 'Have an empty driveway, plot or basement?',
    ownerBody: 'List it on iDAM and earn from the hours it sits unused. You set the rates and opening hours; we send drivers who have already paid.',
    ownerFacts: [
      { k: 'No hardware', v: 'Scan passes with the iDAM app on your phone.' },
      { k: 'Your rules', v: 'Car and bike rates, hours and capacity are yours to set.' },
      { k: 'Paid out daily', v: 'Earnings go to your bank account every day.' },
    ],
    ownerCta: 'List your space',
  },
  ta: {
    heading: 'வீட்டு வாசலிலிருந்து நிறுத்திய வண்டி வரை',
    sub: 'மாசி வீதிகளில் சுற்ற வேண்டாம். வண்டியை எடுப்பதற்கு முன்பே உங்கள் இடம் உறுதி.',
    steps: [
      { title: 'செல்லும் இடத்தைத் தேடுங்கள்', body: 'மீனாட்சி கோவில், பெரியார் பேருந்து நிலையம் போன்ற அடையாளத்தை உள்ளிட்டு அருகிலுள்ள பார்க்கிங்கைப் பாருங்கள்.' },
      { title: 'நேரத்தைத் தேர்வு செய்யுங்கள்', body: 'தேதி, வருகை நேரம், எத்தனை மணி நேரம் என்பதை கார் அல்லது பைக்கிற்குத் தேர்வு செய்யுங்கள்.' },
      { title: 'ஒருமுறை செலுத்துங்கள்', body: 'Razorpay மூலம் UPI, கார்டு அல்லது நெட் பேங்கிங். காட்டப்படும் விலையே இறுதி விலை.' },
      { title: 'பாஸைக் காட்டுங்கள்', body: 'உரிமையாளர் வாயிலில் உங்கள் QR பாஸை ஸ்கேன் செய்து வாகன எண்ணைச் சரிபார்ப்பார்.' },
    ],
    ownerHeading: 'காலியான வாசல், மனை அல்லது அடித்தளம் உள்ளதா?',
    ownerBody: 'iDAM-இல் பட்டியலிட்டு பயன்படுத்தப்படாத நேரங்களில் சம்பாதியுங்கள். கட்டணமும் நேரமும் உங்கள் முடிவு.',
    ownerFacts: [
      { k: 'கருவிகள் தேவையில்லை', v: 'உங்கள் போனில் iDAM ஆப் மூலம் பாஸ்களை ஸ்கேன் செய்யுங்கள்.' },
      { k: 'உங்கள் விதிகள்', v: 'கட்டணம், நேரம், கொள்ளளவு அனைத்தும் உங்கள் முடிவு.' },
      { k: 'தினசரி பணம்', v: 'வருமானம் ஒவ்வொரு நாளும் உங்கள் வங்கிக் கணக்கிற்கு.' },
    ],
    ownerCta: 'உங்கள் இடத்தைப் பட்டியலிடுங்கள்',
  },
};

export const HowItWorks: React.FC<HowItWorksProps> = ({ lang, onOpenOwnerModal }) => {
  const c = COPY[lang];
  const tamil = lang === 'ta' ? 'font-tamil' : '';

  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-slate-300/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-2xl">
          <h2 className={`text-3xl sm:text-[2.5rem] font-black tracking-tight text-ink leading-tight ${tamil}`}>{c.heading}</h2>
          <p className={`text-lg text-slate-600 mt-3 ${tamil}`}>{c.sub}</p>
        </div>

        <ol className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t-2 border-ink">
          {c.steps.map((s, i) => (
            <li key={i} className="pt-6 pb-2 sm:pr-8 border-b sm:border-b-0 border-slate-300 lg:border-r lg:last:border-r-0 lg:pl-6 lg:first:pl-0">
              <span className="block text-5xl font-black text-brand-700 tabular leading-none" aria-hidden>
                {i + 1}
              </span>
              <h3 className={`mt-4 text-lg font-bold text-ink ${tamil}`}>{s.title}</h3>
              <p className={`mt-2 text-[15px] leading-relaxed text-slate-600 pb-6 ${tamil}`}>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Owner section styled as a blue roadside sign */}
      <div id="for-owners" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24">
        <div className="bg-brand-700 text-white rounded-xl p-2">
          <div className="border-2 border-white/90 rounded-lg p-7 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6">
              <h2 className={`text-3xl sm:text-4xl font-black leading-tight ${tamil}`}>{c.ownerHeading}</h2>
              <p className={`mt-4 text-lg text-white/85 leading-relaxed max-w-xl ${tamil}`}>{c.ownerBody}</p>
              <button
                onClick={onOpenOwnerModal}
                className={`mt-8 bg-paint hover:bg-amber-400 text-ink font-black text-base px-6 py-3.5 rounded-md cursor-pointer ${tamil}`}
              >
                {c.ownerCta}
              </button>
            </div>
            <dl className="lg:col-span-5 lg:col-start-8 divide-y divide-white/25 self-end">
              {c.ownerFacts.map((f) => (
                <div key={f.k} className="py-4 first:pt-0 last:pb-0">
                  <dt className={`font-bold text-lg ${tamil}`}>{f.k}</dt>
                  <dd className={`text-white/80 mt-1 ${tamil}`}>{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
};
