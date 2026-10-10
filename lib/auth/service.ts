import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile } from '@/types';

export interface DBProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: 'driver' | 'owner' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.warn('Profile fetch warning/error:', error);
      return null;
    }

    return {
      name: data.full_name,
      email: data.email,
      phone: data.phone || '',
      role: data.role === 'owner' ? 'owner' : 'driver',
    };
  } catch (e) {
    console.error('Error fetching user profile:', e);
    return null;
  }
}

export async function upsertProfile(userId: string, data: Partial<UserProfile>): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const payload: Record<string, any> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) payload.full_name = data.name;
    if (data.email !== undefined) payload.email = data.email;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.role !== undefined) payload.role = data.role;

    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Failed to upsert profile:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error upserting profile:', e);
    return false;
  }
}
