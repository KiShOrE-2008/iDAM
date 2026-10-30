'use client';

import React, { useState, useMemo } from 'react';
import { ArrowLeft, Minus, Plus, Car, Bike, Zap, Check } from 'lucide-react';
import { ParkingLocation, Language } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getUserVehicles, getDefaultVehicle, Vehicle } from '@/lib/user/garageService';

interface BookingScreenProps {
  location: ParkingLocation;
  onBack: () => void;
  onNext: (bookingDetails: {
    date: string;
    time: string;
    /** Machine-readable values for the booking request (date/time above are display text) */
    bookingDate: string; // YYYY-MM-DD, local
    startTime: string; // HH:mm, 24h
    vehicleType: 'car' | 'bike';
    duration: number;
    total: number;
    vehicleNumber?: string;
    addons?: string[];
  }) => void;
  lang: Language;
}

/** '02:00 PM' -> '14:00' */
function to24Hour(label: string): string {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return label;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
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
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { day, date, isoDate };
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
  const [promoMessage, setPromoMessage] = useState<string | null>('DEMO50 applied: ₹20 off');

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
      setPromoMessage(`${promoInput.toUpperCase()} applied: ₹25 off`);
    } else {
      setPromoMessage('Invalid code. Check the spelling, or try DEMO50.');
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
      bookingDate: dateOptions.find(o => o.date === selectedDate)?.isoDate ?? dateOptions[0].isoDate,
      startTime: to24Hour(selectedTime),
      // Capacity and pricing are per car/bike; SUVs and EVs park as cars
      vehicleType: vehicleType === 'bike' ? 'bike' : 'car',
      duration,
      total: finalTotal,
      vehicleNumber,
      addons: selectedAddonList
    });
  };

  const sectionTitle = 'text-base font-black text-ink';
  const choice = (selected: boolean) =>
    `border rounded-md cursor-pointer ${selected ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-slate-300 active:bg-slate-50'}`;

  const addonRows: { key: keyof typeof addons; title: string; note: string; price: number }[] = [
    { key: 'insurance', title: 'Cancellation cover', note: 'Full refund if you cancel late', price: 10 },
    { key: 'evCharge', title: 'EV charging', note: '₹30 for each hour', price: 30 * duration },
    { key: 'wash', title: 'Car wash', note: 'Outside wash while you’re away', price: 150 },
    { key: 'valet', title: 'Valet', note: 'Hand over keys at the gate', price: 50 },
  ];

  return (
    <div className="h-full flex flex-col bg-limewash text-ink relative animate-fade-in">
      <header className="px-3 py-3 flex items-center gap-3 bg-limewash border-b border-slate-300">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 rounded-md border border-slate-300 bg-white flex items-center justify-center active:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-black text-lg leading-tight">When are you coming?</h1>
          <p className="text-sm text-slate-600 truncate">{location.title}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-7">
        <section>
          <h2 className={sectionTitle}>Day</h2>
          <div className="grid grid-cols-4 gap-2 mt-2.5">
            {dateOptions.map((item, idx) => {
              const isSelected = selectedDate === item.date;
              return (
                <button key={idx} onClick={() => setSelectedDate(item.date)} aria-pressed={isSelected} className={`py-2.5 text-center ${choice(isSelected)}`}>
                  <span className={`block text-xs font-semibold ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>{item.day}</span>
                  <span className="block text-[15px] font-black mt-0.5 tabular">{item.date}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>Arrival time</h2>
          <div className="grid grid-cols-4 gap-2 mt-2.5">
            {['9:00 AM', '10:00 AM', '11:30 AM', '02:00 PM'].map((tVal) => {
              const isSelected = selectedTime === tVal;
              return (
                <button key={tVal} onClick={() => setSelectedTime(tVal)} aria-pressed={isSelected} className={`py-2.5 text-sm font-bold tabular ${choice(isSelected)}`}>
                  {tVal.replace(/^0/, '')}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>How long</h2>
          <div className="mt-2.5 flex items-center justify-between bg-white border border-slate-300 rounded-md p-1.5">
            <button
              onClick={() => setDuration(Math.max(1, duration - 1))}
              aria-label="One hour less"
              className="w-11 h-11 rounded bg-slate-100 flex items-center justify-center active:bg-slate-200 cursor-pointer"
            >
              <Minus className="w-5 h-5" />
            </button>
            <p className="text-center" aria-live="polite">
              <span className="block text-xl font-black tabular">
                {duration} {duration === 1 ? 'hour' : 'hours'}
              </span>
              <span className="block text-xs text-slate-500 tabular">₹{hourlyRate} an hour</span>
            </p>
            <button
              onClick={() => setDuration(duration + 1)}
              aria-label="One hour more"
              className="w-11 h-11 rounded bg-slate-100 flex items-center justify-center active:bg-slate-200 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>Vehicle</h2>
          <div className="grid grid-cols-4 gap-2 mt-2.5">
            {[
              { id: 'car', label: 'Car', icon: Car },
              { id: 'bike', label: 'Bike', icon: Bike },
              { id: 'suv', label: 'SUV', icon: Car },
              { id: 'ev', label: 'EV', icon: Zap },
            ].map((v) => {
              const Icon = v.icon;
              const isSelected = vehicleType === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVehicleType(v.id as any)}
                  aria-pressed={isSelected}
                  className={`py-2.5 flex flex-col items-center gap-1 text-sm font-bold ${choice(isSelected)}`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  {v.label}
                </button>
              );
            })}
          </div>

          <label htmlFor="plate" className="block text-sm text-slate-600 mt-4">
            Number plate
          </label>
          <input
            id="plate"
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            placeholder="TN 59 AB 1234"
            autoCapitalize="characters"
            className="plate mt-1.5 w-full text-center text-2xl py-2.5 uppercase placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-amber-300/60"
          />
          {garageVehicles.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-2.5">
              <span className="text-xs text-slate-500 shrink-0">Saved:</span>
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
                    aria-pressed={isSelected}
                    className={`px-2.5 py-1 text-xs font-bold shrink-0 tabular ${choice(isSelected)}`}
                  >
                    {v.plate}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className={sectionTitle}>Extras</h2>
          <div className="mt-2.5 bg-white border border-slate-300 rounded-md divide-y divide-slate-200">
            {addonRows.map((row) => (
              <label key={row.key} className="flex items-center gap-3 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addons[row.key]}
                  onChange={(e) => setAddons({ ...addons, [row.key]: e.target.checked })}
                  className="w-5 h-5 accent-[#1846A3] shrink-0"
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[15px]">{row.title}</span>
                  <span className="block text-sm text-slate-500">{row.note}</span>
                </span>
                <span className="font-bold tabular text-[15px]">₹{row.price}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <label htmlFor="promo" className={sectionTitle}>
            Coupon
          </label>
          <div className="flex gap-2 mt-2.5">
            <input
              id="promo"
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Enter a code"
              className="flex-1 min-w-0 bg-white border border-slate-300 rounded-md px-3 py-2.5 text-[15px] font-bold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-ink"
            />
            <button onClick={handleApplyPromo} className="bg-ink text-white font-bold text-sm px-4 rounded-md cursor-pointer">
              Apply
            </button>
          </div>
          {promoMessage && (
            <p className={`text-sm font-semibold mt-2 flex items-center gap-1.5 ${promoMessage.startsWith('Invalid') ? 'text-rose-700' : 'text-go-700'}`} role="status">
              {!promoMessage.startsWith('Invalid') && <Check className="w-4 h-4" aria-hidden />}
              {promoMessage.replace(/\s*/u, '')}
            </p>
          )}
        </section>

        <section>
          <h2 className={sectionTitle}>Price</h2>
          <dl className="mt-2.5 text-[15px] border-t-2 border-ink">
            <div className="flex justify-between py-2.5 border-b border-slate-200">
              <dt className="text-slate-600 tabular">Parking, {duration} h × ₹{hourlyRate}</dt>
              <dd className="font-bold tabular">₹{basePrice}</dd>
            </div>
            {totalAddons > 0 && (
              <div className="flex justify-between py-2.5 border-b border-slate-200">
                <dt className="text-slate-600">Extras</dt>
                <dd className="font-bold tabular">₹{totalAddons}</dd>
              </div>
            )}
            <div className="flex justify-between py-2.5 border-b border-slate-200">
              <dt className="text-slate-600">Platform fee</dt>
              <dd className="font-bold tabular">₹{platformFee}</dd>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between py-2.5 border-b border-slate-200 text-go-700">
                <dt>Coupon {appliedPromo?.code}</dt>
                <dd className="font-bold tabular">−₹{discountAmount}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className="p-3 bg-white border-t border-slate-300">
        <button
          onClick={handleContinue}
          className="w-full bg-brand-700 active:bg-brand-800 text-white rounded-lg py-3.5 px-5 flex items-center justify-between cursor-pointer"
        >
          <span className="text-base font-black">Continue to payment</span>
          <span className="text-lg font-black tabular">₹{finalTotal}</span>
        </button>
      </div>
    </div>
  );
};
