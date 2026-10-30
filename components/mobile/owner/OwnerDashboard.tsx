'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar, Star, Building2, Plus, QrCode, Car, Clock, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { OwnerParkingCard } from './OwnerParkingCard';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchSpaceActivity, type OwnerSpace } from '@/lib/owner/service';
import { Booking } from '@/types';

interface OwnerDashboardProps {
  /** Listing being managed ('loc-1' in demo mode) */
  spaceId: string;
  /** Real listing details; absent in demo mode */
  space?: OwnerSpace | null;
  onNavigateToExplore?: () => void;
  /** Omitted when this listing cannot verify passes yet (not approved / paused) */
  onNavigateToScanner?: () => void;
  onNavigateToParked?: () => void;
}

const SPACE_STATUS_LABEL: Record<OwnerSpace['status'], string> = {
  active: 'Open',
  inactive: 'Paused',
  pending_review: 'Awaiting approval',
  draft: 'Draft',
  suspended: 'Suspended'
};

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  spaceId,
  space,
  onNavigateToExplore,
  onNavigateToScanner,
  onNavigateToParked
}) => {
  const { isDemoMode } = useAuth();
  const [parkedCount, setParkedCount] = useState<number>(0);
  const [expectedArrivals, setExpectedArrivals] = useState<Booking[]>([]);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchSpaceActivity(spaceId, isDemoMode)
      .then((activity) => {
        if (!isMounted) return;
        setParkedCount(activity.parked.length);
        setExpectedArrivals(activity.arrivals);
        setTodayRevenue(activity.todayRevenue);
        setLoadError(null);
      })
      .catch((err) => {
        if (isMounted) setLoadError(err?.message || 'Could not load bookings for this space.');
      });
    return () => {
      isMounted = false;
    };
  }, [spaceId, isDemoMode]);

  const totalSpots = space ? space.carCapacity + space.bikeCapacity : 35;

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      
      {onNavigateToScanner && (
        <button
          onClick={onNavigateToScanner}
          className="w-full bg-brand-700 active:bg-brand-800 text-white rounded-lg p-1.5 cursor-pointer"
        >
          <span className="flex items-center gap-4 border-2 border-white/90 rounded-md px-4 py-4 text-left">
            <QrCode className="w-9 h-9 shrink-0" aria-hidden />
            <span className="flex-1">
              <span className="block text-lg font-black leading-tight">Scan a pass</span>
              <span className="block text-sm text-white/80">Check a driver in at the gate</span>
            </span>
            <ArrowRight className="w-5 h-5" aria-hidden />
          </span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {isDemoMode ? 'Sample data for the demo' : 'Live occupancy for your space'}
        </p>
        <div className="flex items-center gap-4">
          {!isDemoMode && (
            <Link href="/owner/payouts" className="text-sm font-bold text-brand-700">
              Payouts
            </Link>
          )}
          <Link href="/list-your-space" className="text-sm font-bold text-brand-700 flex items-center gap-1">
            <Plus className="w-4 h-4" aria-hidden />
            Add a space
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-4 border-y-2 border-ink divide-x divide-slate-300 bg-transparent">
        <div className="py-2.5 pr-2">
          <dt className="text-xs text-slate-500">Today</dt>
          <dd className="text-lg font-black tabular">₹{todayRevenue.toLocaleString('en-IN')}</dd>
        </div>
        <button type="button" onClick={onNavigateToParked} className="py-2.5 px-2 text-left cursor-pointer">
          <dt className="text-xs text-brand-700 underline underline-offset-2">Parked</dt>
          <dd className="text-lg font-black tabular">{parkedCount}</dd>
        </button>
        <div className="py-2.5 px-2">
          <dt className="text-xs text-slate-500">Spaces</dt>
          <dd className="text-lg font-black tabular">{totalSpots}</dd>
        </div>
        <div className="py-2.5 pl-2">
          <dt className="text-xs text-slate-500">Rating</dt>
          <dd className="text-lg font-black tabular flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" aria-hidden />
            {isDemoMode ? '4.8' : '—'}
          </dd>
        </div>
      </dl>

      {loadError && (
        <div role="alert" className="text-[11px] font-semibold text-red-800 bg-red-50 border border-red-200 p-3 rounded-2xl">
          {loadError}
        </div>
      )}

      {/* Currently Parked Quick Bar */}
      {onNavigateToParked && (
        <div
          onClick={onNavigateToParked}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-brand-300 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-100 text-brand-800">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 block">Currently Parked Vehicles</span>
              <span className="text-[10px] text-slate-500 font-medium">
                {parkedCount} vehicle{parkedCount !== 1 ? 's' : ''} currently inside • Tap to check out
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-brand-700 flex items-center space-x-1">
            <span>Manage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Owner Parking Property Card */}
      {space ? (
        <OwnerParkingCard
          title={space.title}
          address={space.address}
          status={SPACE_STATUS_LABEL[space.status] || space.status}
          occupied={parkedCount}
          total={totalSpots}
          rateCar={space.rateCar}
          rateBike={space.rateBike}
        />
      ) : (
        <OwnerParkingCard />
      )}

      {/* EXPECTED ARRIVALS SECTION (Populated from booking data) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-brand-600" />
            <h4 className="font-black text-xs text-slate-900">Expected Arrivals</h4>
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
                    <Car className="w-3.5 h-3.5 text-brand-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="tabular font-black text-slate-900 text-xs">
                        {arrival.vehicleNumber || 'TN 59 AB 1234'}
                      </span>
                      <span className="text-[9px] bg-brand-100 text-brand-900 font-black px-1.5 py-0.2 rounded">
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
