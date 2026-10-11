# iDAM — Detailed Debugging Plan

The goal is to take iDAM from its current prototype state to a reliable parking platform, without breaking working features while fixing the problems identified in the code audit.

The plan below is designed for the existing GitHub repository, `KiShOrE-2008/iDAM`, and keeps the initial audit's read-only requirement separate from any future implementation work.

---

## 1. Debugging roadmap

### Phase 1 — Database foundation (P0 · Blocker)
Fix migration order, table definitions, missing columns, and schema inconsistencies.

### Phase 2 — Authentication and security (P0 · Blocker)
Secure database functions, RLS policies, roles, ownership checks, and credentials.

### Phase 3 — Booking engine (P0 · Blocker)
Correct reservation dates, time slots, capacity checks, prices, and booking states.

### Phase 4 — Payment system (P0 · Blocker)
Separate simulated payments from production payments and verify successful transactions on the server.

### Phase 5 — QR passes and parking operations (P1 · High)
Unify token generation and verification, and secure check-in/check-out transitions.

### Phase 6 — Frontend and mobile (P1 · High)
Fix route compatibility, mock data, owner dashboards, Android camera permissions, and navigation.

### Phase 7 — Automated testing and release (P1 · Validation)
Build a reproducible test suite, run migration tests, validate real workflows, and prepare deployment.

---

## 2. Phase 1 — Repair the database foundation

**Objective:** Ensure a clean database can be created reliably and every application service uses the same schema.

**Files to inspect & align:**
- `supabase/migrations/20260912000000_initial_schema.sql`
- `supabase/migrations/20261010000000_owner_qr_checkin.sql`
- `supabase/migrations/20261010010000_idam_v2_core_security.sql`
- `supabase/migrations/20261010020000_phase1_database_and_security.sql`
- `supabase/schema.sql`
- `types/index.ts`
- `lib/supabase.ts`

### Debug tasks
- **1.1 Establish the canonical schema:** Decide which tables and columns are authoritative for profiles, parking spaces, bookings, payments, vehicles, and booking events.
- **1.2 Resolve migration dependencies:** Create referenced tables and columns before adding indexes, policies, triggers, and functions. Check every migration in timestamp order.
- **1.3 Resolve profile column mismatches:** Check the `profiles.email` column, signup trigger, profile upserts, and generated TypeScript types.
- **1.4 Standardize booking identifiers:** Reconcile `parking_location_id` versus `parking_space_id`, `status` versus `booking_status`, and related foreign keys.
- **1.5 Inspect schema drift:** Compare `schema.sql` with the cumulative result of all migrations. Check indexes, constraints, triggers, functions, and RLS policies.

### Phase 1 acceptance tests
- All migrations apply from scratch without manual SQL intervention.
- Signup and profile creation succeed.
- Creating and retrieving a booking works against the actual database.
- Foreign keys and status constraints reject invalid records.
- Reapplying a migration does not create duplicate objects or leave partially applied changes.

---

## 3. Phase 2 — Authentication and database security

**Objective:** Ensure a user cannot become an owner, inspect another user's data, or change another user's parking reservations merely by manipulating frontend state or calling a database function directly.

### A. Repair authorization
- Audit every `SECURITY DEFINER` function.
- Explicitly reject unauthenticated callers where authentication is required.
- Validate the authenticated user's identity and permission to manage the target parking space.
- Correct the nullable token/pass-code condition in check-in.
- Require the proper owner authorization for check-out.
- Remove or replace the permissive booking insertion policy, accounting for PostgreSQL's permissive-policy OR behavior.
- Review all function execution grants and default privileges.
- Ensure that changing `role` or `owner_status` requires a trusted, authorized backend operation.

### B. Replace unsafe local authentication
- Use Supabase Auth for real users.
- Do not store plaintext passwords in browser storage.
- Derive authorization from a verified server-side identity and database permissions.
- Treat local role selection and demo mode strictly as UI conveniences.
- Ensure logout invalidates or clears the correct local session state.

### C. Test the security boundaries
| Test | Expected outcome |
| --- | --- |
| Anonymous user invokes check-in | Rejected |
| Driver checks in another driver's booking | Rejected |
| Owner checks in a booking for an unrelated space | Rejected |
| User calls check-out with an arbitrary booking ID | Rejected |
| Driver inserts a booking for a different user | Rejected |
| Driver tries to change their role to owner | Rejected |
| User reads another user's private booking | Rejected |
| Owner reads a managed space's bookings | Allowed, subject to defined permissions |

---

## 4. Phase 3 — Fix the booking engine

**Objective:** Make the reservation stored in the database match the slot, vehicle, parking space, and amount selected by the user.

