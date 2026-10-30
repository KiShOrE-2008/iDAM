# Payments: Edge Functions setup

Real payments run through three Supabase Edge Functions. The app never decides that a
booking is paid; these functions do, using secrets that never reach the browser.

| Function | Called by | Does |
|---|---|---|
| `create-razorpay-order` | app, after the booking is created | Creates the Razorpay order for the booking's server-computed amount |
| `verify-razorpay-payment` | app, after Razorpay Checkout succeeds | Checks Razorpay's signature, then confirms the booking |
| `razorpay-webhook` | Razorpay | Confirms bookings whose payment was captured even if the app closed first |
| `owner-payout-account` | owner, on /owner/payouts | Creates the owner's Razorpay Route linked account and saves their bank account |
| `process-payouts` | pg_cron hourly, admins, the app after a cancel | Sends, releases and reverses owner payouts |

Flow: book (unpaid, slot held 15 min) → order → Razorpay Checkout → verify → confirmed
→ owner's share transferred to their linked account, on hold until 24h after the parking
ends → Razorpay pays it to the owner's bank. A cancellation before release reverses it.

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
npx supabase functions deploy owner-payout-account
npx supabase functions deploy process-payouts --no-verify-jwt
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

## Owner payouts (Razorpay Route)

1. **Enable Route** on the Razorpay account (Dashboard → Route, or ask Razorpay support).
   It works in Test Mode with the same `rzp_test_…` keys.
2. **Database**: run `supabase/migrations/20261031000000_owner_payouts.sql` in the SQL Editor.
3. **Deploy** `owner-payout-account` and `process-payouts` (commands above), plus the updated
   `verify-razorpay-payment` and `razorpay-webhook`, which now start the owner transfer.
4. **Hourly sweep**: create the cron secret (prints it once):

   ```bash
   bash -c 'S=$(openssl rand -hex 32); npx supabase secrets set PAYOUTS_CRON_SECRET="$S" && echo "Cron secret: $S"'
   ```

   Then in the SQL Editor (Database → Extensions: enable `pg_cron` and `pg_net` first):

   ```sql
   SELECT vault.create_secret('<cron secret>', 'payouts_cron_secret');
   SELECT cron.schedule('idam-process-payouts', '7 * * * *', $$
     SELECT net.http_post(
       url := 'https://pqeklshkuwachdyjlqbo.supabase.co/functions/v1/process-payouts',
       headers := jsonb_build_object('Content-Type', 'application/json',
         'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'payouts_cron_secret')),
       body := '{}'::jsonb)
   $$);
   ```

   Without the schedule, admins can still press **Run payouts now** in /admin/payouts.

What the sweep does: sends payouts that are ready (owner's account became active, or the
first attempt failed), reverses payouts of cancelled bookings, marks payouts released /
paid once Razorpay lifts the hold, and refreshes accounts Razorpay is still verifying.

Bank account numbers and PAN pass through `owner-payout-account` to Razorpay and are not
stored; iDAM keeps the linked account id, the last 4 digits and the IFSC.

## Approving parking listings

Owner listings start in `pending_review` and cannot go live on their own. Approve them in
the admin console (/admin → Listing requests).

## Tests

`npm test` covers the shared logic (`_shared/razorpay.ts`) in Phase 8 and the database rules
in Phases 2–7. The function handlers themselves run only on Supabase.
