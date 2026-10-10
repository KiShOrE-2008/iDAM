'use client';

import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { useBackNavigation } from '@/context/BackNavigationContext';

export const CapacitorBackButtonHandler: React.FC = () => {
  const { showExitDialog, confirmExitApp, cancelExitApp, triggerBackButton } = useBackNavigation();

  const triggerRef = useRef(triggerBackButton);
  triggerRef.current = triggerBackButton;

  // Single mount listener registration
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | null = null;
    let isMounted = true;

    const setupListener = async () => {
      try {
        const handle = await App.addListener('backButton', (event) => {
          if (triggerRef.current) {
            triggerRef.current(event?.canGoBack);
          }
        });

        if (!isMounted) {
          handle.remove();
        } else {
          removeListener = () => {
            handle.remove();
          };
        }
      } catch (err) {
        console.warn('Failed to register Capacitor backButton listener:', err);
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  if (!showExitDialog) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl max-w-xs w-full text-center space-y-4 border border-slate-200 animate-scale-in relative">
        
        {/* Close Icon Button */}
        <button
          onClick={cancelExitApp}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
          aria-label="Stay"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-7 h-7" />
        </div>

        {/* Dialog Text */}
        <div className="space-y-1.5">
          <h3 className="font-black text-xl text-slate-900 tracking-tight">Exit iDAM?</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Are you sure you want to close the app? Your active reservations and passes remain safely saved.
          </p>
        </div>

        {/* Actions: Stay & Exit app */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={cancelExitApp}
            className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all active:scale-95"
          >
            Stay
          </button>
          <button
            onClick={confirmExitApp}
            className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit app</span>
          </button>
        </div>

      </div>
    </div>
  );
};
