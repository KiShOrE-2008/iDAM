import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { checkHasPostgis, getPostgisBootstrapSql, prepareMigrationSql } from './test_db_helper.mjs';

console.log('=== TESTING FRESH DATABASE MIGRATION EXECUTION ON POSTGRESQL ===\n');

const testSchema = 'disposable_migration_test_' + Date.now();
const hasPostgis = checkHasPostgis();

// 1. Setup isolated test environment in myapp database
const setupSql = `
  CREATE SCHEMA IF NOT EXISTS ${testSchema};
  SET search_path TO ${testSchema}, public;
  
  -- Create auth schema mock
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT id FROM auth.users LIMIT 1;
  $$ LANGUAGE sql STABLE;

  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
    SELECT '{"role": "authenticated"}'::jsonb;
  $$ LANGUAGE sql STABLE;

  ${getPostgisBootstrapSql()}
`;

try {
  execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: setupSql, stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(`✅ Test schema '${testSchema}' initialized.`);

  const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${migrationFiles.length} migrations to run in timestamp order:\n`);

  for (const file of migrationFiles) {
    console.log(`▶ Executing migration: ${file}...`);
    let rawSql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    let sql = prepareMigrationSql(rawSql, testSchema, hasPostgis);

    // Prefix search_path
    const fullSql = `SET search_path TO ${testSchema}, public;\n${sql}`;

    try {
      execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`  ✅ ${file} APPLIED SUCCESSFULLY\n`);
    } catch (err) {
      console.error(`  ❌ ERROR in ${file}:`);
      console.error(err.stderr ? err.stderr.toString() : err.message);
      throw err;
    }
  }

  console.log('🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY IN INITIAL SEQUENCE!\n');

  console.log('=== VERIFYING RE-APPLICATION IDEMPOTENCY (ROUND 2) ===\n');
  for (const file of migrationFiles) {
    console.log(`▶ Re-executing migration: ${file}...`);
    let rawSql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    let sql = prepareMigrationSql(rawSql, testSchema, hasPostgis);
    const fullSql = `SET search_path TO ${testSchema}, public;\n${sql}`;

    try {
      execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: fullSql, stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`  ✅ ${file} RE-APPLIED CLEANLY (IDEMPOTENT)\n`);
    } catch (err) {
      console.error(`  ❌ IDEMPOTENCY ERROR in ${file}:`);
      console.error(err.stderr ? err.stderr.toString() : err.message);
      throw err;
    }
  }

  console.log('🎉 ALL MIGRATIONS VERIFIED 100% IDEMPOTENT (NO DUPLICATE CONFLICTS)!\n');

  // Verify single-file schema.sql on separate fresh schema
  console.log('=== VERIFYING CANONICAL supabase/schema.sql ON FRESH SCHEMA ===\n');
  const schemaSqlPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  let rawSingleSchemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
  let singleSchemaSql = prepareMigrationSql(rawSingleSchemaSql, `${testSchema}_canon`, hasPostgis);

  execSync(`psql -d myapp -c "CREATE SCHEMA IF NOT EXISTS ${testSchema}_canon;"`);
  const canonSql = `SET search_path TO ${testSchema}_canon, public;\n${singleSchemaSql}`;
  execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: canonSql, stdio: ['pipe', 'pipe', 'pipe'] });
  execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema}_canon CASCADE;"`);

  // Verify upgrade test: applying canonical schema.sql on top of pre-existing older initial schema
  console.log('=== VERIFYING UPGRADE SAFETY: schema.sql ON PRE-EXISTING OLD SCHEMA ===\n');
  const upgradeSchema = `${testSchema}_upgrade`;
  execSync(`psql -d myapp -c "CREATE SCHEMA IF NOT EXISTS ${upgradeSchema};"`);
  let rawInitSchemaSql = fs.readFileSync(path.join(migrationDir, '20260912000000_initial_schema.sql'), 'utf8');
  let initSchemaSql = prepareMigrationSql(rawInitSchemaSql, upgradeSchema, hasPostgis);
  execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: `SET search_path TO ${upgradeSchema}, public;\n${initSchemaSql}`, stdio: ['pipe', 'pipe', 'pipe'] });

  let rawPhase1Sql = fs.readFileSync(path.join(migrationDir, '20261010020000_phase1_database_and_security.sql'), 'utf8');
  let phase1Sql = prepareMigrationSql(rawPhase1Sql, upgradeSchema, hasPostgis);
  execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: `SET search_path TO ${upgradeSchema}, public;\n${phase1Sql}`, stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('✅ Pre-existing old initial schema & Phase 1 migration applied (with legacy nearby_parking).');

  let rawUpgradeSchemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
  let upgradeSchemaSql = prepareMigrationSql(rawUpgradeSchemaSql, upgradeSchema, hasPostgis);
  execSync(`psql -d myapp -v ON_ERROR_STOP=1`, { input: `SET search_path TO ${upgradeSchema}, public;\n${upgradeSchemaSql}`, stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('✅ supabase/schema.sql APPLIED SUCCESSFULLY ON TOP OF PRE-EXISTING SCHEMA (UPGRADE SAFE)!\n');
  execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${upgradeSchema} CASCADE;"`);

} finally {
  console.log(`Cleaning up test schema ${testSchema}...`);
  try {
    execSync(`psql -d myapp -c "DROP SCHEMA IF EXISTS ${testSchema} CASCADE;"`);
    console.log(`✅ Schema ${testSchema} dropped.`);
  } catch (e) {
    console.warn('Cleanup error:', e.message);
  }
}
