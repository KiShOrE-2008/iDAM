'use client';

import React from 'react';
import { MapPin, Ticket, User } from 'lucide-react';

type Tab = 'home' | 'passes' | 'profile';

interface AppTabBarProps {
  active: Tab;
  onHome?: () => void;
  onPasses?: () => void;
  onProfile?: () => void;
}

/** Bottom navigation shared by the driver app's three root screens */
export const AppTabBar: React.FC<AppTabBarProps> = ({ active, onHome, onPasses, onProfile }) => {
  const tabs: { id: Tab; label: string; icon: React.ReactNode; onClick?: () => void }[] = [
    { id: 'home', label: 'Find parking', icon: <MapPin className="w-[22px] h-[22px]" aria-hidden />, onClick: onHome },
    { id: 'passes', label: 'Passes', icon: <Ticket className="w-[22px] h-[22px]" aria-hidden />, onClick: onPasses },
    { id: 'profile', label: 'Account', icon: <User className="w-[22px] h-[22px]" aria-hidden />, onClick: onProfile },
  ];

  return (
    <nav className="bg-white border-t border-slate-200 grid grid-cols-3 z-20 pb-[env(safe-area-inset-bottom)]" aria-label="App">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={isActive ? undefined : tab.onClick}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-bold cursor-pointer ${
              isActive ? 'text-brand-700' : 'text-slate-500 active:text-ink'
            }`}
          >
            {isActive && <span className="absolute top-0 inset-x-6 h-[3px] bg-brand-700 rounded-b" aria-hidden />}
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};
