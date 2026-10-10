'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CookieBanner } from './CookieBanner';
import { Language } from '@/types';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  titleTa?: string;
  subtitle?: string;
  subtitleTa?: string;
  badge?: string;
  breadcrumbs?: BreadcrumbItem[];
  lang?: Language;
  onLanguageToggle?: (lang: Language) => void;
  maxWidthClass?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  titleTa,
  subtitle,
  subtitleTa,
  badge,
  breadcrumbs = [],
  lang: controlledLang,
  onLanguageToggle: controlledToggle,
  maxWidthClass = 'max-w-5xl'
}) => {
  const [internalLang, setInternalLang] = useState<Language>('en');
  const lang = controlledLang || internalLang;
  const handleLangToggle = controlledToggle || setInternalLang;

  const displayTitle = lang === 'ta' && titleTa ? titleTa : title;
  const displaySubtitle = lang === 'ta' && subtitleTa ? subtitleTa : subtitle;

  return (
    <div className="min-h-screen bg-[#F8F8F5] text-[#14201D] font-sans antialiased selection:bg-emerald-200 selection:text-emerald-900 flex flex-col justify-between">
      
      {/* Shared Header Navigation */}
      <Navbar
        lang={lang}
        onLanguageToggle={handleLangToggle}
        onOpenOwnerModal={() => {}}
      />

      {/* Main Page Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className={`mx-auto ${maxWidthClass} space-y-8 animate-fade-in`}>
          
          {/* Breadcrumbs Navigation */}
          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumbs" className="flex items-center space-x-2 text-xs font-bold text-slate-500">
              <Link href="/" className="hover:text-emerald-800 transition-colors">Home</Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-emerald-800 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-900 font-extrabold">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Page Hero Header */}
          {(title || subtitle) && (
            <div className="space-y-3 border-b border-slate-200/80 pb-6">
              {badge && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black tracking-wide border border-emerald-300">
                  <span>{badge}</span>
                </div>
              )}
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight ${lang === 'ta' ? 'font-tamil' : ''}`}>
                {displayTitle}
              </h1>
              {displaySubtitle && (
                <p className={`text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-3xl ${lang === 'ta' ? 'font-tamil' : ''}`}>
                  {displaySubtitle}
                </p>
              )}
            </div>
          )}

          {/* Children Content */}
          <div className="space-y-8">
            {children}
          </div>

        </div>
      </main>

      {/* Shared Footer */}
      <Footer lang={lang} />

      {/* Cookie & Storage Disclosure Banner */}
      <CookieBanner />

    </div>
  );
};
