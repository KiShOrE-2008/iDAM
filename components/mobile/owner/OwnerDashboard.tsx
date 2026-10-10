'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, Star, Building2, Plus, QrCode, Car, Clock, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { OwnerParkingCard } from './OwnerParkingCard';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getCurrentlyParkedBookings, getExpectedArrivalBookings } from '@/lib/parking/checkInService';
import { Booking } from '@/types';

interface OwnerDashboardProps {
  onNavigateToExplore?: () => void;
  onNavigateToScanner?: () => void;
  onNavigateToParked?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onNavigateToExplore,
  onNavigateToScanner,
  onNavigateToParked
}) => {
  const { isDemoMode } = useAuth();
  const [parkedCount, setParkedCount] = useState<number>(1);
  const [expectedArrivals, setExpectedArrivals] = useState<Booking[]>([]);

  useEffect(() => {
    const parked = getCurrentlyParkedBookings('loc-1');
    const arrivals = getExpectedArrivalBookings('loc-1');
    setParkedCount(parked.length);
    setExpectedArrivals(arrivals);
  }, []);

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      
      {/* Owner Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5">
            <h3 className="font-black text-sm text-slate-900">Owner Portal</h3>
            {isDemoMode && (
              <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-full font-black">
                DEMO MODE
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Real-time occupancy & QR pass verification</p>
        </div>
        <Link
          href="/list-your-space"
          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xs flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Add Space</span>
        </Link>
      </div>

      {/* PROMINENT ACTION: SCAN PARKING PASS */}
      {onNavigateToScanner && (
        <button
          onClick={onNavigateToScanner}
          className="w-full p-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-3xl font-black text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-between transition-all active:scale-98 border border-emerald-400/30 group"
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="block text-sm font-black leading-tight">Scan Parking Pass</span>
              <span className="text-[11px] text-emerald-100 font-medium">Fast camera verification & check-in</span>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </button>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase">Today Rev</p>
          <p className="text-sm font-black text-emerald-800">₹1,240</p>
        </div>
        
        {/* Clickable Currently Parked Metric Tile */}
        <button
          type="button"
          onClick={onNavigateToParked}
          className="bg-white hover:bg-emerald-50/50 p-2.5 rounded-2xl border border-slate-200 shadow-2xs text-center transition-all cursor-pointer group"
        >
          <p className="text-[9px] font-extrabold text-emerald-700 uppercase group-hover:underline">Parked</p>
          <p className="text-sm font-black text-slate-900 flex items-center justify-center space-x-1">
            <span>{parkedCount}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </p>
        </button>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase">Total Spots</p>
          <p className="text-sm font-black text-slate-900">35</p>
        </div>
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase">Rating</p>
          <p className="text-sm font-black text-amber-600 flex items-center justify-center space-x-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            <span>4.8</span>
          </p>
        </div>
      </div>

      {/* Currently Parked Quick Bar */}
      {onNavigateToParked && (
        <div
          onClick={onNavigateToParked}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 block">Currently Parked Vehicles</span>
              <span className="text-[10px] text-slate-500 font-medium">
                {parkedCount} vehicle{parkedCount !== 1 ? 's' : ''} currently inside • Tap to check out
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-700 flex items-center space-x-1">
            <span>Manage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Owner Parking Property Card */}
      <OwnerParkingCard />

      {/* EXPECTED ARRIVALS SECTION (Populated from booking data) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Expected Arrivals</h4>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-full">
            {expectedArrivals.length} Confirmed
          </span>
        </div>

        <div className="space-y-2">
          {expectedArrivals.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2 font-medium">No more expected arrivals today</p>
          ) : (
            expectedArrivals.map((arrival) => (
              <div
                key={arrival.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700">
                    <Car className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-black text-slate-900 text-xs">
                        {arrival.vehicleNumber || 'TN 59 AB 1234'}
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-900 font-black px-1.5 py-0.2 rounded">
                        {arrival.passCode}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Slot: {arrival.startTime} - {arrival.endTime}
                    </span>
                  </div>
                </div>

                {onNavigateToScanner && (
                  <button
                    onClick={onNavigateToScanner}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black transition-all"
                  >
                    Scan In
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-900 font-semibold space-y-1">
          <div className="flex items-center space-x-1.5 font-black">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Investor & Demo Mode Active</span>
          </div>
          <p className="text-[10px] text-amber-800 leading-relaxed">
            You are operating the Meenakshi Temple Square Owner portal in demo mode. Test passes and check-in workflows are isolated and safe.
          </p>
        </div>
      )}

    </div>
  );
};
