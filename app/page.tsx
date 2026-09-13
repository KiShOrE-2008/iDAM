'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { WebExplorer } from '@/components/WebExplorer';
import { SplashScreen } from '@/components/mobile/SplashScreen';
import { ExploreScreen } from '@/components/mobile/ExploreScreen';
import { ParkingDetailsScreen } from '@/components/mobile/ParkingDetailsScreen';
import { BookingScreen } from '@/components/mobile/BookingScreen';
import { PaymentScreen } from '@/components/mobile/PaymentScreen';
import { SuccessPassScreen } from '@/components/mobile/SuccessPassScreen';
import { ProfileDashboardScreen } from '@/components/mobile/ProfileDashboardScreen';
import { SupportHubScreen } from '@/components/mobile/SupportHubScreen';
import { MobileSimulator } from '@/components/mobile/MobileSimulator';
import { OwnerModal } from '@/components/OwnerModal';
import { Footer } from '@/components/Footer';
import { Language, ParkingLocation } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNativeApp, setIsNativeApp] = useState(false);

  // Native Mobile Flow State
  const [nativeStep, setNativeStep] = useState<number>(1);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation>(MOCK_PARKING_LOCATIONS[0]);
  const [bookingDetails, setBookingDetails] = useState({
    date: '12 Sep',
    time: '10:00',
    duration: 2,
    total: 85
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      setIsNativeApp(true);
    }
  }, []);

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

  // If launched as a Native Android App via Capacitor, show full-screen mobile app screens
  if (isNativeApp) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col overflow-hidden font-sans">
        <div className="flex-1 relative overflow-hidden">
          {nativeStep === 1 && (
            <SplashScreen lang={lang} onNext={() => setNativeStep(2)} />
          )}

          {nativeStep === 2 && (
            <ExploreScreen
              locations={locations.length > 0 ? locations : MOCK_PARKING_LOCATIONS}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
              onNext={() => setNativeStep(3)}
              lang={lang}
              onNavigateToProfile={() => setNativeStep(7)}
              onNavigateToBookings={() => setNativeStep(7)}
            />
          )}

          {nativeStep === 3 && (
            <ParkingDetailsScreen
              location={selectedLocation}
              onBack={() => setNativeStep(2)}
              onNext={() => setNativeStep(4)}
              lang={lang}
            />
          )}

          {nativeStep === 4 && (
            <BookingScreen
              location={selectedLocation}
              onBack={() => setNativeStep(3)}
              onNext={(details) => {
                setBookingDetails(details);
                setNativeStep(5);
              }}
              lang={lang}
            />
          )}

          {nativeStep === 5 && (
            <PaymentScreen
              location={selectedLocation}
              bookingDetails={bookingDetails}
              onBack={() => setNativeStep(4)}
              onPaySuccess={() => setNativeStep(6)}
              lang={lang}
            />
          )}

          {nativeStep === 6 && (
            <SuccessPassScreen
              location={selectedLocation}
              bookingDetails={bookingDetails}
              onReset={() => setNativeStep(7)}
              lang={lang}
            />
          )}

          {nativeStep === 7 && (
            <ProfileDashboardScreen
              lang={lang}
              onBack={() => setNativeStep(2)}
              onNavigateToSupport={() => setNativeStep(8)}
            />
          )}

          {nativeStep === 8 && (
            <SupportHubScreen
              lang={lang}
              onBack={() => setNativeStep(7)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased selection:bg-emerald-200 selection:text-emerald-900">
      
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
          onSelectLocation={() => {}}
        />

        {/* Interactive Mobile Application Experience Simulator */}
        <MobileSimulator
          locations={locations}
          lang={lang}
        />

        {/* How It Works & Owner Monetization Section */}
        <HowItWorks
          lang={lang}
          onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
        />
      </main>

      {/* Footer */}
      <Footer lang={lang} />

      {/* Space Owner Onboarding Modal */}
      <OwnerModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        lang={lang}
      />

    </div>
  );
}
