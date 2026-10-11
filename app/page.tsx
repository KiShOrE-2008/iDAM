'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Smartphone, Monitor } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { WebExplorer } from '@/components/WebExplorer';
import { SplashScreen } from '@/components/mobile/SplashScreen';
import { AuthScreen } from '@/components/mobile/AuthScreen';
import { ExploreScreen } from '@/components/mobile/ExploreScreen';
import { ParkingDetailsScreen } from '@/components/mobile/ParkingDetailsScreen';
import { BookingScreen } from '@/components/mobile/BookingScreen';
import { PaymentScreen } from '@/components/mobile/PaymentScreen';
import { SuccessPassScreen } from '@/components/mobile/SuccessPassScreen';
import { MyPassesScreen } from '@/components/mobile/MyPassesScreen';
import { MyAccountScreen } from '@/components/mobile/MyAccountScreen';
import { SupportHubScreen } from '@/components/mobile/SupportHubScreen';
import { OwnerModal } from '@/components/OwnerModal';
import { WebBookingModal } from '@/components/web/WebBookingModal';
import { FaqPreview } from '@/components/web/FaqPreview';
import { CookieBanner } from '@/components/web/CookieBanner';
import { Footer } from '@/components/Footer';
import { Language, ParkingLocation } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { createBooking } from '@/lib/booking/service';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

