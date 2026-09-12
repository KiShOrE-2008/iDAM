'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (userData?: Partial<UserProfile>) => void;
  logout: () => void;
  switchRole: (role: 'driver' | 'owner') => void;
}

const DEFAULT_MOCK_DRIVER: UserProfile = {
  name: 'Kishore Kumar',
  phone: '+91 98765 43210',
  email: 'kishore.k@example.com',
  role: 'driver',
  vehicleNumber: 'TN 59 AZ 8899',
  vehicleType: 'car',
};

const DEFAULT_MOCK_OWNER: UserProfile = {
  name: 'Kishore (Meenakshi Parking)',
  phone: '+91 98765 43210',
  email: 'owner@meenakshiparking.com',
  role: 'owner',
  propertyName: 'Meenakshi Temple Square Smart Lot',
  propertyAddress: '124 West Masi Street, Near Temple Gate 3, Madurai',
  totalSpots: 24,
  availableSpots: 8,
  hourlyRateCar: 40,
  hourlyRateBike: 20,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  switchRole: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Read from localStorage on mount
    try {
      const stored = localStorage.getItem('idam_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load user state from storage', e);
    }
  }, []);

  const login = (userData?: Partial<UserProfile>) => {
    const role = userData?.role || 'driver';
    const baseMock = role === 'owner' ? DEFAULT_MOCK_OWNER : DEFAULT_MOCK_DRIVER;
    const newUser: UserProfile = {
      ...baseMock,
      ...userData,
      role,
    };
    setUser(newUser);
    try {
      localStorage.setItem('idam_user', JSON.stringify(newUser));
    } catch (e) {
      console.error('Failed to save user to storage', e);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('idam_user');
    } catch (e) {
      console.error('Failed to remove user from storage', e);
    }
  };

  const switchRole = (newRole: 'driver' | 'owner') => {
    if (!user) return;
    const updated = {
      ...(newRole === 'owner' ? DEFAULT_MOCK_OWNER : DEFAULT_MOCK_DRIVER),
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: newRole,
    };
    setUser(updated);
    try {
      localStorage.setItem('idam_user', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update user role in storage', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
