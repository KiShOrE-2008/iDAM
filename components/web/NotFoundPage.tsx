import React from 'react';
import { Compass, MapPin, Search, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      <header className="px-6 py-5 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-extrabold text-slate-950 text-base shadow-lg shadow-emerald-500/20">
              இ
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-wider text-base text-white">iDAM</span>
              <span className="text-[10px] text-emerald-400 font-medium -mt-1">இடம் • Smart Parking</span>
            </div>
          </a>
          <a
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Go to App
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 my-12">
        <div className="w-full max-w-lg text-center space-y-8">
          {/* Animated 404 Radar Visual */}
          <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping duration-1000" />
            <div className="absolute inset-4 rounded-full border border-emerald-500/30 animate-pulse" />
            <div className="w-24 h-24 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center shadow-2xl backdrop-blur-xl relative z-10">
              <Compass className="w-12 h-12 text-emerald-400" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono font-semibold">
              404 • PAGE NOT FOUND
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Looks like you took a wrong turn
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              We couldn't find the page or parking resource you were looking for. It may have moved or no longer exists.
            </p>
          </div>

          {/* Quick links to real parking locations */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-left space-y-2.5 max-w-md mx-auto">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Suggested Parking Hubs in Madurai:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <a
                href="/explore"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 transition-colors border border-slate-700/50"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Meenakshi Amman Temple</span>
              </a>
              <a
                href="/explore"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 transition-colors border border-slate-700/50"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Madurai Junction Station</span>
              </a>
              <a
                href="/explore"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 transition-colors border border-slate-700/50"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>South Masi Street</span>
              </a>
              <a
                href="/list-your-space"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 transition-colors border border-slate-700/50"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Host Your Parking Spot</span>
              </a>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all active:scale-95 border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Home className="w-4 h-4" />
              Return to Home
            </a>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-slate-900 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} iDAM (இடம்). All rights reserved.
      </footer>
    </div>
  );
};
