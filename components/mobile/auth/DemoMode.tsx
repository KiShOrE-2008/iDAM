'use client';

import React from 'react';
import { Car, Building2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export const DemoMode: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { startDemo } = useAuth();
  const router = useRouter();

  const handleDemoLaunch = (role: 'driver' | 'owner') => {
    startDemo(role);
    if (onComplete) {
      onComplete();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
      <div className="flex items-center justify-center space-x-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>DEMO MODE • Quick Access</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleDemoLaunch('driver')}
          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-black border border-slate-200 transition-all flex items-center justify-center space-x-1.5 active:scale-95 shadow-2xs"
        >
          <Car className="w-3.5 h-3.5 text-emerald-700" />
          <span>Driver Demo</span>
        </button>

        <button
          type="button"
          onClick={() => handleDemoLaunch('owner')}
          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-black border border-slate-200 transition-all flex items-center justify-center space-x-1.5 active:scale-95 shadow-2xs"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-700" />
          <span>Owner Demo</span>
        </button>
      </div>
      <p className="text-[10px] text-slate-400 text-center font-medium">Explore live workflows without creating an account</p>
    </div>
  );
};
