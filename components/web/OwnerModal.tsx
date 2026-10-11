'use client';

import React, { useState } from 'react';
import { X, Building2, MapPin, DollarSign, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { Language } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface OwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const OwnerModal: React.FC<OwnerModalProps> = ({ isOpen, onClose, lang }) => {
  const router = useRouter();
  const { isLoggedIn, isDemoMode, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    hourlyRateCar: '30',
    hourlyRateBike: '15',
    totalSpots: '10',
    operatingHours: '8:00 AM - 10:00 PM',
    ownerPhone: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    if (!isLoggedIn && !isDemoMode) {
      setIsSubmitting(false);
      setErrorMessage('Please sign in or create an account to register your parking space.');
      return;
    }

    if (isSupabaseConfigured && supabase && !isDemoMode) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsSubmitting(false);
          setErrorMessage('User session expired. Please sign in again.');
          return;
        }

        const spotsTotal = Number(formData.totalSpots) || 10;
        const carCap = Math.max(1, Math.floor(spotsTotal * 0.7));
        const bikeCap = Math.max(1, spotsTotal - carCap);

        const { error: spaceErr } = await supabase.from('parking_spaces').insert([{
          owner_id: user.id,
          title: formData.title,
          address: formData.address,
          price_per_hour_car: Number(formData.hourlyRateCar) || 30,
          price_per_hour_bike: Number(formData.hourlyRateBike) || 15,
          car_capacity: carCap,
          bike_capacity: bikeCap,
          status: 'pending_review',
          latitude: 9.9195,
          longitude: 78.1198,
          image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800'
        }]);

        if (spaceErr) {
          setIsSubmitting(false);
          setErrorMessage(`Database registration failed: ${spaceErr.message}`);
          return;
        }

        // Backward compatibility insert
        await supabase.from('parking_locations').insert([{
          owner_id: user.id,
          title: formData.title,
          address: formData.address,
          hourly_rate_car: Number(formData.hourlyRateCar) || 30,
          hourly_rate_bike: Number(formData.hourlyRateBike) || 15,
          total_spots: spotsTotal,
          available_spots: spotsTotal,
          car_capacity: carCap,
          bike_capacity: bikeCap,
          operating_hours: formData.operatingHours,
          latitude: 9.9195,
          longitude: 78.1198,
          status: 'pending_review'
        }]);

        // Submit owner role application
        await supabase.rpc('apply_for_owner_role', {
          p_full_name: profile?.name || user.user_metadata?.full_name || 'Space Owner',
          p_phone: formData.ownerPhone
        });

      } catch (err: any) {
        setIsSubmitting(false);
        setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
        return;
      }
    }

    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900">Application Submitted!</h3>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">
              Our Madurai verification team will inspect your parking space and activate it on iDAM within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center space-x-3 pb-2 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-xl">List Your Parking Space</h3>
                <p className="text-xs text-gray-500">Monetize unused property in Madurai</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Parking Space Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Tower Commercial Plaza Parking"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Address / Landmark</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near West Gate, South Masi Street, Madurai"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Car Rate (₹/hr)</label>
                  <input
                    type="number"
                    required
                    value={formData.hourlyRateCar}
                    onChange={e => setFormData({ ...formData, hourlyRateCar: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bike Rate (₹/hr)</label>
                  <input
                    type="number"
                    required
                    value={formData.hourlyRateBike}
                    onChange={e => setFormData({ ...formData, hourlyRateBike: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.totalSpots}
                    onChange={e => setFormData({ ...formData, totalSpots: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.ownerPhone}
                    onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all mt-4 cursor-pointer flex items-center justify-center space-x-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span>Registering Space...</span>
              ) : (
                <span>Submit Space for Review &rarr;</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
