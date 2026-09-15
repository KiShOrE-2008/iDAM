'use client';

import React, { useState, useEffect } from 'react';
import { User, Car, Shield, FileText, ChevronRight, Download, Clock, CheckCircle, ArrowLeft, Star, TrendingUp, Home, BookOpen, UserCheck } from 'lucide-react';
import { Language } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface ProfileDashboardScreenProps {
  lang: Language;
  onBack: () => void;
  onNavigateToSupport?: () => void;
}

export const ProfileDashboardScreen: React.FC<ProfileDashboardScreenProps> = ({
  onBack,
  onNavigateToSupport
}) => {
  const { user, login, switchRole, logout } = useAuth();
  const [localRole, setLocalRole] = useState<'driver' | 'owner'>(user?.role || 'driver');
  const userRole = user?.role || localRole;
  const [selectedPass, setSelectedPass] = useState<any>(null);

  // Sync localRole when user logs in/out or role changes externally
  useEffect(() => {
    if (user?.role) {
      setLocalRole(user.role);
    }
  }, [user?.role]);

  const handleRoleToggle = (newRole: 'driver' | 'owner') => {
    setLocalRole(newRole);
    if (user) {
      switchRole(newRole);
    }
  };

  const mockPasses = [
    {
      id: 'IDM-82931',
      title: 'Temple Area Parking',
      vehicle: 'TN 59 AB 1234 (Car)',
      slot: 'A-12',
      time: '10:00 AM - 12:00 PM',
      date: '12 Sep 2026',
      amount: '₹85',
      base: '₹65',
      gst: '₹12',
      fee: '₹8',
      status: 'CONFIRMED',
      statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    {
      id: 'IDM-44120',
      title: 'South Masi Street Multi-level',
      vehicle: 'TN 59 C 5678 (Bike)',
      slot: 'B-04',
      time: '02:00 PM - 04:00 PM',
      date: '10 Sep 2026',
      amount: '₹65',
      base: '₹50',
      gst: '₹9',
      fee: '₹6',
      status: 'COMPLETED',
      statusColor: 'bg-blue-100 text-blue-800 border-blue-300'
    }
  ];

  return (
    <div className="h-full flex flex-col justify-between bg-slate-50 relative overflow-y-auto animate-fade-in">
      
      {/* Top Mobile Header */}
      <div className="p-3.5 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between shadow-2xs">
        <button onClick={onBack} className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-extrabold text-sm text-slate-900">
          {userRole === 'owner' ? 'Owner Portal' : 'My Passes & Profile'}
        </h3>
        <div className="w-6" />
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 flex-1">
        
        {/* User Card */}
        <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-4 rounded-2xl shadow-md space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-base ring-2 ring-emerald-300/40">
                {user ? user.name.charAt(0) : 'G'}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">{user ? user.name : 'Guest User'}</h4>
                <p className="text-xs text-emerald-300/80">{user ? user.email : 'guest@idam.demo'}</p>
              </div>
            </div>
            {!user ? (
              <button
                onClick={() => login({ role: localRole })}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => logout()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1 rounded-xl transition-all"
              >
                Logout
              </button>
            )}
          </div>

          {/* Role Switcher */}
          <div className="flex bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => handleRoleToggle('driver')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                userRole === 'driver' ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-xs' : 'text-slate-400'
              }`}
            >
              Driver View
            </button>
            <button
              onClick={() => handleRoleToggle('owner')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                userRole === 'owner' ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-xs' : 'text-slate-400'
              }`}
            >
              Owner View
            </button>
          </div>
        </div>

        {/* DRIVER VIEW */}
        {userRole === 'driver' && (
          <div className="space-y-3 animate-scale-in">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Recent Parking Passes</h4>
              <span className="text-xs font-bold text-emerald-700">2 Passes</span>
            </div>

            {mockPasses.map((pass) => (
              <div
                key={pass.id}
                onClick={() => setSelectedPass(pass)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-500 transition-all cursor-pointer space-y-2 transform active:scale-98"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 font-mono">{pass.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] border ${pass.statusColor}`}>
                    {pass.status}
                  </span>
                </div>
                <h5 className="font-extrabold text-sm text-slate-900 truncate">{pass.title}</h5>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>{pass.date} • {pass.time}</span>
                  <span className="font-extrabold text-emerald-800 text-sm">{pass.amount}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OWNER VIEW */}
        {userRole === 'owner' && (
          <div className="space-y-3 animate-scale-in">
            <div className="bg-emerald-900 text-white p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-200">Temple Area Parking</span>
                <span className="text-xs bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black">Open</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-center pt-1">
                <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/50">
                  <p className="text-[10px] font-bold text-emerald-300 uppercase">Earnings Today</p>
                  <p className="text-base font-black text-white">₹1,240</p>
                </div>
                <div className="bg-emerald-950/60 p-2 rounded-xl border border-emerald-800/50">
                  <p className="text-[9px] text-emerald-300">Occupancy</p>
                  <p className="text-sm font-extrabold text-white">23 / 35</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Support Hub Quick Links */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Support & Help</p>
          <button
            onClick={onNavigateToSupport}
            className="w-full flex items-center justify-between p-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Help Center & Policies</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Logout Button */}
        {user && (
          <button
            onClick={logout}
            className="w-full py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        )}

      </div>

      {/* Tax Invoice Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white w-full max-w-[320px] rounded-2xl p-4 shadow-xl border border-slate-200 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="text-[10px] text-slate-400 font-bold">TAX INVOICE</p>
                <h4 className="font-extrabold text-xs text-slate-900">{selectedPass.id}</h4>
              </div>
              <button
                onClick={() => setSelectedPass(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Parking Spot Fee</span>
                <span className="font-semibold text-slate-900">{selectedPass.base}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span className="font-semibold text-slate-900">{selectedPass.gst}</span>
              </div>
              <div className="flex justify-between">
                <span>Convenience Fee</span>
                <span className="font-semibold text-slate-900">{selectedPass.fee}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-extrabold text-slate-900 text-xs">
                <span>Total Amount Paid</span>
                <span className="text-emerald-700">{selectedPass.amount}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPass(null)}
              className="w-full bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs hover:bg-emerald-900 transition-colors"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}

      {/* Bottom App Navigation Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-[11px] font-semibold text-gray-500 z-20">
        <button
          onClick={onBack}
          className="flex flex-col items-center hover:text-gray-900 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => {}}
          className="flex flex-col items-center text-emerald-800 font-bold scale-105 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>Passes</span>
        </button>

        <button
          onClick={onBack}
          className="flex flex-col items-center hover:text-gray-900 transition-colors"
        >
          <UserCheck className="w-4 h-4" />
          <span>Profile</span>
        </button>
      </div>

    </div>
  );
};
