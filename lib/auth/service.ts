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
      id: data.id,
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
    // Note: 'role' and 'owner_status' cannot be modified directly by clients.
    // They are protected by the protect_profile_role() trigger and require apply_for_owner_role() RPC.

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

/**
 * Submits an official Space Owner application to the database.
 * Sets owner_status to 'pending_review' via server-controlled RPC.
 */
export async function applyForOwnerRole(fullName: string, phone: string): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: 'Application submitted (Demo mode)' };
  }
  try {
    const { data, error } = await supabase.rpc('apply_for_owner_role', {
      p_full_name: fullName,
      p_phone: phone,
    });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: data?.success ?? true, message: data?.message || 'Application submitted successfully.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to submit application' };
  }
}
