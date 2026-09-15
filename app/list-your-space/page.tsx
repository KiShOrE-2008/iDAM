'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Car, Bike, MapPin, Building2, Clock, Upload, CheckCircle2, ShieldCheck, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function ListYourSpacePage() {
  const router = useRouter();
  const { profile, switchRole } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form State
  const [spaceTitle, setSpaceTitle] = useState('Temple Area Multi-level Lot');
  const [address, setAddress] = useState('124 West Masi Street, Madurai');
  const [spaceType, setSpaceType] = useState<'private' | 'commercial' | 'apartment' | 'other'>('private');
  
  const [carCapacity, setCarCapacity] = useState(10);
  const [bikeCapacity, setBikeCapacity] = useState(5);

  const [priceCar, setPriceCar] = useState(40);
  const [priceBike, setPriceBike] = useState(20);

  const [availableDays, setAvailableDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [openingTime, setOpeningTime] = useState('08:00 AM');
  const [closingTime, setClosingTime] = useState('10:00 PM');

  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800'
  ]);

  const handleNextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitListing();
    }
  };

  const handleSubmitListing = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      switchRole('owner');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    }, 1200);
  };

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F5] flex flex-col justify-between font-sans text-slate-900 selection:bg-emerald-200">
      
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <div className="max-w-xl mx-auto px-4 py-8 w-full flex-1 flex flex-col justify-center">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-extrabold text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">List Your Parking Space</h1>
            <p className="text-xs text-slate-500 font-medium">Turn unused parking capacity into daily income.</p>
          </div>

          {/* Stepper Progress Bar (●──○──○──○──○──○) */}
          <div className="flex items-center justify-between px-2">
            {[1, 2, 3, 4, 5, 6].map((stepNum) => {
              const isActive = currentStep === stepNum;
              const isCompleted = currentStep > stepNum;
              return (
                <React.Fragment key={stepNum}>
                  <div
                    onClick={() => stepNum < currentStep && setCurrentStep(stepNum)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isActive
                        ? 'bg-slate-900 text-white ring-4 ring-emerald-100 shadow-md scale-105'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
                  </div>
                  {stepNum < 6 && (
                    <div
                      className={`flex-1 h-1 rounded-full transition-all mx-1 ${
                        currentStep > stepNum ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {isSubmitted ? (
            <div className="py-8 text-center space-y-3 animate-scale-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-700" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Listing Submitted for Review!</h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                Your space is ready. Redirecting to your Owner Portal...
              </p>
            </div>
          ) : (
            <>
              {/* STEP 1: Tell us about your space */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 1: Space Location & Type</h3>
                  
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1">Parking Listing Title</label>
                    <input
                      type="text"
                      value={spaceTitle}
                      onChange={(e) => setSpaceTitle(e.target.value)}
                      placeholder="e.g. West Masi Private Driveway"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1">Full Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 124 West Masi Street, Madurai"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">Property Type</label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-extrabold">
                      {[
                        { id: 'private', label: 'Private Driveway' },
                        { id: 'commercial', label: 'Commercial Lot' },
                        { id: 'apartment', label: 'Apartment Complex' },
                        { id: 'other', label: 'Other Property' }
                      ].map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => setSpaceType(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            spaceType === t.id
                              ? 'bg-emerald-950 text-white border-emerald-700 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Capacity */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 2: Vehicle Capacity</h3>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Car className="w-5 h-5 text-emerald-700" />
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">Car Parking Slots</p>
                          <p className="text-[10px] text-slate-500">Number of cars that can park</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setCarCapacity(Math.max(0, carCapacity - 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold"
                        >
                          −
                        </button>
                        <span className="font-black text-sm text-slate-900 w-6 text-center">{carCapacity}</span>
                        <button
                          type="button"
                          onClick={() => setCarCapacity(carCapacity + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex items-center space-x-2">
                        <Bike className="w-5 h-5 text-emerald-700" />
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">Bike Parking Slots</p>
                          <p className="text-[10px] text-slate-500">Number of bikes that can park</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setBikeCapacity(Math.max(0, bikeCapacity - 1))}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold"
                        >
                          −
                        </button>
                        <span className="font-black text-sm text-slate-900 w-6 text-center">{bikeCapacity}</span>
                        <button
                          type="button"
                          onClick={() => setBikeCapacity(bikeCapacity + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Pricing */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 3: Hourly Pricing Setup</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-1">
                        <Car className="w-4 h-4 text-emerald-700" />
                        <span>Car Hourly Rate</span>
                      </label>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-black text-slate-500">₹</span>
                        <input
                          type="number"
                          value={priceCar}
                          onChange={(e) => setPriceCar(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-sm font-black text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 flex items-center space-x-1">
                        <Bike className="w-4 h-4 text-emerald-700" />
                        <span>Bike Hourly Rate</span>
                      </label>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-black text-slate-500">₹</span>
                        <input
                          type="number"
                          value={priceBike}
                          onChange={(e) => setPriceBike(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-sm font-black text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Availability */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 4: Operating Hours</h3>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-800 block">Available Days</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                        const isSelected = availableDays.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                              isSelected
                                ? 'bg-emerald-950 text-white border-emerald-700 shadow-xs'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-extrabold text-slate-800 block mb-1">Opening Time</label>
                      <input
                        type="text"
                        value={openingTime}
                        onChange={(e) => setOpeningTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-slate-800 block mb-1">Closing Time</label>
                      <input
                        type="text"
                        value={closingTime}
                        onChange={(e) => setClosingTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Add Photos */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 5: Property Photos</h3>

                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2 hover:border-emerald-500 cursor-pointer transition-colors bg-slate-50">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-extrabold text-slate-800">+ Add Parking Photo</p>
                    <p className="text-[10px] text-slate-500">Clear photos increase booking conversions by 40%</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative h-24 rounded-xl overflow-hidden border border-slate-200">
                        <img src={img} alt="Parking" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 6: Review & Submit */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 6: Review Listing Summary</h3>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 font-semibold">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Property Title</span>
                      <span className="font-extrabold text-slate-900">{spaceTitle}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Address</span>
                      <span className="font-extrabold text-slate-900 truncate max-w-[180px]">{address}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Capacity</span>
                      <span className="font-extrabold text-slate-900">{carCapacity} Cars • {bikeCapacity} Bikes</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Pricing</span>
                      <span className="font-extrabold text-emerald-800">Car ₹{priceCar}/hr • Bike ₹{priceBike}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hours</span>
                      <span className="font-extrabold text-slate-900">{openingTime} – {closingTime}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium text-center">
                    Your listing will be reviewed by our team before live activation.
                  </p>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex justify-between pt-4 border-t border-slate-200">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-all"
                  >
                    ← Back
                  </button>
                ) : <div />}

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md transition-all flex items-center space-x-1"
                >
                  <span>{currentStep === 6 ? (isSubmitting ? 'Submitting...' : 'Submit for Review') : 'Continue'}</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </>
          )}

        </div>

      </div>

      <Footer lang={lang} />

    </div>
  );
}