import { useBackNavigation, useRegisterModal } from '@/context/BackNavigationContext';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingLocation, setSelectedBookingLocation] = useState<ParkingLocation | null>(null);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode Switcher State: 'web' or 'mobile_standalone'
  const [demoViewMode, setDemoViewMode] = useState<'web' | 'mobile_standalone'>('web');

  // Native Mobile Flow State
  const [nativeStep, setNativeStep] = useState<number>(1);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation>(MOCK_PARKING_LOCATIONS[0]);
  const [bookingDetails, setBookingDetails] = useState({
    date: '12 Sep',
    time: '10:00 AM',
    duration: 2,
    total: 85,
    vehicleNumber: 'TN 59 AB 1234',
    addons: ['EV Fast Charge']
  });

  const { registerBackHandler } = useBackNavigation();

  // Register open modals with Back button stack so Back closes them first
  useRegisterModal(isOwnerModalOpen, () => setIsOwnerModalOpen(false), 'owner-modal');
  useRegisterModal(isBookingModalOpen, () => setIsBookingModalOpen(false), 'booking-modal');

  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      setDemoViewMode('mobile_standalone');
    }
  }, []);

  // Register Native Mobile Back Navigation Handler
  useEffect(() => {
    if (demoViewMode !== 'mobile_standalone') return;

    return registerBackHandler(() => {
      // Step transitions matching expected screen-back architecture:
      if (nativeStep === 10) {
        setNativeStep(9); // Support -> Account
        return true;
      }
      if (nativeStep === 9) {
        setNativeStep(3); // Account / Profile -> Explore / Home
        return true;
      }
      if (nativeStep === 8) {
        setNativeStep(3); // Passes -> Explore / Home
        return true;
      }
      if (nativeStep === 7) {
        setNativeStep(8); // Success Pass -> Passes
        return true;
      }
      if (nativeStep === 6) {
        setNativeStep(5); // Payment -> Booking
        return true;
      }
      if (nativeStep === 5) {
        setNativeStep(4); // Booking -> Parking Details
        return true;
      }
      if (nativeStep === 4) {
        setNativeStep(3); // Parking Details -> Explore
        return true;
      }
      if (nativeStep === 2) {
        setNativeStep(1); // Auth (Login/Signup) -> Splash
        return true;
      }
      // nativeStep === 3 (Explore / Root Home) or 1 (Splash): User is on Root/Home screen!
      // Return false to let BackNavigationContext show the "Exit iDAM?" confirmation dialog.
      return false;
    });
  }, [demoViewMode, nativeStep, registerBackHandler]);

  useEffect(() => {
    async function loadData() {
      const data = await getParkingLocations();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocation(data[0]);
      }
    }
    loadData();
  }, []);

  // Standalone Full-Screen Mobile App View (Clean 100% Native View)
  if (demoViewMode === 'mobile_standalone') {
    return (
      <div className="h-screen w-screen bg-white flex flex-col overflow-hidden font-sans select-none">
        
        {/* Full-Screen Native Mobile Viewport */}
        <div className="flex-1 relative overflow-hidden bg-white max-w-[440px] mx-auto w-full border-x border-slate-200 shadow-2xl">
          {nativeStep === 1 && (
            <SplashScreen 
              lang={lang} 
              onNext={() => setNativeStep(isAuthenticated ? 3 : 2)} 
              onLanguageToggle={setLang}
            />
          )}

          {nativeStep === 2 && (
            <AuthScreen
              lang={lang}
              onSuccess={() => setNativeStep(3)}
              onSkipDemo={() => setNativeStep(3)}
            />
          )}

          {nativeStep === 3 && (
            <ExploreScreen
              locations={locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
              onNext={() => setNativeStep(4)}
              lang={lang}
              onNavigateToBookings={() => setNativeStep(8)}
              onNavigateToProfile={() => setNativeStep(9)}
            />
          )}

          {nativeStep === 4 && (
            <ParkingDetailsScreen
              location={selectedLocation}
              onBack={() => setNativeStep(3)}
              onNext={() => setNativeStep(5)}
              lang={lang}
            />
          )}

          {nativeStep === 5 && (
            <BookingScreen
              location={selectedLocation}
              onBack={() => setNativeStep(4)}
              onNext={(details) => {
                setBookingDetails({
                  ...bookingDetails,
                  ...details
                });
                setNativeStep(6);
              }}
              lang={lang}
            />
          )}

          {nativeStep === 6 && (
            <PaymentScreen
              location={selectedLocation}
              bookingDetails={bookingDetails}
              onBack={() => setNativeStep(5)}
              onPaySuccess={async (meta) => {
                try {
                  const booking = await createBooking(selectedLocation, {
                    parkingLocationId: selectedLocation.id,
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
                  setBookingDetails((prev) => ({
                    ...prev,
                    ...meta,
                    passCode: booking.passCode,
                    qrData: booking.qrData
                  } as any));
                } catch (err) {
                  console.warn('Booking creation error:', err);
                }
                setNativeStep(7);
              }}
              lang={lang}
            />
          )}

          {nativeStep === 7 && (
            <SuccessPassScreen
              location={selectedLocation}
              bookingDetails={bookingDetails}
              onReset={() => setNativeStep(8)}
              lang={lang}
            />
          )}

          {nativeStep === 8 && (
            <MyPassesScreen
              lang={lang}
              onBack={() => setNativeStep(3)}
              onNavigateToHome={() => setNativeStep(3)}
              onNavigateToProfile={() => setNativeStep(9)}
            />
          )}

          {nativeStep === 9 && (
            <MyAccountScreen
              lang={lang}
              onBack={() => setNativeStep(3)}
              onNavigateToHome={() => setNativeStep(3)}
              onNavigateToPasses={() => setNativeStep(8)}
              onNavigateToSupport={() => setNativeStep(10)}
              onNavigateToAuth={() => setNativeStep(2)}
            />
          )}

          {nativeStep === 10 && (
            <SupportHubScreen
              lang={lang}
              onBack={() => setNativeStep(9)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Top Demo View Switcher Pill Bar */}
      <div className="bg-slate-950 text-white px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-bold">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>iDAM Showcase • Web & Mobile Demo</span>
        </div>

        <button
          onClick={() => setDemoViewMode('mobile_standalone')}
          className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1 rounded-full text-xs font-black shadow-md transition-all transform active:scale-95"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Launch Full-Screen Mobile App Demo 📱</span>
        </button>
      </div>

      {/* Main Navbar */}
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
      />

      {/* Main Content */}
      <main id="home">
        {/* Web Landing Page Hero */}
        <Hero
          lang={lang}
          onSearch={(q) => setSearchQuery(q)}
          onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
        />

        {/* Real-time Discovery Map & Search */}
        <WebExplorer
          lang={lang}
          onSelectLocation={(loc) => {
            setSelectedBookingLocation(loc);
            setIsBookingModalOpen(true);
          }}
        />

        {/* How It Works & Owner Monetization Section */}
        <HowItWorks
          lang={lang}
          onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
        />

        {/* FAQ Preview Section */}
        <FaqPreview lang={lang} />
      </main>

      {/* Footer */}
      <Footer lang={lang} />

      {/* Space Owner Onboarding Modal */}
      <OwnerModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        lang={lang}
      />

      {/* Web Booking Modal */}
      <WebBookingModal
        location={selectedBookingLocation}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        lang={lang}
      />

      {/* Cookie & Storage Disclosure Banner */}
      <CookieBanner />

    </div>
  );
}
