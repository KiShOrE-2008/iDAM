import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.116.0';

/** Service-role client: bypasses RLS. Only ever used server-side inside Edge Functions. */
export function adminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/** The signed-in user who called the function, from their Authorization header. */
export async function callerUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const BOOKING_PAYMENT_COLUMNS =
  'id, driver_id, user_id, total_amount, payment_status, booking_status, payment_id, razorpay_order_id, pass_code, created_at';
