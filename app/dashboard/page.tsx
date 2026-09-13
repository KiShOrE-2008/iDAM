'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Car,
  Bike,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  ShieldCheck,
  Building2,
  TrendingUp,
  CreditCard,
  QrCode,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  X,
  Phone,
  Mail,
  Zap,
  Info,
  DollarSign,
  Activity,
  Layers,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Language, UserProfile, ParkingInvoice } from '@/types';
import { useAuth } from '@/context/AuthContext';

// Mock Previous Bookings & Invoices for Drivers
const DRIVER_PREVIOUS_PARKINGS = [
  {
    id: 'IDM-82931',
    invoiceNo: 'IDM-INV-202609-001',
    locationName: 'Temple Area Smart Parking',
    address: 'Near West Tower, Meenakshi Temple, Madurai',
    date: '12 Sep 2026',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    durationHours: 2,
    vehicleType: 'car' as const,
    vehicleNumber: 'TN 59 AZ 8899',
    basePrice: 80,
    platformFee: 5,
    gstAmount: 15.3,
    totalAmount: 100.3,
    paymentMethod: 'UPI / GPay',
    status: 'active' as const,
  },
  {
    id: 'IDM-44120',
    invoiceNo: 'IDM-INV-202609-002',
    locationName: 'Periyar Complex Smart Parking',
    address: 'Periyar Bus Stand Road, Madurai',
    date: '10 Sep 2026',
    startTime: '02:30 PM',
    endTime: '05:30 PM',
    durationHours: 3,
    vehicleType: 'car' as const,
    vehicleNumber: 'TN 59 AZ 8899',
    basePrice: 75,
    platformFee: 5,
    gstAmount: 14.4,
    totalAmount: 94.4,
    paymentMethod: 'UPI / PhonePe',
    status: 'completed' as const,
  },
  {
    id: 'IDM-56717',
    invoiceNo: 'IDM-INV-202609-003',
    locationName: 'South Masi Street Multi-level',
    address: 'South Masi Street, Madurai',
    date: '05 Sep 2026',
    startTime: '11:00 AM',
    endTime: '01:00 PM',
    durationHours: 2,
    vehicleType: 'bike' as const,
    vehicleNumber: 'TN 59 B 4422',
    basePrice: 30,
    platformFee: 5,
    gstAmount: 6.3,
    totalAmount: 41.3,
    paymentMethod: 'Credit Card',
    status: 'completed' as const,
  },
];

// Mock Upcoming & Current Parking for Owners
const OWNER_RESERVATIONS = [
  {
    id: 'RES-901',
    driverName: 'Ramesh Sundaram',
    vehicleNo: 'TN 59 AB 1234',
    vehicleType: 'Car (Hyundai i20)',
    spotId: 'P-04',
    arrivalTime: '09:30 AM',
    departureTime: '01:30 PM',
    durationHours: 4,
    totalFee: 160,
    status: 'Occupied',
    isEV: false,
  },
  {
    id: 'RES-902',
    driverName: 'Priya Ananth',
    vehicleNo: 'TN 59 CD 5678',
    vehicleType: 'Bike (Royal Enfield)',
    spotId: 'B-02',
    arrivalTime: '10:15 AM',
    departureTime: '12:15 PM',
    durationHours: 2,
    totalFee: 40,
    status: 'Occupied',
    isEV: false,
  },
  {
    id: 'RES-903',
    driverName: 'Karthik Raja',
    vehicleNo: 'TN 59 EV 9900',
    vehicleType: 'EV Car (Tata Nexon EV)',
    spotId: 'P-02 (EV Charging)',
    arrivalTime: '11:30 AM',
    departureTime: '02:30 PM',
    durationHours: 3,
    totalFee: 150,
    status: 'Upcoming',
    isEV: true,
  },
  {
    id: 'RES-904',
    driverName: 'Suresh Kumar',
    vehicleNo: 'TN 59 XY 7711',
    vehicleType: 'Car (Honda City)',
    spotId: 'P-08',
    arrivalTime: '01:00 PM',
    departureTime: '04:00 PM',
    durationHours: 3,
    totalFee: 120,
    status: 'Upcoming',
    isEV: false,
  },
];

