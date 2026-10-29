# Payments: Edge Functions setup

Real payments run through three Supabase Edge Functions. The app never decides that a
booking is paid; these functions do, using secrets that never reach the browser.

| Function | Called by | Does |
|---|---|---|
| `create-razorpay-order` | app, after the booking is created | Creates the Razorpay order for the booking's server-computed amount |
| `verify-razorpay-payment` | app, after Razorpay Checkout succeeds | Checks Razorpay's signature, then confirms the booking |
| `razorpay-webhook` | Razorpay | Confirms bookings whose payment was captured even if the app closed first |

Flow: book (unpaid, slot held 15 min) → order → Razorpay Checkout → verify → confirmed.

## 1. Database

Run `supabase/migrations/20261028000000_listing_review_and_privacy.sql` in the Supabase
SQL Editor (a fresh project instead runs the whole `supabase/setup_all_migrations.sql`).

## 2. Deploy the functions

From the project folder (the CLI runs through npx, nothing to install):

```bash
npx supabase login
npx supabase link --project-ref pqeklshkuwachdyjlqbo
npx supabase functions deploy create-razorpay-order
npx supabase functions deploy verify-razorpay-payment
npx supabase functions deploy razorpay-webhook --no-verify-jwt
```

Then store the Razorpay secrets. This reads your real keys from `.env.local`
(`VITE_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`), generates a random webhook secret, and
prints the webhook secret once so you can paste it into the Razorpay dashboard (step 3):

```bash
bash -c 'set -a; . ./.env.local; set +a; W=$(openssl rand -hex 32); npx supabase secrets set RAZORPAY_KEY_ID="$VITE_RAZORPAY_KEY_ID" RAZORPAY_KEY_SECRET="$RAZORPAY_KEY_SECRET" RAZORPAY_WEBHOOK_SECRET="$W" && echo "Webhook secret for the Razorpay dashboard: $W"'
```

Check with `npx supabase secrets list`: it shows only fingerprints, never the values.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions automatically.
`--no-verify-jwt` is only for the webhook: Razorpay authenticates with its signature instead.

## 3. Razorpay Dashboard

- **Webhooks → Add**: URL `https://pqeklshkuwachdyjlqbo.supabase.co/functions/v1/razorpay-webhook`,
  secret = the `RAZORPAY_WEBHOOK_SECRET` above, events `payment.captured` and `order.paid`.
- **Payment capture**: set to automatic, so successful payments are captured (and confirmed).

Use test keys (`rzp_test_…`) until everything works, then switch the secrets to live keys.

## Approving parking listings

Owner listings start in `pending_review` and cannot go live on their own. After checking a
listing, approve it in the SQL Editor:

```sql
UPDATE public.parking_spaces SET is_approved = TRUE, status = 'active' WHERE id = '<space id>';
```

## Tests

`npm test` covers the shared logic (`_shared/razorpay.ts`) in Phase 8 and the database rules
in Phases 2–7. The function handlers themselves run only on Supabase.
