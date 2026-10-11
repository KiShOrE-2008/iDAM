import { execSync } from 'node:child_process';

/**
 * Detects if PostGIS is installed and available in the database.
 */
export function checkHasPostgis() {
  try {
    const res = execSync(
      `psql -d myapp -t -A -c "SELECT 1 FROM pg_extension WHERE extname = 'postgis' UNION SELECT 1 FROM pg_proc WHERE proname = 'st_makepoint' AND prorettype = 'geometry'::regtype LIMIT 1;"`,
      { stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    return res.includes('1');
  } catch (e) {
    return false;
  }
}

/**
 * Returns bootstrap SQL for test schemas.
 * - Always installs pgcrypto in public schema so gen_random_bytes is globally available.
 * - If PostGIS is NOT available, installs fallback domain and mocks safely without collisions.
 */
export function getPostgisBootstrapSql() {
  return `
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

    DO $$ 
    BEGIN
      -- Only create PostGIS mocks if PostGIS is NOT already available
      IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'st_makepoint') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geography') THEN
          CREATE DOMAIN public.geography AS text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'st_setsrid') THEN
          CREATE FUNCTION public.ST_SetSRID(pt text, srid int) RETURNS text AS $f$ SELECT pt; $f$ LANGUAGE sql;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'st_makepoint') THEN
          CREATE FUNCTION public.ST_MakePoint(x float8, y float8) RETURNS text AS $f$ SELECT x::text || ',' || y::text; $f$ LANGUAGE sql;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'st_distance') THEN
          CREATE FUNCTION public.ST_Distance(g1 text, g2 text) RETURNS float8 AS $f$ SELECT 0.0::float8; $f$ LANGUAGE sql;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'st_dwithin') THEN
          CREATE FUNCTION public.ST_DWithin(g1 text, g2 text, r float8) RETURNS boolean AS $f$ SELECT true; $f$ LANGUAGE sql;
        END IF;
      END IF;
    END $$;
  `;
}

/**
 * Prepares migration SQL for isolated test schemas.
 * If PostGIS is available, preserves PostGIS syntax completely.
 * If PostGIS is not available, substitutes GEOGRAPHY with TEXT.
 */
export function prepareMigrationSql(sql, targetSchema, hasPostgis) {
  let s = sql;
  if (!hasPostgis) {
    s = s.replace(/CREATE EXTENSION IF NOT EXISTS postgis;/gi, '-- CREATE EXTENSION IF NOT EXISTS postgis;');
    s = s.replace(/\bGEOGRAPHY\b(\([^\)]+\))?/gi, 'TEXT');
    s = s.replace(/::geography/gi, '::text');
    s = s.replace(/CREATE INDEX [^;]+USING GIST[^;]+;/gi, '-- GIST index omitted in mock postgis test');
  }
  if (targetSchema) {
    s = s.replace(/public\./g, `${targetSchema}.`);
    // Preserve extension functions in public schema (pgcrypto and postgis)
    s = s.replace(new RegExp(`${targetSchema}\\.gen_random_bytes`, 'g'), 'public.gen_random_bytes');
    if (hasPostgis) {
      s = s.replace(new RegExp(`${targetSchema}\\.(st_[a-z0-9_]+)`, 'gi'), 'public.$1');
    }
  }
  return s;
}
