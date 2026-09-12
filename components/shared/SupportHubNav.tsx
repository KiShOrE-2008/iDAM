'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, Mail, AlertTriangle, ArrowLeft } from 'lucide-react';

interface SupportHubNavProps {
  activeTab: 'help' | 'contact' | 'report';
}

export const SupportHubNav: React.FC<SupportHubNavProps> = ({ activeTab }) => {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-emerald-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      {/* Support Hub Header Badge */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-emerald-900/50">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-bold mb-3">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>IDAM Support Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            How can we assist you today?
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Search our knowledge base, speak with customer support, or report a parking issue.
          </p>
        </div>

        {/* Tab Switcher Bar */}
        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex items-center space-x-1 text-xs font-bold shrink-0 w-full sm:w-auto">
          <Link
            href="/help"
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'help'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help Center</span>
          </Link>

          <Link
            href="/contact"
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'contact'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Contact Us</span>
          </Link>

          <Link
            href="/report-issue"
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'report'
                ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report an Issue</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
