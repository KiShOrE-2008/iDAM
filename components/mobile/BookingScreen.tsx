'use client';

import React, { useState, useMemo } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';

interface BookingScreenProps {
  location: ParkingLocation;
  onBack: () => void;
  onNext: (bookingDetails: { date: string; time: string; duration: number; total: number }) => void;
  lang: Language;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({
  location,
  onBack,
  onNext,
  lang
}) => {
  const today = new Date();
  const dateOptions = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
      const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return { day, date };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedDate, setSelectedDate] = useState(dateOptions[0].date);
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [duration, setDuration] = useState(2);

  const hourlyRate = location.hourlyRateCar || 40;
  const basePrice = hourlyRate * duration;
  const platformFee = 5;
  const total = basePrice + platformFee;

  const handleContinue = () => {
    onNext({
      date: selectedDate,
      time: selectedTime,
      duration,
      total
    });
  };

  return (
    <div className="h-full flex flex-col justify-between bg-white relative overflow-y-auto no-scrollbar">
      
      {/* Top Bar */}
      <div className="pt-3 px-4 pb-3 flex items-center space-x-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-extrabold text-gray-900 text-sm">Select date & time</h3>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6 flex-1">
        
        {/* Date Selector Pills */}
        <div className="grid grid-cols-4 gap-2">
          {dateOptions.map((item, idx) => {
            const isSelected = selectedDate === item.date;
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(item.date)}
                className={`py-2 px-1 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-emerald-950 text-white shadow-sm font-bold'
                    : 'bg-gray-50 text-gray-700 border border-gray-100'
                }`}
              >
                <div className="text-[10px] opacity-80">{item.day}</div>
                <div className="text-xs font-bold mt-0.5">{item.date}</div>
              </button>
            );
          })}
        </div>

        {/* Start Time Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800">Start time</label>
          <div className="grid grid-cols-4 gap-2">
            {['9:00', '10:00', '11:00', '12:00'].map((tVal) => {
              const isSelected = selectedTime === tVal;
              return (
                <button
                  key={tVal}
                  onClick={() => setSelectedTime(tVal)}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    isSelected
                      ? 'bg-emerald-950 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tVal}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration Stepper Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800">Duration</label>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <button
              onClick={() => setDuration(Math.max(1, duration - 1))}
              className="w-8 h-8 rounded-xl bg-white text-gray-800 font-extrabold shadow-2xs border border-gray-200 flex items-center justify-center hover:bg-gray-100"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-sm text-gray-900">
              {duration} hours
            </span>
            <button
              onClick={() => setDuration(duration + 1)}
              className="w-8 h-8 rounded-xl bg-white text-gray-800 font-extrabold shadow-2xs border border-gray-200 flex items-center justify-center hover:bg-gray-100"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cost Calculation Summary */}
        <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>₹{hourlyRate} × {duration} hours</span>
            <span className="font-semibold text-gray-900">₹{basePrice}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Platform fee</span>
            <span className="font-semibold text-gray-900">₹{platformFee}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total</span>
            <span className="text-emerald-800">₹{total}</span>
          </div>
        </div>

      </div>

      {/* Bottom Sticky Action CTA */}
      <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0">
        <button
          onClick={handleContinue}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl shadow-lg text-xs tracking-wide transition-all flex items-center justify-center space-x-2"
        >
          <span>Continue</span>
          <span>&rarr;</span>
        </button>
      </div>

    </div>
  );
};
