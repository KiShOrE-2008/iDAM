'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/web/PageContainer';
import { Language } from '@/types';
import { Eye, CheckCircle2, Monitor, Smartphone, MessageSquare, HeartHandshake } from 'lucide-react';

export default function AccessibilityStatementPage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <PageContainer
      title="Accessibility Statement"
      titleTa="அணுகல்தன்மை அறிக்கை"
      subtitle="Our commitment to ensuring iDAM | இடம் is universally accessible to all drivers and property owners, including users with visual, auditory, cognitive, or physical impairments."
      subtitleTa="அனைத்து பயனர்களுக்கும் iDAM சமமான அணுகலை உறுதி செய்வதற்கான எங்கள் உறுதிப்பாடு."
      badge="Universal Design"
      breadcrumbs={[{ label: 'Accessibility' }]}
      lang={lang}
      onLanguageToggle={setLang}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-md space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
        
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs text-slate-400 font-bold">
            Standard: Web Content Accessibility Guidelines (WCAG) 2.1 Level AA • Status: Active Implementation
          </p>
        </div>

        {/* 1. Commitment */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
            1. Our Commitment to Universal Access
          </h2>
          <p>
            At <strong>iDAM | இடம்</strong>, we believe finding parking should be effortless and barrier-free for everyone. We design and develop our mobile Android app and web platforms in alignment with the World Wide Web Consortium (W3C) <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> standards.
          </p>
        </section>

        {/* 2. Key Pillars of Accessibility */}
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900">2. Built-in Accessibility Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Eye className="w-4 h-4 text-emerald-600" />
                Color Contrast & Typography
              </div>
              <p className="text-xs text-slate-600">
                Our Warm Minimal palette uses high-contrast text (<span className="font-mono text-slate-900 font-bold">#14201D</span> on <span className="font-mono text-slate-900 font-bold">#F8F8F5</span> and white surfaces) achieving a contrast ratio well above the required 4.5:1 ratio for normal body copy and 3:1 for large text.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Monitor className="w-4 h-4 text-emerald-600" />
                Screen Reader Compatibility
              </div>
              <p className="text-xs text-slate-600">
                Interactive elements include meaningful semantic HTML5 tags (<code className="text-emerald-700">&lt;main&gt;</code>, <code className="text-emerald-700">&lt;nav&gt;</code>, <code className="text-emerald-700">&lt;button&gt;</code>) and explicit <code className="text-emerald-700">aria-label</code> tags on icon-only buttons, parking filters, and status badges.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Touch Target Sizing & Haptics
              </div>
              <p className="text-xs text-slate-600">
                All clickable buttons, slot cards, and navigation items maintain minimum touch targets of at least 44×44 CSS pixels on touchscreen mobile displays. QR pass validation features optional haptic feedback confirmation.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Bilingual Language Support
              </div>
              <p className="text-xs text-slate-600">
                iDAM offers native Tamil language rendering (<span className="font-tamil font-bold">தமிழ் எழுத்துரு</span>) alongside English, allowing regional drivers to comfortably reserve parking and understand gate entry instructions.
              </p>
            </div>

          </div>
        </section>

        {/* 3. Keyboard Navigation */}
        <section className="space-y-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900">3. Keyboard & Assistive Device Navigation</h2>
          <p>
            All critical workflows—searching for parking, selecting a slot, reserving a pass, reviewing receipts, and accessing legal terms—can be navigated using standard keyboard controls (<kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Tab</kbd>, <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Shift + Tab</kbd>, <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Enter</kbd>, and <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">Escape</kbd>).
          </p>
        </section>

        {/* 4. Feedback and Barrier Reporting */}
        <section className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            4. Report an Accessibility Barrier
          </h2>
          <p>
            We continually test and improve our application. If you experience difficulty accessing any part of our website, reservation workflow, or QR pass reader, please let us know:
          </p>
          <div className="space-y-1 text-slate-800 font-semibold text-xs">
            <p>• <strong>Accessibility Team Email:</strong> <a href="mailto:support@idam.park?subject=Accessibility%20Barrier" className="text-emerald-700 font-black underline">support@idam.park</a></p>
            <p>• <strong>Response Commitment:</strong> We investigate all accessibility reports within 2 business days.</p>
          </div>
          <div className="pt-2">
            <Link
              href="/contact?category=accessibility"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-xs"
            >
              Submit Feedback via Support Form
            </Link>
          </div>
        </section>

      </div>
    </PageContainer>
  );
}
