'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Smartphone, Monitor } from 'lucide-react';
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
import { WebBookingModal } from '@/components/web/WebBookingModal';
import { Footer } from '@/components/Footer';
import { Language, ParkingLocation } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';

export default function Home() {
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

  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      setDemoViewMode('mobile_standalone');
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

  // Standalone Full-Screen Mobile App View
  if (demoViewMode === 'mobile_standalone') {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden font-sans select-none">
        
        {/* Top Viewport Mode Switcher Banner */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 z-50">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-white">iDAM Mobile App Live Demo</span>
          </div>

          <button
            onClick={() => setDemoViewMode('web')}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1 rounded-full text-[11px] font-extrabold transition-all"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Switch to Web Landing View</span>
          </button>
        </div>

        {/* Mobile Viewport Container */}
        <div className="flex-1 relative overflow-hidden bg-white max-w-[440px] mx-auto w-full border-x border-slate-800 shadow-2xl">
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
                setBookingDetails({
                  ...bookingDetails,
                  ...details
                });
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

      {/* Web Booking Modal */}
      <WebBookingModal
        location={selectedBookingLocation}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        lang={lang}
      />

    </div>
  );
}
