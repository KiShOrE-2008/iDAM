'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WebExplorer } from '@/components/WebExplorer';
import { WebBookingModal } from '@/components/WebBookingModal';
import { OwnerModal } from '@/components/OwnerModal';
import { useRegisterModal } from '@/context/BackNavigationContext';
import { ParkingLocation, Language } from '@/types';

export default function ExplorePage() {
  const [lang, setLang] = useState<Language>('en');
  const [bookingSpot, setBookingSpot] = useState<ParkingLocation | null>(null);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  // Register open modals with Back navigation stack
  useRegisterModal(Boolean(bookingSpot), () => setBookingSpot(null), 'explore-booking-modal');
  useRegisterModal(isOwnerModalOpen, () => setIsOwnerModalOpen(false), 'explore-owner-modal');

  return (
    <div className="min-h-screen bg-limewash text-ink flex flex-col">
      <Navbar lang={lang} onLanguageToggle={setLang} onOpenOwnerModal={() => setIsOwnerModalOpen(true)} />

      <main className="flex-1">
        <WebExplorer lang={lang} onSelectLocation={setBookingSpot} asPage />
      </main>

      <Footer lang={lang} />

      <WebBookingModal location={bookingSpot} isOpen={Boolean(bookingSpot)} onClose={() => setBookingSpot(null)} lang={lang} />
      <OwnerModal isOpen={isOwnerModalOpen} onClose={() => setIsOwnerModalOpen(false)} lang={lang} />
    </div>
  );
}
