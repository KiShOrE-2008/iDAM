'use client';

import React, { useState } from 'react';
import { Building2, MapPin, Car, Bike, Settings, Zap, Check, X, ShieldCheck } from 'lucide-react';

interface OwnerParkingCardProps {
  title?: string;
  address?: string;
  status?: string;
  occupied?: number;
  total?: number;
  rateCar?: number;
  rateBike?: number;
  onManage?: () => void;
}

export const OwnerParkingCard: React.FC<OwnerParkingCardProps> = ({
  title = 'Temple Area Parking',
  address = '124 West Masi Street, Madurai',
  status: initialStatus = 'Open',
  occupied = 23,
  total = 35,
  rateCar: initialRateCar = 40,
  rateBike: initialRateBike = 20,
  onManage
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus);
  const [carRate, setCarRate] = useState<number>(initialRateCar);
  const [bikeRate, setBikeRate] = useState<number>(initialRateBike);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSaveSettings = () => {
    setSavedNotice(true);
    setShowSettingsModal(false);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const getStatusBadge = (st: string) => {
    if (st === 'Open') {
      return (
        <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full font-black flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Open</span>
        </span>
      );
    }
    if (st === 'Full') {
      return (
        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-black">
          ● Full
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-0.5 rounded-full font-black">
        ● Maintenance
      </span>
    );
  };

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-md space-y-3 relative">
      
      {savedNotice && (
        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-md animate-scale-in flex items-center space-x-1 z-10">
          <Check className="w-3 h-3" />
          <span>Rates & Status Updated!</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shadow-inner">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-xs text-slate-900">{title}</h4>
            <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[170px]">{address}</p>
          </div>
        </div>
        {getStatusBadge(currentStatus)}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <span className="text-slate-500 text-[10px] font-bold">Live Occupancy</span>
          <span className="font-black text-slate-900">{occupied} / {total}</span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <span className="text-slate-500 text-[10px] font-bold">Rates (Car/Bike)</span>
          <span className="font-black text-emerald-800">₹{carRate} / ₹{bikeRate}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (onManage) onManage();
          else setShowSettingsModal(true);
        }}
        className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
      >
        <Settings className="w-3.5 h-3.5 text-emerald-400" />
        <span>Manage Spot Rates & Status</span>
      </button>

      {/* Spot Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white w-full max-w-xs rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider">Spot Controls</h4>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Availability Status
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-black">
                {['Open', 'Full', 'Maintenance'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCurrentStatus(st)}
                    className={`py-2 rounded-xl transition-all ${
                      currentStatus === st
                        ? 'bg-slate-950 text-white shadow-xs ring-1 ring-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Car Hourly Rate */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Car Hourly Rate (₹)
              </label>
              <div className="flex items-center space-x-2">
                {[30, 40, 50, 60].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setCarRate(rate)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                      carRate === rate
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ₹{rate}
                  </button>
                ))}
              </div>
            </div>

            {/* Bike Hourly Rate */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Bike Hourly Rate (₹)
              </label>
              <div className="flex items-center space-x-2">
                {[15, 20, 25, 30].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setBikeRate(rate)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                      bikeRate === rate
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ₹{rate}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
