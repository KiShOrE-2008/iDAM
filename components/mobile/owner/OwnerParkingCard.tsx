'use client';

import React from 'react';
import { Building2, MapPin, Car, Bike, Settings, Zap } from 'lucide-react';

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
  status = 'Open',
  occupied = 23,
  total = 35,
  rateCar = 40,
  rateBike = 20,
  onManage
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-xs text-slate-900">{title}</h4>
            <p className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]">{address}</p>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-black flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>● {status}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
          <span className="text-slate-500 text-[10px]">Occupancy</span>
          <span className="font-black text-slate-900">{occupied} / {total}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
          <span className="text-slate-500 text-[10px]">Rates</span>
          <span className="font-black text-emerald-800">₹{rateCar}/hr</span>
        </div>
      </div>

      <button
        onClick={onManage}
        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1 transition-colors"
      >
        <Settings className="w-3.5 h-3.5 text-emerald-400" />
        <span>Manage Space Settings</span>
      </button>
    </div>
  );
};
