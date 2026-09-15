'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language } from '@/types';
import { LoginForm } from '@/components/mobile/auth/LoginForm';

export default function LoginPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <div className="min-h-screen bg-[#F8F8F5] flex flex-col justify-between font-sans selection:bg-emerald-200 text-slate-900">
      
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <div className="max-w-md mx-auto px-4 py-10 w-full flex-1 flex flex-col justify-center">
        
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-extrabold text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Clean Login Card Component */}
        <LoginForm />

      </div>

      <Footer lang={lang} />

    </div>
  );
}
