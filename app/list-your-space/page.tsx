'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Car, Bike, Clock, Upload, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { loginUrlReturningTo } from '@/lib/auth/redirect';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const DRAFT_STORAGE_KEY = 'idam_space_draft';

export default function ListYourSpacePage() {
  const router = useRouter();
  const { profile, switchRole, isDemoMode, supabaseUser } = useAuth();
  const mustSignInToSubmit = isSupabaseConfigured && !isDemoMode && !supabaseUser;
  const [lang, setLang] = useState<Language>('en');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resumedFromDraft, setResumedFromDraft] = useState(false);

  // Form State
  const [spaceTitle, setSpaceTitle] = useState('Temple Area Multi-level Lot');
  const [address, setAddress] = useState('124 West Masi Street, Madurai');
  const [spaceType, setSpaceType] = useState<'private' | 'commercial' | 'apartment' | 'plot'>('private');
  
  const [carCapacity, setCarCapacity] = useState(10);
  const [bikeCapacity, setBikeCapacity] = useState(5);
  const [evChargerAvailable, setEvChargerAvailable] = useState(true);

  const [priceCar, setPriceCar] = useState(40);
  const [priceBike, setPriceBike] = useState(20);

  const [availableDays, setAvailableDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [openingTime, setOpeningTime] = useState('08:00 AM');
  const [closingTime, setClosingTime] = useState('10:00 PM');

  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800'
  ]);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.spaceTitle) setSpaceTitle(d.spaceTitle);
        if (d.address) setAddress(d.address);
        if (d.spaceType) setSpaceType(d.spaceType);
        if (d.carCapacity !== undefined) setCarCapacity(d.carCapacity);
        if (d.bikeCapacity !== undefined) setBikeCapacity(d.bikeCapacity);
        if (d.priceCar !== undefined) setPriceCar(d.priceCar);
        if (d.priceBike !== undefined) setPriceBike(d.priceBike);
        if (d.availableDays) setAvailableDays(d.availableDays);
        if (d.openingTime) setOpeningTime(d.openingTime);
        if (d.closingTime) setClosingTime(d.closingTime);
        if (d.currentStep) setCurrentStep(d.currentStep);
        setResumedFromDraft(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist draft on changes
  useEffect(() => {
    if (isSubmitted) return;
    try {
      const draft = {
        spaceTitle,
        address,
        spaceType,
        carCapacity,
        bikeCapacity,
        priceCar,
        priceBike,
        availableDays,
        openingTime,
        closingTime,
        currentStep
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage unavailable
    }
  }, [spaceTitle, address, spaceType, carCapacity, bikeCapacity, priceCar, priceBike, availableDays, openingTime, closingTime, currentStep, isSubmitted]);

  // Pricing recommendations calculator
  const applyRecommendedRates = (type: typeof spaceType) => {
    switch (type) {
      case 'private':
        setPriceCar(30);
        setPriceBike(15);
        break;
      case 'commercial':
        setPriceCar(50);
        setPriceBike(25);
        break;
      case 'apartment':
        setPriceCar(40);
        setPriceBike(20);
        break;
      case 'plot':
        setPriceCar(35);
        setPriceBike(18);
        break;
    }
  };

  const estimatedMonthlyEarnings = (carCapacity * priceCar * 6 * 26) + (bikeCapacity * priceBike * 6 * 26);

  const handleNextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitListing();
    }
  };

  const handleSubmitListing = async () => {
    setIsSubmitting(true);
    
    if (isSupabaseConfigured && supabase && !isDemoMode) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          alert('You must be signed in to submit a parking space listing. Please sign in and try again.');
          setIsSubmitting(false);
          router.push(loginUrlReturningTo('/list-your-space'));
          return;
        }

        // 1. Insert into public.parking_spaces
          const { error: spaceErr } = await supabase.from('parking_spaces').insert([{
            owner_id: user.id,
            title: spaceTitle,
            address: address,
            price_per_hour_car: priceCar,
            price_per_hour_bike: priceBike,
            car_capacity: carCapacity,
            bike_capacity: bikeCapacity,
            status: 'pending_review',
            latitude: 9.9195,
            longitude: 78.1198,
            image_url: images[0] || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a'
          }]);

          if (spaceErr) {
            console.error('Failed to insert space into database:', spaceErr);
            alert(`Could not register space: ${spaceErr.message}`);
            setIsSubmitting(false);
            return;
          }

          // 2. Call apply_for_owner_role RPC
          await supabase.rpc('apply_for_owner_role', {
            p_property_name: spaceTitle,
            p_property_address: address
          });
        } catch (e: any) {
        console.error('Supabase space insert exception:', e);
        alert(`Failed to submit space: ${e.message || 'Network error'}`);
        setIsSubmitting(false);
        return;
      }
    }

    // Clear local draft
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      if (isDemoMode) {
        switchRole('owner');
      }
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }, 1000);
  };

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const STEPS = ['Place', 'Spaces', 'Rates', 'Hours', 'Photos', 'Review'];
  const SPACE_TYPES = [
    { id: 'private', label: 'House driveway' },
    { id: 'commercial', label: 'Shop or office lot' },
    { id: 'apartment', label: 'Apartment bays' },
    { id: 'plot', label: 'Empty plot or yard' },
  ] as const;
  const label = 'block text-sm text-slate-600 mb-1.5';
  const field = 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-[15px] text-ink focus:outline-none focus:border-ink focus:ring-4 focus:ring-amber-300/50';
  const choice = (on: boolean) =>
    `border rounded-md cursor-pointer ${on ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-slate-300 hover:border-slate-400'}`;

  const Stepper = ({ value, onChange, name }: { value: number; onChange: (n: number) => void; name: string }) => (
    <div className="flex items-center border border-slate-300 rounded-md bg-white overflow-hidden">
      <button type="button" aria-label={`Fewer ${name}`} onClick={() => onChange(Math.max(0, value - 1))} className="w-11 h-11 text-xl font-bold hover:bg-slate-50 cursor-pointer">−</button>
      <span className="w-12 text-center text-lg font-black tabular" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${name}`} onClick={() => onChange(value + 1)} className="w-11 h-11 text-xl font-bold hover:bg-slate-50 cursor-pointer">+</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-limewash text-ink flex flex-col">
      <Navbar lang={lang} onLanguageToggle={setLang} onOpenOwnerModal={() => {}} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link href="/owners" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-ink">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          For space owners
        </Link>
        <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-[-0.02em] leading-tight">List your space</h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl">Six short steps. Your answers are saved on this device as you go.</p>

        {mustSignInToSubmit && !isSubmitted && (
          <div role="status" className="mt-6 bg-amber-50 border-l-4 border-amber-500 rounded p-4 text-[15px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-3xl">
            <span>Sign in before you submit. You can fill in the steps first; nothing is lost.</span>
            <Link href={loginUrlReturningTo('/list-your-space')} className="shrink-0 bg-ink text-white px-4 py-2 rounded-md font-bold text-center">
              Sign in
            </Link>
          </div>
        )}

        {resumedFromDraft && !isSubmitted && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-slate-600">
            <span>We picked up where you left off.</span>
            <button
              onClick={() => {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
                setResumedFromDraft(false);
              }}
              className="font-bold text-rose-700 underline underline-offset-4 cursor-pointer"
            >
              Start over
            </button>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Step rail */}
          <nav aria-label="Listing steps" className="lg:col-span-3">
            <ol className="flex lg:flex-col overflow-x-auto no-scrollbar border-b lg:border-b-0 lg:border-l-2 border-slate-300">
              {STEPS.map((name, idx) => {
                const n = idx + 1;
                const isActive = currentStep === n;
                const isDone = currentStep > n;
                return (
                  <li key={name} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => isDone && !isSubmitted && setCurrentStep(n)}
                      disabled={!isDone || isSubmitted}
                      aria-current={isActive ? 'step' : undefined}
                      className={`flex items-center gap-3 px-3 lg:pl-5 py-2.5 lg:-ml-[2px] border-b-[3px] lg:border-b-0 lg:border-l-[3px] -mb-px lg:mb-0 text-[15px] whitespace-nowrap ${
                        isActive ? 'border-brand-700 font-black text-ink' : isDone ? 'border-transparent font-semibold text-ink hover:text-brand-700 cursor-pointer' : 'border-transparent text-slate-400'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black tabular ${isDone ? 'bg-go-600 text-white' : isActive ? 'bg-brand-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden /> : n}
                      </span>
                      {name}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Form */}
          <section className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-6 sm:p-7" aria-live="polite">
            {isSubmitted ? (
              <div className="py-6">
                <span className="w-11 h-11 rounded-md bg-go-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" aria-hidden />
                </span>
                <h2 className="text-2xl font-black mt-4">Sent for review</h2>
                <p className="text-[15px] text-slate-600 mt-2">
                  Your space is marked <strong className="text-ink">Pending review</strong>. We&apos;ll check it and let you know. Taking you home…
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 tabular">Step {currentStep} of 6</p>

                {currentStep === 1 && (
                  <div className="mt-1 space-y-5 animate-fade-in">
                    <h2 className="text-2xl font-black">Where is your space?</h2>
                    <div>
                      <label htmlFor="ls-title" className={label}>Name drivers will see</label>
                      <input id="ls-title" type="text" value={spaceTitle} onChange={(e) => setSpaceTitle(e.target.value)} placeholder="West Masi Street driveway" className={field} />
                    </div>
                    <div>
                      <label htmlFor="ls-address" className={label}>Full address</label>
                      <input id="ls-address" type="text" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="124 West Masi Street, Madurai" className={field} />
                    </div>
                    <fieldset>
                      <legend className={label}>What kind of space is it?</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {SPACE_TYPES.map((t) => (
                          <button
                            type="button"
                            key={t.id}
                            aria-pressed={spaceType === t.id}
                            onClick={() => {
                              setSpaceType(t.id);
                              applyRecommendedRates(t.id);
                            }}
                            className={`px-3.5 py-3 text-left text-[15px] font-bold ${choice(spaceType === t.id)}`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-slate-500 mt-2">This also sets suggested rates, which you can change in step 3.</p>
                    </fieldset>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="mt-1 space-y-5 animate-fade-in">
                    <h2 className="text-2xl font-black">How many vehicles fit?</h2>
                    <div className="divide-y divide-slate-200 border-y border-slate-200">
                      <div className="flex items-center justify-between gap-4 py-4">
                        <span className="flex items-center gap-3">
                          <Car className="w-6 h-6 text-slate-500" aria-hidden />
                          <span className="font-bold text-lg">Cars</span>
                        </span>
                        <Stepper value={carCapacity} onChange={setCarCapacity} name="car spaces" />
                      </div>
                      <div className="flex items-center justify-between gap-4 py-4">
                        <span className="flex items-center gap-3">
                          <Bike className="w-6 h-6 text-slate-500" aria-hidden />
                          <span className="font-bold text-lg">Bikes</span>
                        </span>
                        <Stepper value={bikeCapacity} onChange={setBikeCapacity} name="bike spaces" />
                      </div>
                    </div>
                    <label className="flex items-center gap-3 text-[15px] cursor-pointer">
                      <input type="checkbox" checked={evChargerAvailable} onChange={(e) => setEvChargerAvailable(e.target.checked)} className="w-5 h-5 accent-[#1846A3]" />
                      There&apos;s an EV charging point
                    </label>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="mt-1 space-y-5 animate-fade-in">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="text-2xl font-black">Hourly rates</h2>
                      <button type="button" onClick={() => applyRecommendedRates(spaceType)} className="text-sm font-bold text-brand-700 underline underline-offset-4 cursor-pointer shrink-0">
                        Use suggested rates
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ['ls-car', 'Car, per hour', priceCar, setPriceCar],
                        ['ls-bike', 'Bike, per hour', priceBike, setPriceBike],
                      ] as const).map(([id, text, val, set]) => (
                        <div key={id}>
                          <label htmlFor={id} className={label}>{text}</label>
                          <div className="flex items-center border border-slate-300 rounded-md bg-white focus-within:border-ink focus-within:ring-4 focus-within:ring-amber-300/50">
                            <span className="pl-3 text-lg font-bold text-slate-500">₹</span>
                            <input id={id} type="number" min={0} inputMode="numeric" value={val} onChange={(e) => set(Number(e.target.value))} className="w-full px-2 py-2.5 text-xl font-black tabular bg-transparent focus:outline-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t-2 border-ink pt-4">
                      <p className="text-sm text-slate-600">If your spaces are used about 6 hours a day, 26 days a month, you could earn around</p>
                      <p className="text-3xl font-black tabular mt-1">₹{estimatedMonthlyEarnings.toLocaleString('en-IN')}<span className="text-base font-semibold text-slate-500"> a month</span></p>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="mt-1 space-y-5 animate-fade-in">
                    <h2 className="text-2xl font-black">When can drivers park?</h2>
                    <fieldset>
                      <legend className={label}>Open on</legend>
                      <div className="grid grid-cols-7 gap-1.5">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <button type="button" key={day} aria-pressed={availableDays.includes(day)} onClick={() => toggleDay(day)} className={`py-2.5 text-sm font-bold ${choice(availableDays.includes(day))}`}>
                            {day}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="ls-open" className={label}>Opens at</label>
                        <input id="ls-open" type="text" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} className={`${field} tabular`} />
                      </div>
                      <div>
                        <label htmlFor="ls-close" className={label}>Closes at</label>
                        <input id="ls-close" type="text" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} className={`${field} tabular`} />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="mt-1 space-y-5 animate-fade-in">
                    <h2 className="text-2xl font-black">Photos</h2>
                    <p className="text-[15px] text-slate-600">Drivers book more often when they can see the entrance and the parking area.</p>
                    <div className="border-2 border-dashed border-slate-300 rounded-md p-5 text-center bg-limewash">
                      <Upload className="w-7 h-7 text-slate-400 mx-auto" aria-hidden />
                      <p className="text-[15px] font-semibold mt-2">Photo upload isn&apos;t available yet</p>
                      <p className="text-sm text-slate-500 mt-0.5">The sample photo below is used until it is.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {images.map((img, idx) => (
                        <img key={idx} src={img} alt={`Photo ${idx + 1} of the space`} className="h-28 w-full rounded-md object-cover" />
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="mt-1 space-y-5 animate-fade-in">
                    <h2 className="text-2xl font-black">Check and send</h2>
                    <dl className="text-[15px] border-t-2 border-ink divide-y divide-slate-200">
                      {[
                        ['Name', spaceTitle],
                        ['Address', address],
                        ['Spaces', `${carCapacity} cars, ${bikeCapacity} bikes${evChargerAvailable ? ', EV charging' : ''}`],
                        ['Rates', `Car ₹${priceCar}/hr, bike ₹${priceBike}/hr`],
                        ['Hours', `${openingTime} to ${closingTime}`],
                        ['Days', availableDays.join(', ') || 'None selected'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-6 py-2.5">
                          <dt className="text-slate-600 shrink-0">{k}</dt>
                          <dd className="font-bold text-right">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-sm text-slate-600">We review every listing before drivers can book it. You can change rates and hours later from the owner dashboard.</p>
                  </div>
                )}

                <div className="flex justify-between gap-3 mt-8 pt-5 border-t border-slate-200">
                  {currentStep > 1 ? (
                    <button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="px-5 py-3 rounded-md border border-slate-300 font-bold hover:border-slate-400 cursor-pointer">
                      Back
                    </button>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-md bg-brand-700 hover:bg-brand-800 text-white font-black disabled:opacity-70 cursor-pointer"
                  >
                    {currentStep === 6 ? (isSubmitting ? 'Sending…' : 'Send for review') : 'Next'}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Live preview, drawn the way the map shows a place */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24" aria-label="Preview">
            <p className="text-sm text-slate-600 mb-2.5">How drivers will see it</p>
            <div className="asphalt rounded-xl overflow-hidden text-white">
              <img src={images[0]} alt="" className="w-full h-32 object-cover opacity-90" />
              <div className="border-t-[3px] border-paint grid grid-cols-2">
                <div className="p-4 border-r-[3px] border-paint">
                  <p className="text-[2.2rem] font-black leading-none tabular">{carCapacity}</p>
                  <p className="text-sm text-white/60 mt-1">car spaces</p>
                  <p className="text-amber-300 font-bold tabular mt-2">₹{priceCar}/hr</p>
                </div>
                <div className="p-4">
                  <p className="text-[2.2rem] font-black leading-none tabular">{bikeCapacity}</p>
                  <p className="text-sm text-white/60 mt-1">bike spaces</p>
                  <p className="text-amber-300 font-bold tabular mt-2">₹{priceBike}/hr</p>
                </div>
              </div>
              <div className="border-t-[3px] border-paint p-4">
                <p className="font-black text-lg leading-snug">{spaceTitle || 'Your space'}</p>
                <p className="text-sm text-white/70 mt-0.5">{address || 'Address'}</p>
                <p className="text-sm text-white/70 mt-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" aria-hidden />
                  <span className="tabular">{openingTime} to {closingTime}</span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
