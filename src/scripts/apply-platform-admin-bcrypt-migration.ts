/**
 * Apply migration 043: Platform admin password with bcrypt.
 * Run with: npx tsx src/scripts/apply-platform-admin-bcrypt-migration.ts
 * Requires: DATABASE_URL or SUPABASE_URL + SUPABASE_DB_PASSWORD (or DB_PASSWORD)
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
  const migrationFile = '043_platform_admin_password_bcrypt.sql';
  const filePath = path.join(__dirname, '..', 'db', 'migrations', migrationFile);
  if (!fs.existsSync(filePath)) {
    logger.error('Migration file not found:', filePath);
    process.exit(1);
  }
  const sqlContent = fs.readFileSync(filePath, 'utf-8');

  logger.info('Applying platform admin bcrypt migration (043)...');
  const connectionString = getDatabaseConnection();
  const sql = postgres(connectionString, { max: 1, idle_timeout: 20, connect_timeout: 10 });

  try {
    await sql.unsafe(sqlContent);
    logger.success('Migration 043 applied. Platform admin password now uses bcrypt.');
    logger.info('Set the password with: npm run update-platform-admin-password -- "YourNewPassword"');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Migration failed:', message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
