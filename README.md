# iDAM | இடம்

**Book parking in someone's unused driveway.** iDAM is a two-sided parking marketplace for
Madurai and similar cities: homeowners and private lots list spare parking spaces, drivers
find them on a map, book a time slot, pay online and get a digital pass that the owner scans
at the gate.

It runs as a website and as an Android app (the same React code, packaged with Capacitor),
on a Supabase backend with Razorpay payments.

> **Status:** pre-launch. Payments run in **Razorpay test mode**; no real money moves.
> See [Not built yet](#not-built-yet) before going live.

---

## How it works

### Drivers

1. Sign up, find a space on the map (`/explore`) and pick car or bike, start time and hours.
2. The database creates the booking as **unpaid** and holds the slot for 15 minutes.
3. Pay with Razorpay Checkout. The server checks Razorpay's signature and only then marks
   the booking confirmed (a webhook confirms it too if the app closes mid-payment).
4. The pass (`/pass/:id`, also under My Passes) shows a QR code and a code like
   `IDM-7K4P-QX2M`, and can be printed (only the pass prints).

### Owners

1. List a space at `/list-your-space`. It starts as **pending review** and is not bookable
   until an iDAM admin approves it.
2. The owner portal (`/owner` on the web, the owner dashboard in the app) shows today's
   bookings, expected arrivals and who is parked now.
3. At the gate the owner scans the driver's QR code, or types the pass code **plus the last
   4 characters of the number plate** (so a photo of someone's pass code alone is useless).
4. Owners add their bank account under **Payouts** (`/owner/payouts`) to get paid.

### Money

```
Driver pays ₹85 ──► iDAM's Razorpay account
                      ├─ ₹5   iDAM platform fee (stays)
                      └─ ₹80  owner's share ──► owner's Razorpay Route linked account
                                                 on hold until 24 h after the parking ends
                                                 ──► Razorpay pays it to the owner's bank
```

- Payouts use **Razorpay Route**. Owners' bank details go straight to Razorpay for KYC;
  iDAM stores only the last 4 digits and the IFSC.
- Paid before the owner added a bank account → the payout waits and is sent once Razorpay
  activates the account.
- Driver cancels before arriving → a payout that was not sent is dropped, one on hold is
  reversed.
- An hourly job (or **Run payouts now** in the admin console) retries failures, finishes
  reversals and tracks release and settlement.

### Admin console (`/admin`)

For accounts with `profiles.role = 'admin'`. Every page is backed by admin-only database
functions, so non-admins get "Admins only" from the server, not just a hidden menu.

| Page | What it shows |
|---|---|
| Summary | Users, listings, bookings and money at a glance |
| Listing requests | Approve, reject (with a note), suspend or reinstate listings |
| Analytics | Daily bookings and revenue, per-owner earnings, per-driver spend |
| Bookings & payments | Latest bookings, searchable by pass code, plate or driver |
| Owner payouts | Each owner's payout account and every payout's status or error |
| Users | Everyone with an account |

Make someone an admin in the Supabase SQL Editor (users cannot change their own role):

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

---

## Tech stack

| Layer | Used |
|---|---|
| Web app | React 19, Vite, react-router, Tailwind CSS v4 (pages live in `app/` in a Next-style layout; `next/link` and `next/navigation` are mapped to small shims in `src/compat`) |
| Android | Capacitor 8 (`android/`), wraps the built web app |
| Backend | Supabase: Postgres with row-level security, PostGIS, Auth, Vault, Edge Functions (Deno) |
| Payments | Razorpay Orders + Checkout, webhooks, Route for owner payouts |
| Maps | Leaflet + OpenStreetMap |

Security model in one paragraph: the browser is never trusted with anything that matters.
Bookings, prices, payment confirmation, check-in and payouts all happen in `SECURITY DEFINER`
database functions or Edge Functions; clients have no insert/update rights on bookings,
payments or payouts, and private profile data is visible only to its owner.
`supabase/verify_security.sql` checks this on a live project.

---

## Project layout

```
app/                     Pages (one folder per route), incl. app/admin/* and app/owner/payouts
components/              web/, mobile/ (app screens), admin/, shared/
context/AuthContext.tsx  Sign-in, sign-up, password reset, session
lib/                     Data access: booking/, parking/, payment/, owner/, admin/, auth/
src/                     Vite entry, router (src/App.tsx), Next compat shims
supabase/migrations/     Database schema and functions, applied in filename order
supabase/functions/      Edge Functions (payments, webhook, owner payouts); see its README
supabase/setup_all_migrations.sql   All migrations in one file for a fresh project (generated)
supabase/verify_security.sql        Read-only live check: every row should be true
scripts/build-setup-sql.sh          Regenerates setup_all_migrations.sql
test/                    Automated tests (npm test)
android/                 Capacitor Android project
```

---

## Getting started

Requirements: Node.js 20+, and for the database tests a local PostgreSQL with `psql`.

```bash
npm install
```

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
# Where sign-up / password-reset emails link back to (needed for the Android app;
# the website defaults to its own address)
VITE_PUBLIC_SITE_URL=https://your-site.example

# Used only by the command that stores secrets for the Edge Functions
VITE_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

The Razorpay **secret** never goes into the app: the Edge Functions read it from Supabase
secrets. Without Supabase keys the app runs in a local demo mode with sample data.

```bash
npm run dev
```

Opens on http://localhost:3000.

### Backend setup (Supabase)

1. **Database:** a fresh project runs `supabase/setup_all_migrations.sql` in the SQL Editor.
   An existing project runs only the new files from `supabase/migrations/`.
2. **Edge Functions, secrets and Razorpay webhook:** follow
   [`supabase/functions/README.md`](supabase/functions/README.md). Deploying works without
   Docker (the "Docker is not running" warning can be ignored).
3. **Check it:** paste `supabase/verify_security.sql` into the SQL Editor; every row should
   say `true`.

---

## Tests

```bash
npm test
```

| Phase | Covers |
|---|---|
| 1 | Migrations apply cleanly and are safe to re-run |
| 2 | Row-level security: who can read and change what |
| 3 | Booking engine: server-side pricing, capacity, overlapping bookings, status changes |
| 4 | Payment confirmation and signature checks |
| 5 | Pass verification, plate check, check-in and check-out |
| 6 | 404 page, sitemap and robots |
| 7 | Privileges of Supabase's `anon` / `authenticated` / `service_role` roles |
| 8 | Razorpay Edge Function logic (orders, signatures, webhooks) |
| 9 | Sign-in return paths (no open redirects) |
| 10 | Pass code format and gate input |
| 11 | Admin console functions and the owner payout ledger |
| 12 | Owner payout logic (bank details, Route requests, hold and reversal states) |

The database phases use a local database named `myapp` (`createdb myapp`). Phases 7 and 11
create Supabase's roles, so they need a superuser and are skipped otherwise; CI
(`.github/workflows/ci.yml`, PostGIS service container) runs everything. If your shell sets
`PGHOST`/`PGPORT` for another server, point them at the test database.

---

## Android app

```bash
npm run build      # build the web app into dist/
npm run cap:sync   # copy it into the Android project
npm run cap:open   # open in Android Studio, then Run or Build APK
```

Or from the command line (with the Android SDK at `~/Android/Sdk`):

```bash
cd android && ANDROID_HOME=$HOME/Android/Sdk ./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. The admin
console is web-only.

---

## Not built yet

Things to finish before taking real money:

- **Driver refunds.** Cancelling marks a paid booking refunded and reverses the owner's
  payout, but no refund is issued through Razorpay yet.
- **Fee vs. gateway cost.** Razorpay's charges (about 2% plus Route transfer fees) come out
  of iDAM's flat ₹5 fee, which does not cover them on larger bookings.
- **Demo lots.** The five original lots (`parking_locations`) have no owner, so they receive
  no payouts and cannot be checked in at a gate; real listings are `parking_spaces`.
- **Hourly payout job** needs `pg_cron` + `pg_net` enabled and scheduled (steps in the
  functions README); until then use **Run payouts now** in `/admin/payouts`.
- **Live keys.** Switch the Razorpay secrets and dashboard to live mode only after the
  above, and after Razorpay activates Route on the live account.
