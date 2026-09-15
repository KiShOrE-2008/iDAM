'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchProfile, upsertProfile } from '@/lib/auth/service';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserProfile | null; // UserProfile for backward compatibility with UI components
  profile: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean; // Compatibility property
  isAuthenticated: boolean;
  isDemoMode: boolean;

  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;

  startDemo: (role: 'driver' | 'owner') => void;
  exitDemo: () => void;
  refreshProfile: () => Promise<void>;

  // Legacy/shortcut compatibility helpers
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
  profile: null,
  supabaseUser: null,
  session: null,
  isLoading: true,
  isLoggedIn: false,
  isAuthenticated: false,
  isDemoMode: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false }),
  startDemo: () => {},
  exitDemo: () => {},
  refreshProfile: async () => {},
  login: () => {},
  logout: () => {},
  switchRole: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const isAuthenticated = isDemoMode || !!session;

  // Initialize Auth & Supabase Session listener
  useEffect(() => {
    async function initAuth() {
      // First check local Demo Mode state
      try {
        const demoStorage = localStorage.getItem('idam_demo_mode');
        const demoUser = localStorage.getItem('idam_user');
        if (demoStorage === 'true' && demoUser) {
          setIsDemoMode(true);
          setProfile(JSON.parse(demoUser));
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // ignore
      }

      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setSupabaseUser(currentSession?.user || null);

        if (currentSession?.user) {
          const userProf = await fetchProfile(currentSession.user.id);
          if (userProf) {
            setProfile(userProf);
          } else {
            const fallbackProf: UserProfile = {
              name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'User',
              email: currentSession.user.email || '',
              phone: currentSession.user.user_metadata?.phone || '',
              role: 'driver',
            };
            setProfile(fallbackProf);
          }
        }
      } catch (e) {
        console.error('Error initializing auth session:', e);
      } finally {
        setIsLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user || null);

        if (newSession?.user) {
          setIsDemoMode(false);
          try {
            localStorage.removeItem('idam_demo_mode');
          } catch (e) {}
          const userProf = await fetchProfile(newSession.user.id);
          setProfile(userProf || {
            name: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'User',
            email: newSession.user.email || '',
            phone: newSession.user.user_metadata?.phone || '',
            role: 'driver',
          });
        } else if (!isDemoMode) {
          setProfile(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      startDemo('driver');
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      setIsDemoMode(false);
      try { localStorage.removeItem('idam_demo_mode'); } catch (e) {}
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const signUp = async (data: { email: string; password: string; fullName: string; phone?: string }) => {
    if (!isSupabaseConfigured || !supabase) {
      startDemo('driver');
      return { success: true };
    }

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone || '',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (signUpData.user) {
        await upsertProfile(signUpData.user.id, {
          name: data.fullName,
          email: data.email,
          phone: data.phone || '',
          role: 'driver',
        });
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Registration failed' };
    }
  };

  const signOut = async () => {
    exitDemo();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('SignOut error:', e);
      }
    }
    setSession(null);
    setSupabaseUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Password reset request failed' };
    }
  };

  const startDemo = (role: 'driver' | 'owner') => {
    const demoProfile = role === 'owner' ? DEFAULT_MOCK_OWNER : DEFAULT_MOCK_DRIVER;
    setIsDemoMode(true);
    setProfile(demoProfile);
    try {
      localStorage.setItem('idam_demo_mode', 'true');
      localStorage.setItem('idam_user', JSON.stringify(demoProfile));
    } catch (e) {}
  };

  const exitDemo = () => {
    setIsDemoMode(false);
    try {
      localStorage.removeItem('idam_demo_mode');
      localStorage.removeItem('idam_user');
    } catch (e) {}
    if (!session) {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (supabaseUser) {
      const userProf = await fetchProfile(supabaseUser.id);
      if (userProf) setProfile(userProf);
    }
  };

  const login = (userData?: Partial<UserProfile>) => {
    const role = userData?.role || 'driver';
    startDemo(role);
  };

  const logout = () => {
    signOut();
  };

  const switchRole = (newRole: 'driver' | 'owner') => {
    if (isDemoMode) {
      startDemo(newRole);
    } else if (profile) {
      setProfile({ ...profile, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: profile, // Maps to profile for UserProfile compatibility
        profile,
        supabaseUser,
        session,
        isLoading,
        isLoggedIn: isAuthenticated,
        isAuthenticated,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        startDemo,
        exitDemo,
        refreshProfile,
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
