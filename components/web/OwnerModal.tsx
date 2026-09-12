'use client';

import React, { useState } from 'react';
import { X, Building2, MapPin, DollarSign, Camera, CheckCircle } from 'lucide-react';
import { Language } from '@/types';

interface OwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const OwnerModal: React.FC<OwnerModalProps> = ({ isOpen, onClose, lang }) => {
  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

            <button
              type="submit"
              className="w-full bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all mt-4"
            >
              Submit Space for Review &rarr;
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
