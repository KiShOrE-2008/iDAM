import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      {!isOnline ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 border border-amber-500/30 text-amber-300 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div className="text-xs">
              <p className="font-semibold text-white">Offline Mode</p>
              <p className="text-slate-400">Internet connection lost. Displaying cached data.</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors shrink-0"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/30 text-emerald-300 shadow-2xl backdrop-blur-xl">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium text-white">Back online — connection restored</span>
        </div>
      )}
    </div>
  );
};