export default function DashboardPage() {
  const [lang, setLang] = useState<Language>('en');
  const { user, isLoggedIn, switchRole } = useAuth();
  
  // Default to driver view if no role specified
  const [activeTab, setActiveTab] = useState<'driver' | 'owner'>(
    user?.role || 'driver'
  );
  
  // Selected Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<typeof DRIVER_PREVIOUS_PARKINGS[0] | null>(null);

  const currentUser: UserProfile = user || {
    name: activeTab === 'owner' ? 'Kishore (Meenakshi Parking)' : 'Kishore Kumar',
    phone: '+91 98765 43210',
    email: activeTab === 'owner' ? 'owner@meenakshiparking.com' : 'kishore.k@example.com',
    role: activeTab,
    vehicleNumber: 'TN 59 AZ 8899',
    vehicleType: 'car',
    propertyName: 'Meenakshi Temple Square Smart Lot',
    propertyAddress: '124 West Masi Street, Near Temple Gate 3, Madurai',
    totalSpots: 24,
    availableSpots: 8,
    hourlyRateCar: 40,
    hourlyRateBike: 20,
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
        <Navbar
          lang={lang}
          onLanguageToggle={setLang}
          activeView="web"
          onViewChange={() => {}}
          onOpenOwnerModal={() => {}}
        />
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900">Sign In Required</h1>
            <p className="text-sm text-gray-600">
              Please sign in to access your personal dashboard, active parking passes, and owner analytics.
            </p>
          </div>
          <div className="flex items-center space-x-3 w-full pt-2">
            <Link
              href="/login"
              className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3.5 px-6 rounded-2xl text-xs shadow-md transition-all text-center"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-bold py-3.5 px-6 rounded-2xl text-xs border border-gray-200 shadow-2xs transition-all text-center"
            >
              Create Account
            </Link>
          </div>
        </main>
        <Footer lang={lang} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      <Navbar
        lang={lang}
        onLanguageToggle={setLang}
        activeView="web"
        onViewChange={() => {}}
        onOpenOwnerModal={() => {}}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
            <img src="/idam-logo.png" alt="Logo Watermark" className="h-64 object-contain brightness-200" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner font-extrabold text-2xl">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome, {currentUser.name}
                  </h1>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {activeTab} Mode
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 flex items-center space-x-3">
                  <span>📱 {currentUser.phone}</span>
                  <span>•</span>
                  <span>🚗 {currentUser.vehicleNumber || 'TN 59 AZ 8899'}</span>
                </p>
              </div>
            </div>

            {/* View Switcher Pills */}
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex items-center space-x-1 text-xs font-bold shrink-0">
              <button
                onClick={() => {
                  setActiveTab('driver');
                  switchRole('driver');
                }}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                  activeTab === 'driver'
                    ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Driver Dashboard</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('owner');
                  switchRole('owner');
                }}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                  activeTab === 'owner'
                    ? 'bg-white text-emerald-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Owner Dashboard</span>
              </button>
            </div>
          </div>
        </div>

        {/* DRIVER DASHBOARD VIEW */}
        {activeTab === 'driver' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Pass</p>
                  <p className="text-xl font-extrabold text-emerald-700 mt-1">1 Live Reservation</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700">
                  <QrCode className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Parkings</p>
                  <p className="text-xl font-extrabold text-gray-900 mt-1">14 Completed</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Spent</p>
                  <p className="text-xl font-extrabold text-gray-900 mt-1">₹540.00</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-700">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saved Time</p>
                  <p className="text-xl font-extrabold text-gray-900 mt-1">~45 Mins</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-700">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Active Parking Pass Hero Card */}
            <div className="bg-white rounded-3xl border-2 border-emerald-600/30 p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] uppercase font-black tracking-widest px-4 py-1 rounded-bl-2xl">
                Active Parking Pass
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Valid Entry Pass • IDM-82931</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900">Temple Area Smart Parking</h3>
                  <p className="text-xs text-gray-600 font-medium flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Near West Tower, Meenakshi Temple, Madurai</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-700 pt-1">
                    <span className="bg-gray-100 px-3 py-1 rounded-lg">📅 Today, 12 Sep 2026</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-lg">⏰ 10:00 AM - 12:00 PM</span>
                    <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-lg">₹40/hr • 2 Hours</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <Link
                    href="/pass/IDM-82931"
                    className="bg-emerald-950 hover:bg-emerald-900 text-white text-xs font-bold px-5 py-3 rounded-2xl flex items-center space-x-2 shadow-md transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View Live QR Pass</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Previous Parking History & Invoice Section */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Previous Parking History & Bills</h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    View itemized tax invoices, download receipts, and track past parking sessions in Madurai.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider bg-gray-50/70">
                      <th className="py-3 px-4 rounded-l-xl">Pass / Invoice ID</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Total Fee</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                    {DRIVER_PREVIOUS_PARKINGS.map((parking) => (
                      <tr key={parking.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-gray-900">
                          <div>{parking.id}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{parking.invoiceNo}</div>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <div className="font-extrabold text-gray-900">{parking.locationName}</div>
                          <div className="text-[11px] text-gray-500 truncate">{parking.address}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div>{parking.date}</div>
                          <div className="text-[11px] text-gray-500">{parking.startTime} - {parking.endTime}</div>
                        </td>
                        <td className="py-4 px-4">{parking.durationHours} Hours</td>
                        <td className="py-4 px-4 font-extrabold text-emerald-800">₹{parking.totalAmount.toFixed(2)}</td>
                        <td className="py-4 px-4">
                          {parking.status === 'active' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                              Active
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(parking)}
                            className="inline-flex items-center space-x-1 text-xs font-extrabold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Bill</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* OWNER DASHBOARD VIEW */}
        {activeTab === 'owner' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Owner Revenue & Capacity Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Revenue</p>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">₹1,640.00</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">+14% vs yesterday</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Spot Occupancy</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">66% Active</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">16 Occupied / 8 Free</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Bookings</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">18 Vehicles</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">12 Cars • 6 Bikes</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-700">
                  <Activity className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Projection</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">₹48,500</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Payout on 30th Sep</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-700">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Parking Area Details Card */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                  <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Registered Madurai Smart Space</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900">
                    {currentUser.propertyName}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-1 flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{currentUser.propertyAddress}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold">Hourly Rates</p>
                    <p className="text-sm font-extrabold text-emerald-800">Car: ₹40/hr | Bike: ₹20/hr</p>
                  </div>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
                    Edit Space Details
                  </button>
                </div>
              </div>

              {/* Space Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold">Total Capacity</p>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">24 Spaces</p>
                </div>
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-xs text-emerald-800 font-bold">Currently Available</p>
                  <p className="text-lg font-extrabold text-emerald-950 mt-1">8 Free Spots</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold">Operating Hours</p>
                  <p className="text-lg font-extrabold text-gray-900 mt-1">07:00 AM - 11:00 PM</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 font-bold">Security Features</p>
                  <p className="text-xs font-extrabold text-gray-800 mt-2">CCTV • Automated Gate • EV</p>
                </div>
              </div>
            </div>

            {/* Upcoming & Current Parking Reservations Table */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Upcoming & Current Parking Reservations</h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Real-time list of parked vehicles and upcoming driver reservations at your location.
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-extrabold px-3.5 py-1.5 rounded-full">
                  Live Gate Sync
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-extrabold text-gray-500 uppercase tracking-wider bg-gray-50/70">
                      <th className="py-3 px-4 rounded-l-xl">Driver Name</th>
                      <th className="py-3 px-4">Vehicle No & Type</th>
                      <th className="py-3 px-4">Assigned Spot</th>
                      <th className="py-3 px-4">Time Slot</th>
                      <th className="py-3 px-4">Collected Fee</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                    {OWNER_RESERVATIONS.map((res) => (
                      <tr key={res.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-gray-900">
                          <div>{res.driverName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{res.id}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-gray-900">{res.vehicleNo}</div>
                          <div className="text-[11px] text-gray-500">{res.vehicleType}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-gray-800">
                            {res.spotId}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>{res.arrivalTime} - {res.departureTime}</div>
                          <div className="text-[11px] text-gray-400 font-medium">{res.durationHours} Hours</div>
                        </td>
                        <td className="py-4 px-4 font-extrabold text-emerald-800">₹{res.totalFee}.00</td>
                        <td className="py-4 px-4 text-right">
                          {res.status === 'Occupied' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
                              ● Occupied
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
                              Upcoming
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* TAX INVOICE MODAL FOR DRIVERS */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex justify-center p-4 sm:py-12 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 my-auto h-fit space-y-6">
            
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Bill Header */}
            <div className="border-b border-gray-100 pb-4 text-center space-y-2">
              <img src="/idam-logo.png" alt="iDAM Logo" className="h-12 mx-auto object-contain" />
              <h3 className="text-xl font-extrabold text-gray-900">Official Tax Invoice / Bill</h3>
              <p className="text-xs text-gray-500 font-mono">Invoice #: {selectedInvoice.invoiceNo}</p>
            </div>

            {/* Invoice Breakdown */}
            <div className="space-y-4 text-xs font-semibold">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Location</span>
                  <span className="font-bold text-gray-900 text-right">{selectedInvoice.locationName}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Date & Time</span>
                  <span className="font-bold text-gray-900">{selectedInvoice.date}, {selectedInvoice.startTime}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Vehicle Number</span>
                  <span className="font-bold font-mono text-gray-900">{selectedInvoice.vehicleNumber}</span>
                </div>
              </div>

              {/* Itemized Price Table */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Base Parking Charge ({selectedInvoice.durationHours} hrs)</span>
                  <span>₹{selectedInvoice.basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform / Convenience Fee</span>
                  <span>₹{selectedInvoice.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span>
                  <span>₹{selectedInvoice.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-extrabold text-base pt-3 border-t border-gray-200">
                  <span>Total Amount Paid</span>
                  <span className="text-emerald-800">₹{selectedInvoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-gray-500 text-right font-medium">
                  Paid via {selectedInvoice.paymentMethod} • Status: <span className="text-emerald-700 font-bold uppercase">Success</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={() => {
                  alert(`Downloading Invoice PDF: ${selectedInvoice.invoiceNo}`);
                }}
                className="flex-1 bg-emerald-950 hover:bg-emerald-900 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Tax Bill (PDF)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <Footer lang={lang} />
    </div>
  );
}
