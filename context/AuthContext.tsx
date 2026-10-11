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
  signUp: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  isPasswordRecovery: boolean;

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

interface LocalAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'driver' | 'owner';
  vehicleNumber?: string;
  vehicleType?: 'car' | 'bike';
  createdAt: string;
}

const LOCAL_STORAGE_KEYS = {
  ACCOUNTS: 'idam_local_accounts',
  ACTIVE_USER: 'idam_active_user',
  DEMO_MODE: 'idam_demo_mode',
  DEMO_USER: 'idam_user',
};

const SEED_ACCOUNTS: LocalAccount[] = [
  {
    id: 'seed_driver_1',
    name: 'Kishore Kumar',
    email: 'kishore.k@example.com',
    phone: '+91 98765 43210',
    role: 'driver',
    vehicleNumber: 'TN 59 AZ 8899',
    vehicleType: 'car',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seed_owner_1',
    name: 'Kishore (Meenakshi Parking)',
    email: 'owner@meenakshiparking.com',
    phone: '+91 98765 43210',
    role: 'owner',
    vehicleNumber: 'TN 59 AZ 8899',
    vehicleType: 'car',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

function getLocalAccounts(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(SEED_ACCOUNTS));
      return SEED_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_ACCOUNTS;
  } catch (e) {
    return SEED_ACCOUNTS;
  }
}

