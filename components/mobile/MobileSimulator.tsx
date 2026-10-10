'use client';

import React, { useState } from 'react';
import { Wifi, Signal, Battery, ChevronLeft, ChevronRight, RefreshCw, Smartphone, Maximize2, Sparkles, Layers } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';
import { SplashScreen } from './SplashScreen';
import { AuthScreen } from './AuthScreen';
import { ExploreScreen } from './ExploreScreen';
import { ParkingDetailsScreen } from './ParkingDetailsScreen';
import { BookingScreen } from './BookingScreen';
import { PaymentScreen } from './PaymentScreen';
import { SuccessPassScreen } from './SuccessPassScreen';
import { ProfileDashboardScreen } from './ProfileDashboardScreen';
import { SupportHubScreen } from './SupportHubScreen';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import { createBooking } from '@/lib/booking/service';

interface MobileSimulatorProps {
  locations: ParkingLocation[];
  lang: Language;
  onFullscreenToggle?: () => void;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({ locations, lang, onFullscreenToggle }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const activeLocations = locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS;
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation>(activeLocations[0]);

  React.useEffect(() => {
    if (locations.length > 0 && !locations.find(l => l.id === selectedLocation?.id)) {
      setSelectedLocation(locations[0]);
    }
  }, [locations, selectedLocation]);

  const currentLoc = selectedLocation || activeLocations[0] || MOCK_PARKING_LOCATIONS[0];

  const [bookingDetails, setBookingDetails] = useState({
    date: '12 Sep',
    time: '10:00 AM',
    duration: 2,
    total: 85,
    vehicleNumber: 'TN 59 AB 1234',
    addons: ['EV Fast Charge', 'Cancellation Protection']
  });

  const stepTitles = [
    '1. Splash Screen',
    '2. Sign In / Register',
    '3. Live Map',
    '4. Spot Picker',
    '5. Addons & Booking',
    '6. Instant Pay',
    '7. QR Pass',
    '8. Profile & Garage',
    '9. AI Support Chat'
  ];

  return (
    <section id="mobile-demo" className="py-16 bg-slate-950 text-white relative border-t border-slate-800 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Soft Glow Background Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-xs font-black shadow-lg">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Interactive Mobile Application Presentation Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            iDAM Mobile App Workflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
            Step through all 9 screens: Splash &rarr; Sign In / Register &rarr; Live Map &rarr; Spot Grid &rarr; Add-ons & Booking &rarr; Instant Pay &rarr; QR Pass &rarr; Garage & Passes &rarr; AI Support
          </p>
        </div>

        {/* Quick Demo Step Navigation Switcher */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {stepTitles.map((title, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            return (
              <button
                key={stepNum}
                onClick={() => setCurrentStep(stepNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-300'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {title}
              </button>
            );
          })}
        </div>

        {/* Smartphone Hardware Frame Simulation */}
        <div className="relative mx-auto w-full max-w-[420px] sm:max-w-[440px] h-[780px] sm:h-[840px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-white/10 transition-all">
          
          {/* Dynamic Notch */}
          <div className="absolute top-4.5 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-950 rounded-full z-40 flex items-center justify-center space-x-2 border border-slate-800/60">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <div className="w-10 h-1 bg-slate-800 rounded-full" />
          </div>

          {/* Display Viewport */}
          <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col justify-between relative shadow-inner text-slate-900">
            
            {/* Status Bar */}
            <div className="pt-2.5 px-6 pb-1 flex items-center justify-between text-[11px] font-black text-slate-800 z-30 select-none bg-transparent">
              <span>9:41</span>
              <div className="flex items-center space-x-1.5 text-slate-700">
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
                <AuthScreen
                  lang={lang}
                  onSuccess={() => setCurrentStep(3)}
                  onSkipDemo={() => setCurrentStep(3)}
                />
              )}

              {currentStep === 3 && (
                <ExploreScreen
                  locations={activeLocations}
                  selectedLocation={currentLoc}
                  onSelectLocation={setSelectedLocation}
                  onNext={() => setCurrentStep(4)}
                  lang={lang}
                  onNavigateToProfile={() => setCurrentStep(8)}
                  onNavigateToBookings={() => setCurrentStep(8)}
                  activeTab="home"
                />
              )}

              {currentStep === 4 && (
                <ParkingDetailsScreen
                  location={currentLoc}
                  onBack={() => setCurrentStep(3)}
                  onNext={() => setCurrentStep(5)}
                  lang={lang}
                />
              )}

              {currentStep === 5 && (
                <BookingScreen
                  location={currentLoc}
                  onBack={() => setCurrentStep(4)}
                  onNext={(details) => {
                    setBookingDetails({
                      ...bookingDetails,
                      ...details
                    });
                    setCurrentStep(6);
                  }}
                  lang={lang}
                />
              )}

              {currentStep === 6 && (
                <PaymentScreen
                  location={currentLoc}
                  bookingDetails={bookingDetails}
                  onBack={() => setCurrentStep(5)}
                  onPaySuccess={async (meta) => {
                    try {
                      const booking = await createBooking(currentLoc, {
                        parkingLocationId: currentLoc.id,
                        vehicleType: 'car',
                        bookingDate: bookingDetails.date,
                        startTime: bookingDetails.time,
                        durationHours: bookingDetails.duration,
                        basePrice: bookingDetails.total,
                        platformFee: 5,
                        totalAmount: bookingDetails.total,
                        paymentMethod: meta?.paymentMethod || 'Razorpay',
                        paymentId: meta?.paymentId,
                        vehicleNumber: bookingDetails.vehicleNumber
                      });
                      setBookingDetails(prev => ({
                        ...prev,
                        ...meta,
                        passCode: booking.passCode,
                        qrData: booking.qrData
                      } as any));
                    } catch (err) {
                      console.warn('Booking creation err:', err);
                      if (meta) {
                        setBookingDetails(prev => ({
                          ...prev,
                          ...meta
                        }));
                      }
                    }
                    setCurrentStep(7);
                  }}
                  lang={lang}
                />
              )}

              {currentStep === 7 && (
                <SuccessPassScreen
                  location={currentLoc}
                  bookingDetails={bookingDetails}
                  onReset={() => setCurrentStep(8)}
                  lang={lang}
                />
              )}

              {currentStep === 8 && (
                <ProfileDashboardScreen
                  lang={lang}
                  onBack={() => setCurrentStep(3)}
                  onNavigateToSupport={() => setCurrentStep(9)}
                  onNavigateToAuth={() => setCurrentStep(2)}
                />
              )}

              {currentStep === 9 && (
                <SupportHubScreen
                  lang={lang}
                  onBack={() => setCurrentStep(8)}
                />
              )}
            </div>

            {/* Home Bar Indicator */}
            <div className="py-2 flex justify-center bg-white z-30">
              <div className="w-28 h-1 bg-slate-300 rounded-full" />
            </div>

          </div>

        </div>

        {/* Bottom Helper Controls */}
        <div className="flex items-center justify-center space-x-6 text-xs text-slate-400 pt-2 font-bold">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center space-x-1 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Screen</span>
          </button>

          <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-emerald-400">
            Screen {currentStep} of {stepTitles.length}
          </span>

          <button
            onClick={() => setCurrentStep(Math.min(stepTitles.length, currentStep + 1))}
            disabled={currentStep === stepTitles.length}
            className="flex items-center space-x-1 hover:text-white disabled:opacity-30 transition-colors"
          >
            <span>Next Screen</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
