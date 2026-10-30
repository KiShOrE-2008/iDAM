'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Smartphone } from 'lucide-react';
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
import { Booking, BookingRequest, Language, ParkingLocation } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { createBooking } from '@/lib/booking/service';
import { bookAndPay, checkoutErrorMessage } from '@/lib/payment/checkout';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

import { useBackNavigation, useRegisterModal } from '@/context/BackNavigationContext';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { isAuthenticated, profile } = useAuth();
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
  const [resumeStepAfterAuth, setResumeStepAfterAuth] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation>(MOCK_PARKING_LOCATIONS[0]);
  const [bookingDetails, setBookingDetails] = useState<{
    date: string;
    time: string;
    bookingDate?: string;
    startTime?: string;
    vehicleType?: 'car' | 'bike';
    duration: number;
    total: number;
    vehicleNumber?: string;
    addons?: string[];
  }>({
    date: '12 Sep',
    time: '10:00 AM',
    duration: 2,
    total: 85,
    vehicleNumber: 'TN 59 AB 1234',
    addons: ['EV Fast Charge']
  });

  const nativeBookingRequest = (meta?: { paymentId?: string; paymentMethod?: string }): BookingRequest => ({
    parkingLocationId: selectedLocation.id,
    vehicleType: bookingDetails.vehicleType || 'car',
    bookingDate: bookingDetails.bookingDate || new Date().toISOString().split('T')[0],
    startTime: bookingDetails.startTime || '10:00',
    durationHours: bookingDetails.duration,
    basePrice: bookingDetails.total,
    platformFee: 5,
    totalAmount: bookingDetails.total,
    paymentMethod: meta?.paymentMethod || 'Razorpay',
    paymentId: meta?.paymentId,
    vehicleNumber: bookingDetails.vehicleNumber,
    driverName: profile?.name,
    driverPhone: profile?.phone,
    addons: bookingDetails.addons
  });

  // Only called once a booking really exists (demo pass, or server-created booking)
  const showNativePass = (booking: Booking, meta?: { paymentId?: string; paymentMethod?: string }) => {
    setBookingDetails((prev) => ({
      ...prev,
      ...meta,
      total: booking.totalAmount,
      passCode: booking.passCode,
      qrData: booking.qrData
    } as any));
    setNativeStep(7);
  };

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
              onSuccess={() => {
                // Back to the payment step if sign-in was needed to finish a booking
                setNativeStep(resumeStepAfterAuth ?? 3);
                setResumeStepAfterAuth(null);
              }}
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
                // Demo mode only: simulated payment, local demo pass
                try {
                  const booking = await createBooking(selectedLocation, nativeBookingRequest(meta), { isDemoMode: true });
                  showNativePass(booking, meta);
                } catch (err) {
                  console.warn('Booking creation error:', err);
                  window.alert(checkoutErrorMessage(err) || 'Booking failed. Please try again.');
                }
              }}
              onRequireSignIn={() => {
                setResumeStepAfterAuth(6);
                setNativeStep(2);
              }}
              onLivePay={async () => {
                const { booking, confirmed } = await bookAndPay(selectedLocation, nativeBookingRequest(), {
                  name: profile?.name,
                  email: profile?.email,
                  phone: profile?.phone
                });
                if (!confirmed) {
                  window.alert('Payment received. We are confirming it with Razorpay; your pass in My Passes will activate within a minute or two.');
                }
                showNativePass(booking, { paymentId: booking.paymentId, paymentMethod: 'Razorpay' });
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
    <div className="min-h-screen bg-limewash text-ink">
      
      {/* Demo switcher: opens the phone app full screen */}
      <div className="bg-asphalt text-white/80 text-[13px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4">
          <span className="truncate">You&apos;re viewing the website. iDAM is also a phone app.</span>
          <button
            onClick={() => setDemoViewMode('mobile_standalone')}
            className="flex items-center gap-1.5 font-bold text-amber-300 hover:text-amber-200 whitespace-nowrap cursor-pointer"
          >
            <Smartphone className="w-4 h-4" aria-hidden />
            Open the app
          </button>
        </div>
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
          locations={locations}
          onPickLocation={(loc) => {
            setSelectedBookingLocation(loc);
            setIsBookingModalOpen(true);
          }}
        />

        {/* Real-time Discovery Map & Search */}
        <WebExplorer
          lang={lang}
          query={searchQuery}
          onClearQuery={() => setSearchQuery('')}
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
