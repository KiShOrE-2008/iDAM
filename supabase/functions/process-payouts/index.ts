// Sends, releases and reverses owner payouts (see _shared/payoutRunner.ts).
//   - Hourly by pg_cron with the x-cron-secret header: full sweep.
//   - An admin ("Run payouts now" in /admin/payouts): full sweep.
//   - The driver or owner of one booking, with { booking_id }: just that payout
//     (the app calls this right after a cancellation so the money is reversed promptly).
// Deployed with --no-verify-jwt because pg_cron has no user JWT; callers are checked here.
import { adminClient, callerUser } from '../_shared/supabase.ts';
import { corsHeaders, json } from '../_shared/razorpay.ts';
import { processPayout, razorpayKeys, sweepPayouts } from '../_shared/payoutRunner.ts';

function sameSecret(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Headers': `${corsHeaders['Access-Control-Allow-Headers']}, x-cron-secret` } });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const db = adminClient();
    const keys = razorpayKeys();
    const { booking_id } = (await req.json().catch(() => ({}))) ?? {};

    const cronSecret = Deno.env.get('PAYOUTS_CRON_SECRET') ?? '';
    if (cronSecret && sameSecret(req.headers.get('x-cron-secret') ?? '', cronSecret)) {
      return json({ success: true, ...(await sweepPayouts(db, keys)) });
    }

    const user = await callerUser(req, db);
    if (!user) return json({ error: 'UNAUTHENTICATED' }, 401);
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin';

    if (typeof booking_id === 'string' && booking_id) {
      const { data: payout } = await db.from('owner_payouts').select('owner_id').eq('booking_id', booking_id).maybeSingle();
      if (!payout) return json({ success: true, status: null });
      if (!isAdmin && payout.owner_id !== user.id) {
        const { data: booking } = await db.from('bookings').select('driver_id, user_id').eq('id', booking_id).maybeSingle();
        if (booking?.driver_id !== user.id && booking?.user_id !== user.id) return json({ error: 'FORBIDDEN' }, 403);
      }
      return json({ success: true, status: await processPayout(db, keys, booking_id) });
    }

    if (!isAdmin) return json({ error: 'FORBIDDEN', message: 'Admins only' }, 403);
    return json({ success: true, ...(await sweepPayouts(db, keys)) });
  } catch (err) {
    console.error('process-payouts error', err);
    return json({ error: 'INTERNAL' }, 500);
  }
});
