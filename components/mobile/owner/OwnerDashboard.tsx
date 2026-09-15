'use client';

import React from 'react';
import { TrendingUp, Users, Calendar, Star, Building2, Plus } from 'lucide-react';
import { OwnerParkingCard } from './OwnerParkingCard';
import { OwnerBookingList } from './OwnerBookingList';
import Link from 'next/link';

interface OwnerDashboardProps {
  onNavigateToExplore?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onNavigateToExplore }) => {
  return (
    <div className="space-y-3.5 animate-fade-in">
      
      {/* Owner Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-slate-900">Owner Dashboard</h3>
          <p className="text-[10px] text-slate-500 font-medium">Real-time revenue & space management</p>
        </div>
        <Link
          href="/list-your-space"
          className="bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xs flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Add Space</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase">Today</p>
          <p className="text-sm font-black text-emerald-800">₹1,240</p>
        </div>
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase">Occupancy</p>
          <p className="text-sm font-black text-slate-900">23/35</p>
        </div>
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase">Bookings</p>
          <p className="text-sm font-black text-slate-900">12</p>
        </div>
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase">Rating</p>
          <p className="text-sm font-black text-amber-600 flex items-center justify-center space-x-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            <span>4.8</span>
          </p>
        </div>
      </div>

      {/* Owner Parking Property Card */}
      <OwnerParkingCard />

      {/* Today's Incoming Bookings List */}
      <OwnerBookingList />

    </div>
  );
};
