'use client';

import React, { useState } from 'react';
import { Wifi, Signal, Battery, ChevronLeft, ChevronRight, RefreshCw, Smartphone } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';
import { SplashScreen } from './SplashScreen';
import { ExploreScreen } from './ExploreScreen';
import { ParkingDetailsScreen } from './ParkingDetailsScreen';
import { BookingScreen } from './BookingScreen';
import { PaymentScreen } from './PaymentScreen';
import { SuccessPassScreen } from './SuccessPassScreen';

import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

interface MobileSimulatorProps {
  locations: ParkingLocation[];
  lang: Language;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({ locations, lang }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const activeLocations = locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS;
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation>(activeLocations[0]);

  React.useEffect(() => {
    if (locations.length > 0 && !locations.find(l => l.id === selectedLocation?.id)) {
      setSelectedLocation(locations[0]);
    }
  }, [locations]);

  const currentLoc = selectedLocation || activeLocations[0] || MOCK_PARKING_LOCATIONS[0];

  const [bookingDetails, setBookingDetails] = useState({
    date: '12 Sep',
    time: '10:00',
    duration: 2,
    total: 85
  });

  const stepTitles = [
    '1. Splash Screen',
    '2. Explore / Map',
    '3. Parking Details',
    '4. Booking',
    '5. Payment',
    '6. Success / Pass'
  ];

  return (
    <section id="mobile-demo" className="py-16 bg-slate-900 text-white relative border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 px-3.5 py-1 rounded-full text-xs font-bold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Interactive Mobile Application Experience</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            IDAM Mobile App Workflow
          </h2>
          <p className="text-sm text-slate-400">
            Step through all 6 screens from the design specification: Splash &rarr; Map &rarr; Details &rarr; Booking &rarr; Payment &rarr; QR Pass
          </p>
        </div>

        {/* Screen Stepper Control Buttons */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {stepTitles.map((title, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            return (
              <button
                key={stepNum}
                onClick={() => setCurrentStep(stepNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {title}
              </button>
            );
          })}
        </div>

        {/* Smartphone Hardware Frame Simulation */}
        <div className="relative mx-auto w-full max-w-[360px] h-[680px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-white/10">
          
          {/* Phone Speaker Notch */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 flex items-center justify-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-slate-950" />
            <div className="w-10 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* Phone Display Screen Area */}
          <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col justify-between relative shadow-inner text-gray-900">
            
            {/* Status Bar */}
            <div className="pt-3 px-6 pb-1 flex items-center justify-between text-[11px] font-bold text-gray-800 z-30 select-none">
              <span>9:41</span>
              <div className="flex items-center space-x-1.5 text-gray-700">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>

            {/* Screen Content Render */}
            <div className="flex-1 relative overflow-hidden">
              {currentStep === 1 && (
                <SplashScreen lang={lang} onNext={() => setCurrentStep(2)} />
              )}

              {currentStep === 2 && (
                <ExploreScreen
                  locations={activeLocations}
                  selectedLocation={currentLoc}
                  onSelectLocation={setSelectedLocation}
                  onNext={() => setCurrentStep(3)}
                  lang={lang}
                />
              )}

              {currentStep === 3 && (
                <ParkingDetailsScreen
                  location={currentLoc}
                  onBack={() => setCurrentStep(2)}
                  onNext={() => setCurrentStep(4)}
                  lang={lang}
                />
              )}

              {currentStep === 4 && (
                <BookingScreen
                  location={currentLoc}
                  onBack={() => setCurrentStep(3)}
                  onNext={(details) => {
                    setBookingDetails(details);
                    setCurrentStep(5);
                  }}
                  lang={lang}
                />
              )}

              {currentStep === 5 && (
                <PaymentScreen
                  location={currentLoc}
                  bookingDetails={bookingDetails}
                  onBack={() => setCurrentStep(4)}
                  onPaySuccess={() => setCurrentStep(6)}
                  lang={lang}
                />
              )}

              {currentStep === 6 && (
                <SuccessPassScreen
                  location={currentLoc}
                  bookingDetails={bookingDetails}
                  onReset={() => setCurrentStep(1)}
                  lang={lang}
                />
              )}
            </div>

            {/* Home Indicator Bar */}
            <div className="py-2 flex justify-center bg-white z-30">
              <div className="w-28 h-1 bg-gray-300 rounded-full" />
            </div>

          </div>

        </div>

        {/* Bottom Helper Bar */}
        <div className="flex items-center justify-center space-x-4 text-xs text-slate-400 pt-2">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center space-x-1 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Screen</span>
          </button>

          <span>Step {currentStep} of 6</span>

          <button
            onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
            disabled={currentStep === 6}
            className="flex items-center space-x-1 hover:text-white disabled:opacity-30"
          >
            <span>Next Screen</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
