#!/usr/bin/env bash
# Builds supabase/setup_all_migrations.sql: every migration in filename order, in one
# transaction, ready to paste into the Supabase SQL Editor for a fresh project.
set -euo pipefail

cd "$(dirname "$0")/.."
out=supabase/setup_all_migrations.sql

# Every function the migrations define, as a SQL array literal
fn_names=$(grep -ohiE "CREATE (OR REPLACE )?FUNCTION (public\.)?[a-z_0-9]+" supabase/migrations/*.sql \
  | sed -E 's/.*FUNCTION (public\.)?//I' | sort -u | sed "s/.*/'&'/" | paste -sd, -)

{
cat <<'EOF'
-- =====================================================================
-- iDAM: complete database setup for a fresh Supabase project
-- =====================================================================
-- HOW TO USE
--   Supabase dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   It runs in one transaction: if anything fails, nothing is applied.
--   Safe to run again: every statement is idempotent.
--
-- GENERATED FILE: concatenation of supabase/migrations/*.sql in filename order.
-- Do not edit by hand. Regenerate after changing a migration with:
--   bash scripts/build-setup-sql.sh
--
-- AFTER RUNNING (for real payments, later):
--   Store the Razorpay key secret in Vault (Project Settings -> Vault, or SQL):
--     SELECT vault.create_secret('<your rzp key secret>', 'razorpay_key_secret');
--   Until then, payment verification fails closed and bookings stay 'pending'.
-- =====================================================================

BEGIN;
EOF
cat <<EOF

-- =====================================================================
-- PREAMBLE: remove leftover copies of this app's functions
-- =====================================================================
-- A project that ran an older schema can still hold these functions with a different
-- signature or return type, which makes CREATE OR REPLACE fail ("cannot change return
-- type of existing function"). Drop every overload of exactly the functions defined
-- below (all are recreated by this file). CASCADE also drops triggers that call them;
-- the migrations recreate those too. Functions owned by extensions (e.g. PostGIS) are kept.
DO \$\$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[${fn_names}])
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END \$\$;
EOF
for f in $(ls supabase/migrations/*.sql | sort); do
  printf '\n\n-- =====================================================================\n-- MIGRATION: %s\n-- =====================================================================\n\n' "$(basename "$f")"
  cat "$f"
done
printf '\n\nCOMMIT;\n'
} > "$out"

echo "Wrote $out"
