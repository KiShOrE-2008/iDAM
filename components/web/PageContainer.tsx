'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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
  /** Kept for existing callers; no longer shown (eyebrow labels were removed from the design) */
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

  breadcrumbs = [],
  lang: controlledLang,
  onLanguageToggle: controlledToggle,
  maxWidthClass = 'max-w-5xl'
}) => {
  const router = useRouter();
  const [internalLang, setInternalLang] = useState<Language>('en');
  const lang = controlledLang || internalLang;
  const handleLangToggle = controlledToggle || setInternalLang;

  const displayTitle = lang === 'ta' && titleTa ? titleTa : title;
  const displaySubtitle = lang === 'ta' && subtitleTa ? subtitleTa : subtitle;

  return (
    <div className="min-h-screen bg-limewash text-ink flex flex-col justify-between">
      
      {/* Shared Header Navigation */}
      <Navbar
        lang={lang}
        onLanguageToggle={handleLangToggle}
        onOpenOwnerModal={() => router.push('/list-your-space')}
      />

      {/* Main Page Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <div className={`mx-auto ${maxWidthClass} space-y-8 animate-fade-in`}>
          
          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-sm text-slate-500">
              <Link href="/" className="hover:text-ink hover:underline underline-offset-4">Home</Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-ink hover:underline underline-offset-4">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-ink font-semibold" aria-current="page">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {(title || subtitle) && (
            <header className="border-b-2 border-ink pb-7">
              <h1 className={`text-4xl sm:text-5xl lg:text-[3.6rem] font-black text-ink tracking-[-0.02em] leading-[1.02] max-w-4xl ${lang === 'ta' ? 'font-tamil leading-tight' : ''}`}>
                {displayTitle}
              </h1>
              {displaySubtitle && (
                <p className={`mt-4 text-lg text-slate-600 leading-relaxed max-w-2xl ${lang === 'ta' ? 'font-tamil' : ''}`}>
                  {displaySubtitle}
                </p>
              )}
            </header>
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
