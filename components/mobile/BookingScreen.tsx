'use client';

import React, { useState, useMemo } from 'react';
import { ArrowLeft, Minus, Plus, Car, Bike, Zap, Sparkles, Tag, Check, ShieldCheck, Key, Shield } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getUserVehicles, getDefaultVehicle, Vehicle } from '@/lib/user/garageService';

interface BookingScreenProps {
  location: ParkingLocation;
  onBack: () => void;
  onNext: (bookingDetails: {
    date: string;
    time: string;
    duration: number;
    total: number;
    vehicleNumber?: string;
    addons?: string[];
  }) => void;
  lang: Language;
}

export const BookingScreen: React.FC<BookingScreenProps> = ({
  location,
  onBack,
  onNext,
  lang
}) => {
  const { profile } = useAuth();
  const [garageVehicles, setGarageVehicles] = useState<Vehicle[]>([]);

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
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [duration, setDuration] = useState(2);
  const [vehicleType, setVehicleType] = useState<'car' | 'bike' | 'suv' | 'ev'>((profile?.vehicleType as any) || 'car');
  const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicleNumber || 'TN 59 AB 1234');

  React.useEffect(() => {
    const list = getUserVehicles();
    setGarageVehicles(list);
    const def = getDefaultVehicle();
    if (def) {
      setVehicleNumber(def.plate);
      const mappedType = def.type.toLowerCase() as 'car' | 'bike' | 'suv' | 'ev';
      setVehicleType(mappedType);
    }
  }, []);
  
  // Value-added Add-ons
  const [addons, setAddons] = useState<{ evCharge: boolean; wash: boolean; valet: boolean; insurance: boolean }>({
    evCharge: false,
    wash: false,
    valet: false,
    insurance: true
  });

  // Promo Code
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>({
    code: 'DEMO50',
    discount: 20
  });
  const [promoMessage, setPromoMessage] = useState<string | null>('Code DEMO50 applied: ₹20 OFF');

  const hourlyRate = vehicleType === 'bike' ? (location.hourlyRateBike || 20) : (location.hourlyRateCar || 40);
  const basePrice = hourlyRate * duration;
  
  // Add-on cost calculations
  const evCost = addons.evCharge ? 30 * duration : 0;
  const washCost = addons.wash ? 150 : 0;
  const valetCost = addons.valet ? 50 : 0;
  const insuranceCost = addons.insurance ? 10 : 0;

  const totalAddons = evCost + washCost + valetCost + insuranceCost;
  const platformFee = 5;
  const subtotal = basePrice + totalAddons + platformFee;
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const finalTotal = Math.max(10, subtotal - discountAmount);

  const handleApplyPromo = () => {
    if (promoInput.trim().toUpperCase() === 'IDAM20' || promoInput.trim().toUpperCase() === 'DEMO50') {
      setAppliedPromo({ code: promoInput.toUpperCase(), discount: 25 });
      setPromoMessage(`Code ${promoInput.toUpperCase()} applied! ₹25 OFF 🎉`);
    } else {
      setPromoMessage('Invalid coupon code. Try DEMO50');
    }
  };

  const handleContinue = () => {
    const selectedAddonList = [];
    if (addons.evCharge) selectedAddonList.push('EV Fast Charge');
    if (addons.wash) selectedAddonList.push('Car Wash');
    if (addons.valet) selectedAddonList.push('Valet');
    if (addons.insurance) selectedAddonList.push('Cancellation Protection');

    onNext({
      date: selectedDate,
      time: selectedTime,
      duration,
      total: finalTotal,
      vehicleNumber,
      addons: selectedAddonList
    });
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#F8F8F5] text-[#14201D] relative overflow-y-auto no-scrollbar animate-fade-in">
      
      {/* Top Navigation Bar */}
      <div className="pt-3 px-4 pb-3 flex items-center space-x-3 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">Reservation & Vehicle Details</h3>
          <p className="text-[10px] text-slate-500">{location.title}</p>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* Vehicle Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Vehicle Category
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'car', label: 'Car', icon: Car },
              { id: 'bike', label: 'Bike', icon: Bike },
              { id: 'suv', label: 'SUV', icon: Car },
              { id: 'ev', label: 'EV ⚡', icon: Zap }
            ].map((v) => {
              const Icon = v.icon;
              const isSelected = vehicleType === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVehicleType(v.id as any)}
                  className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center space-y-1 text-xs ${
                    isSelected
                      ? 'bg-emerald-950 text-white border-emerald-700 font-extrabold shadow-sm ring-1 ring-emerald-400/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`} />
                  <span className="text-[11px]">{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* License Plate Number Input */}
        <div className="space-y-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-900 block">
              Vehicle Registration Plate
            </label>
            {garageVehicles.length > 0 && (
              <span className="text-[10px] text-slate-400 font-bold uppercase">From Garage</span>
            )}
          </div>

          {garageVehicles.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {garageVehicles.map((v) => {
                const isSelected = vehicleNumber === v.plate;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setVehicleNumber(v.plate);
                      setVehicleType(v.type.toLowerCase() as any);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all shrink-0 flex items-center space-x-1 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950 text-white border-emerald-700 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span>{v.plate}</span>
                    <span className="opacity-75">({v.type})</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className="bg-amber-400 text-slate-950 font-black px-2 py-1 rounded-lg text-[10px] border border-amber-500 shrink-0">
              IND
            </span>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. TN 59 AB 1234"
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 uppercase"
            />
          </div>
        </div>

        {/* Date Selector Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Select Date
          </label>
          <div className="grid grid-cols-4 gap-2">
            {dateOptions.map((item, idx) => {
              const isSelected = selectedDate === item.date;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(item.date)}
                  className={`py-2 px-1 rounded-xl text-center border transition-all ${
                    isSelected
                      ? 'bg-emerald-950 text-white border-emerald-700 shadow-xs font-extrabold'
                      : 'bg-white text-slate-700 border-slate-200 font-semibold'
                  }`}
                >
                  <div className="text-[9px] opacity-80 uppercase font-bold">{item.day}</div>
                  <div className="text-xs font-extrabold mt-0.5">{item.date}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Time Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Arrival Time
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['9:00 AM', '10:00 AM', '11:30 AM', '02:00 PM'].map((tVal) => {
              const isSelected = selectedTime === tVal;
              return (
                <button
                  key={tVal}
                  onClick={() => setSelectedTime(tVal)}
                  className={`py-2 text-[11px] font-extrabold rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-950 text-white border-emerald-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tVal}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration Stepper */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Parking Duration
          </label>
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setDuration(Math.max(1, duration - 1))}
              className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-black border border-slate-200 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="font-black text-sm text-slate-900 block">{duration} Hours</span>
              <span className="text-[10px] text-slate-500 font-medium">₹{hourlyRate}/hr rate</span>
            </div>
            <button
              onClick={() => setDuration(duration + 1)}
              className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-black border border-slate-200 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Value-added Add-on Options */}
        <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <label className="text-xs font-black text-slate-900 flex items-center justify-between">
            <span>Value-Added Add-ons</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </label>

          <div className="space-y-2 text-xs">
            {/* EV Charging */}
            <label className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/60">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={addons.evCharge}
                  onChange={(e) => setAddons({ ...addons, evCharge: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-slate-900 flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fast EV Charging</span>
                  </div>
                  <div className="text-[10px] text-slate-500">+₹30 / hour</div>
                </div>
              </div>
              <span className="font-extrabold text-emerald-800">+₹{30 * duration}</span>
            </label>

            {/* Express Car Wash */}
            <label className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/60">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={addons.wash}
                  onChange={(e) => setAddons({ ...addons, wash: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-slate-900">Express Foam Car Wash</div>
                  <div className="text-[10px] text-slate-500">Exterior cleaning while parked</div>
                </div>
              </div>
              <span className="font-extrabold text-emerald-800">+₹150</span>
            </label>

            {/* Valet Service */}
            <label className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-100/60">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={addons.valet}
                  onChange={(e) => setAddons({ ...addons, valet: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-slate-900 flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-slate-700" />
                    <span>VIP Valet Parking</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Express drop-off & pick-up</div>
                </div>
              </div>
              <span className="font-extrabold text-emerald-800">+₹50</span>
            </label>
          </div>
        </div>

        {/* Promo Code Input */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <label className="text-xs font-black text-slate-900 flex items-center space-x-1">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Apply Coupon Code</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Try DEMO50 or IDAM20"
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold uppercase focus:outline-none"
            />
            <button
              onClick={handleApplyPromo}
              className="bg-slate-900 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Apply
            </button>
          </div>
          {promoMessage && (
            <p className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>{promoMessage}</span>
            </p>
          )}
        </div>

        {/* Transparent Bill Calculation Summary */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 font-medium">
            <span>Parking ({duration} hrs × ₹{hourlyRate})</span>
            <span className="font-bold text-slate-900">₹{basePrice}</span>
          </div>

          {totalAddons > 0 && (
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Value-Added Add-ons</span>
              <span className="font-bold text-slate-900">₹{totalAddons}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-600 font-medium">
            <span>Platform Service Fee</span>
            <span className="font-bold text-slate-900">₹{platformFee}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Promo Discount ({appliedPromo?.code})</span>
              <span>-₹{discountAmount}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
            <span>Total Payable</span>
            <span className="text-emerald-800 text-base">₹{finalTotal}</span>
          </div>
        </div>

      </div>

      {/* Sticky Bottom CTA */}
      <div className="p-3.5 bg-white border-t border-slate-200 sticky bottom-0 z-20 shadow-lg">
        <button
          onClick={handleContinue}
          className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold py-3.5 rounded-2xl shadow-xl text-xs tracking-wide transition-all transform active:scale-98 flex items-center justify-between px-5"
        >
          <span>Proceed to Payment</span>
          <div className="flex items-center space-x-1 text-emerald-300 font-black">
            <span>₹{finalTotal}</span>
            <span>&rarr;</span>
          </div>
        </button>
      </div>

    </div>
  );
};
