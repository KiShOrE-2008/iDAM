'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { WebExplorer } from '@/components/WebExplorer';
import { MobileSimulator } from '@/components/mobile/MobileSimulator';
import { SplashScreen } from '@/components/mobile/SplashScreen';
import { ExploreScreen } from '@/components/mobile/ExploreScreen';
import { ParkingDetailsScreen } from '@/components/mobile/ParkingDetailsScreen';
import { BookingScreen } from '@/components/mobile/BookingScreen';
import { PaymentScreen } from '@/components/mobile/PaymentScreen';
import { SuccessPassScreen } from '@/components/mobile/SuccessPassScreen';
import { OwnerModal } from '@/components/OwnerModal';
import { Footer } from '@/components/Footer';
import { Language, ParkingLocation } from '@/types';
import { getParkingLocations } from '@/lib/parking/service';
import { MOCK_PARKING_LOCATIONS } from '@/lib/data/mockData';
import { Smartphone, Monitor } from 'lucide-react';

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const [activeView, setActiveView] = useState<'web' | 'mobile'>('web');
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


  const handleSelectLocation = (loc: ParkingLocation) => {
    setActiveView('mobile');
    const elem = document.getElementById('mobile-demo');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
              onReset={() => setNativeStep(1)}
              lang={lang}
            />
          )}
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Top Banner View Mode Switcher */}
      <div className="bg-emerald-950 text-white text-xs font-semibold py-2 px-4 text-center border-b border-emerald-900 flex items-center justify-center space-x-4">
        <span>📍 IDAM | இடம் - Madurai Smart Parking Platform Demo</span>
        <div className="hidden sm:flex items-center space-x-2 bg-emerald-900/90 px-3 py-1 rounded-full border border-emerald-700/50">
          <button
            onClick={() => setActiveView('web')}
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full transition-all ${
              activeView === 'web' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Web Platform</span>
          </button>
          <button
            onClick={() => setActiveView('mobile')}
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full transition-all ${
              activeView === 'mobile' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile App Flow</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenOwnerModal={() => setIsOwnerModalOpen(true)}
      />

      {/* Content Rendering based on Active View or Integrated Scroll */}
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
          onSelectLocation={handleSelectLocation}
        />

        {/* Interactive 6-Screen Mobile App Simulator */}
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