function saveLocalAccounts(accounts: LocalAccount[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {}
}

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
  updatePassword: async () => ({ success: false }),
  isPasswordRecovery: false,
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  const isAuthenticated = isDemoMode || !!session || !!profile;

  // Initialize Auth & Supabase Session listener
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      // 1. Check if user was explicitly in Demo Mode
      try {
        const demoStorage = localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
        const demoUser = localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_USER);
        if (demoStorage === 'true' && demoUser) {
          if (isMounted) {
            setIsDemoMode(true);
            setProfile(JSON.parse(demoUser));
          }
        }
      } catch (e) {}

      // 2. If Supabase is configured, check for real active session
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (isMounted) {
            setSession(currentSession);
            setSupabaseUser(currentSession?.user || null);
          }

          if (currentSession?.user) {
            // Real Supabase session takes priority over demo mode
            if (isMounted) {
              setIsDemoMode(false);
            }
            try {
              localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
              localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
            } catch (e) {}

            const userProf = await fetchProfile(currentSession.user.id);
            if (isMounted) {
              if (userProf) {
                setProfile(userProf);
              } else {
                const fallbackProf: UserProfile = {
                  id: currentSession.user.id,
                  name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'User',
                  email: currentSession.user.email || '',
                  phone: currentSession.user.user_metadata?.phone || '',
                  role: 'driver',
                };
                setProfile(fallbackProf);
              }
            }
          } else {
            // No real Supabase session: check if there is an active local account
            const demoStorage = localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
            if (demoStorage !== 'true') {
              const activeUserRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
              if (activeUserRaw && isMounted) {
                setProfile(JSON.parse(activeUserRaw));
              }
            }
          }
        } catch (e) {
          console.error('Error initializing auth session:', e);
        } finally {
          if (isMounted) setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!isMounted) return;
          setSession(newSession);
          setSupabaseUser(newSession?.user || null);

          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          }

          if (newSession?.user) {
            setIsDemoMode(false);
            try {
              localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
              localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
            } catch (e) {}

            const userProf = await fetchProfile(newSession.user.id);
            if (isMounted) {
              setProfile(userProf || {
                name: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'User',
                email: newSession.user.email || '',
                phone: newSession.user.user_metadata?.phone || '',
                role: 'driver',
              });
            }
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              setProfile(null);
              setIsDemoMode(false);
            }
          }
        });

        return () => {
          isMounted = false;
          subscription.unsubscribe();
        };
      } else {
        // Supabase not configured: fallback to local accounts / demo mode
        try {
          const demoStorage = localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
          const demoUser = localStorage.getItem(LOCAL_STORAGE_KEYS.DEMO_USER);
          if (demoStorage === 'true' && demoUser) {
            setIsDemoMode(true);
            setProfile(JSON.parse(demoUser));
          } else {
            const activeUserRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
            if (activeUserRaw) {
              setProfile(JSON.parse(activeUserRaw));
            }
          }
        } catch (e) {}
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      const accounts = getLocalAccounts();
      const account = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

      if (!account) {
        return { 
          success: false, 
          error: 'No account found with this email. Please register your account above or use the Demo Fast Track.' 
        };
      }

      const activeProfile: UserProfile = {
        name: account.name,
        email: account.email,
        phone: account.phone || '+91 98765 43210',
        role: account.role || 'driver',
        vehicleNumber: account.vehicleNumber || 'TN 59 AZ 8899',
        vehicleType: account.vehicleType || 'car',
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(activeProfile));
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
      } catch (e) {}

      setProfile(activeProfile);
      setIsDemoMode(false);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      setIsDemoMode(false);
      try { 
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
      } catch (e) {}

      if (data.user) {
        setSession(data.session);
        setSupabaseUser(data.user);
        const userProf = await fetchProfile(data.user.id);
        setProfile(userProf || {
          name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          email: data.user.email || cleanEmail,
          phone: data.user.user_metadata?.phone || '',
          role: 'driver',
        });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const signUp = async (data: { 
    email: string; 
    password: string; 
    fullName: string; 
    phone?: string 
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.fullName.trim();
    const cleanPassword = data.password.trim();
    const cleanPhone = data.phone?.trim() || '';

    if (!cleanName) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'A valid email address is required.' };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      const accounts = getLocalAccounts();
      const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
      if (existing) {
        return { 
          success: false, 
          error: 'An account with this email already exists. Please switch to "Sign In" or use a different email.' 
        };
      }

      const newAccount: LocalAccount = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || '+91 98765 43210',
        role: 'driver',
        vehicleNumber: 'TN 59 AZ 8899',
        vehicleType: 'car',
        createdAt: new Date().toISOString(),
      };

      accounts.push(newAccount);
      saveLocalAccounts(accounts);

      const newProfile: UserProfile = {
        name: newAccount.name,
        email: newAccount.email,
        phone: newAccount.phone || '+91 98765 43210',
        role: newAccount.role,
        vehicleNumber: newAccount.vehicleNumber,
        vehicleType: newAccount.vehicleType,
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(newProfile));
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
      } catch (e) {}

      setProfile(newProfile);
      setIsDemoMode(false);
      return { success: true };
    }

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check if user already exists (Supabase returns empty identities for duplicate email)
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
        };
      }

      if (signUpData.user) {
        await upsertProfile(signUpData.user.id, {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: 'driver',
        });
      }

      if (signUpData.session) {
        setSession(signUpData.session);
        setSupabaseUser(signUpData.user);
        setProfile({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: 'driver',
        });
        setIsDemoMode(false);
      }

      return { 
        success: true,
        message: signUpData.session 
          ? 'Account created successfully!' 
          : 'Account created! Please check your email for confirmation instructions.'
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'Registration failed' };
    }
  };

  const signOut = async () => {
    exitDemo();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
    } catch (e) {}
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
    setIsDemoMode(false);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Password reset request failed' };
    }
  };

  const updatePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    const clean = password.trim();
    if (!clean || clean.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (!isSupabaseConfigured || !supabase) {
      setIsPasswordRecovery(false);
      return { success: true };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: clean });
      if (error) return { success: false, error: error.message };
      setIsPasswordRecovery(false);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to update password.' };
    }
  };

  const startDemo = (role: 'driver' | 'owner') => {
    const demoProfile = role === 'owner' ? DEFAULT_MOCK_OWNER : DEFAULT_MOCK_DRIVER;
    setIsDemoMode(true);
    setProfile(demoProfile);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.DEMO_MODE, 'true');
      localStorage.setItem(LOCAL_STORAGE_KEYS.DEMO_USER, JSON.stringify(demoProfile));
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
    } catch (e) {}
  };

  const exitDemo = () => {
    setIsDemoMode(false);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
    } catch (e) {}
    if (session?.user) {
      fetchProfile(session.user.id).then((prof) => {
        if (prof) setProfile(prof);
      });
    } else {
      const activeUserRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_USER);
      if (activeUserRaw) {
        try {
          setProfile(JSON.parse(activeUserRaw));
        } catch (e) {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    }
  };

  const refreshProfile = async () => {
    if (supabaseUser) {
      const userProf = await fetchProfile(supabaseUser.id);
      if (userProf) setProfile(userProf);
    }
  };

  const login = (userData?: Partial<UserProfile>) => {
    if (userData && (userData.name || userData.email || userData.phone)) {
      const customProfile: UserProfile = {
        name: userData.name || 'Driver User',
        email: userData.email || 'user@idam.park',
        phone: userData.phone || '+91 98765 43210',
        role: userData.role || 'driver',
        vehicleNumber: userData.vehicleNumber || 'TN 59 AZ 8899',
        vehicleType: userData.vehicleType || 'car',
      };
      setProfile(customProfile);
      setIsDemoMode(false);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(customProfile));
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_MODE);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_USER);
      } catch (e) {}
    } else {
      const role = userData?.role || 'driver';
      startDemo(role);
    }
  };

  const logout = () => {
    signOut();
  };

  const switchRole = (newRole: 'driver' | 'owner') => {
    if (isDemoMode) {
      startDemo(newRole);
    } else if (supabaseUser) {
      // In authenticated production mode, verify role in profile
      if (profile && profile.role === newRole) {
        setProfile({ ...profile, role: newRole });
      } else if (newRole === 'owner') {
        // Driver attempting to switch without server-side owner approval
        console.warn('Cannot switch to owner role: database owner approval required.');
      } else if (profile) {
        setProfile({ ...profile, role: newRole });
      }
    } else if (profile) {
      const updatedProfile = { ...profile, role: newRole };
      setProfile(updatedProfile);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_USER, JSON.stringify(updatedProfile));
      } catch (e) {}
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
        updatePassword,
        isPasswordRecovery,
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
