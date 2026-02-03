/**
 * Apply migration 026: Allow admins/supervisors to read all audit_assignments.
 * Fixes Assigned Audits section not showing assignments for other auditors (e.g. rahat.yousuf@nextventures.io).
 * Uses direct PostgreSQL connection (same pattern as apply-audit-reports-migrations).
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = {
  info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
  success: (msg: string, ...args: unknown[]) => console.log(`[✅] ${msg}`, ...args),
};

function getDatabaseConnection(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) return databaseUrl;

  const supabaseUrl = process.env.SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL or DATABASE_URL is required');
  }
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    throw new Error('Could not extract project ref from SUPABASE_URL');
  }
  if (!dbPassword) {
    throw new Error('SUPABASE_DB_PASSWORD or DB_PASSWORD is required');
  }
  return `postgresql://postgres:${dbPassword}@db.${urlMatch[1]}.supabase.co:5432/postgres`;
}

async function main(): Promise<void> {
  const migrationFile = '026_add_audit_assignments_admin_read_policy.sql';
  const filePath = path.join(__dirname, '..', 'db', 'migrations', migrationFile);
  if (!fs.existsSync(filePath)) {
    logger.error('Migration file not found:', filePath);
    process.exit(1);
  }
  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  logger.info('Applying audit_assignments admin read policy (026)...');
  const connectionString = getDatabaseConnection();
  const sql = postgres(connectionString, { max: 1, idle_timeout: 20, connect_timeout: 10 });

  try {
    await sql.unsafe(sqlContent);
    logger.success('Migration 026 applied. Admins/supervisors can now see all assignments in Assigned Audits.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Migration failed:', msg);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
