'use client';

import React from 'react';
import { Calendar, Clock, Car, Bike, CheckCircle2 } from 'lucide-react';

export const OwnerBookingList: React.FC = () => {
  const mockBookings = [
    { time: '10:00 AM', vehicle: 'TN 59 AB 1234', type: 'Car', slot: 'A-02', status: 'Confirmed' },
    { time: '11:30 AM', vehicle: 'TN 59 C 5678', type: 'Bike', slot: 'B-04', status: 'Confirmed' },
    { time: '01:00 PM', vehicle: 'TN 59 EF 9012', type: 'Car', slot: 'A-05', status: 'Completed' }
  ];

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <h4 className="font-black text-slate-900 uppercase tracking-wider">Today&apos;s Bookings</h4>
        <span className="font-extrabold text-emerald-800 text-[11px]">3 Reserved</span>
      </div>

      <div className="space-y-1.5 text-xs">
        {mockBookings.map((b, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 w-16">{b.time}</span>
              <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[9px] font-mono">
                {b.vehicle}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-500">Slot {b.slot}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-black">
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