### Required debugging sequence
1. **Standardize date and time**: Use one documented representation for dates and times. Convert display values to correct local reservation time, preserving location timezone.
2. **Remove hard-coded timestamps**: Persist selected start and end time, not `new Date().toISOString()`.
3. **Validate capacity on the server**: Calculate remaining capacity from actual database reservations and occupancy.
4. **Prevent overlapping reservations**: Concurrency protection against double-booking the last space.
5. **Recalculate pricing on the server**: Derive price from authoritative rate, duration, category, and addons. Never trust client `totalAmount`.
6. **Persist booking details consistently**: Store vehicle, space ID, slot, addons, quote, payment reference, and status.

---

## 5. Phase 4 — Repair Razorpay payment processing

**Objective:** Make the system recognize payment success only after trusted verification.

### Work plan
1. Separate demo and production modes.
2. Create payment orders server-side.
3. Verify payment signature server-side.
4. Validate webhooks idempotently.
5. Persist payment records consistently.
6. Handle recovery (timeouts, cancellations, late success).

---

## 6. Phase 5 — Fix QR passes and parking operations

**Objective:** Make every valid booking produce a verifiable, single-use parking credential.

### Debug sequence
1. Define one canonical QR payload format.
2. Generate cryptographically secure tokens.
3. Store only token hashes in the database.
4. Ensure QR payload and stored hash match.
5. Resolve bookings from database.
6. Validate space ownership, payment state, and validity window.
7. Enforce atomic check-in and check-out transitions on server.
8. Block double check-in.

---

## 7. Phase 6 — Frontend, routing, and mobile consistency

| Area | Required fix |
| --- | --- |
| Route compatibility | Replace Next.js router compatibility hooks that return invalid values. |
| Booking UI | Ensure selected values are preserved and submitted in expected format. |
| Booking history | Use authenticated database records instead of static fallbacks. |
| Digital passes | Remove mock fallbacks from production and load real booking. |
| Owner dashboard | Replace simulated metrics with authorized database queries. |
| Owner onboarding | Check database responses and show success only on confirmation. |
| Android camera | Configure and verify native camera permissions and fallback. |
| Policy pages | Ensure URL routing maps to correct legal documents. |

---

## 8. Phase 7 — Build a real testing and CI pipeline

1. **Unit tests**: Pricing calculations, date/time conversions, token verification.
2. **Database integration tests**: Migration verification against empty PostgreSQL, triggers, RLS, concurrency.
3. **End-to-end tests**: Full user flows (signup -> book -> pay -> scan -> check out).
4. **Security regression tests**: Unauthorized mutations, role escalation, price tampering.
5. **CI pipeline**: TypeScript, lint, build, test, and migration gates.

---

## 9. Implementation Checklist

- [x] **Phase 1 · Database Foundation**
  - [x] 1.1 Inspect and document canonical schema
  - [x] 1.2 Repair migration dependencies and execution order
  - [x] 1.3 Align profile columns (`email`, `role`, `owner_status`) and signup triggers
  - [x] 1.4 Standardize booking identifiers (`parking_space_id` vs `parking_location_id`)
  - [x] 1.5 Synchronize `supabase/schema.sql` with cumulative migrations
- [x] **Phase 2 · Security & Auth**
  - [x] 2.1 Audit all `SECURITY DEFINER` functions and execution grants
  - [x] 2.2 Enforce strict RLS on bookings, spaces, and events
  - [x] 2.3 Lock down role escalation and owner authorization
  - [x] 2.4 Separate local demo storage from Supabase production auth
- [x] **Phase 3 · Booking Engine**
  - [x] 3.1 Standardize timezone, dates, and slot time persistence
  - [x] 3.2 Implement server-side capacity check & double-booking prevention
  - [x] 3.3 Enforce server-side pricing recalculation
  - [x] 3.4 Formalize booking state machine transitions
- [x] **Phase 4 · Payments**
  - [x] 4.1 Isolate demo payments from production Razorpay flow
  - [x] 4.2 Move Razorpay order generation & signature verification to server
  - [x] 4.3 Implement idempotent payment reconciliation
- [x] **Phase 5 · QR Passes & Check-In**
  - [x] 5.1 Implement secure token hashing and single canonical QR format
  - [x] 5.2 Validate space owner authorization during QR scan
  - [x] 5.3 Enforce single-use check-in/check-out state transitions
- [x] **Phase 6 · Frontend & Mobile**
  - [x] 6.1 Audit router compatibility and deep links
  - [x] 6.2 Switch driver and owner screens to real database queries
  - [x] 6.3 Test Android native camera permissions
- [x] **Phase 7 · Release & CI**
  - [x] 7.1 Automated unit, integration, and security test suite
  - [x] 7.2 Clean migration verification script
  - [x] 7.3 Release validation and deployment readiness
