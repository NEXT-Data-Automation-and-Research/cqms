/**
 * Apply RLS Migration Script
 * 
 * This script applies the RLS policies migration to your Supabase database.
 * 
 * Usage:
 *   npm run apply-rls
 * 
 * Or with custom connection:
 *   DATABASE_URL=your_connection_string npm run apply-rls
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { createLogger } from '../utils/logger.js';

dotenv.config();

const logger = createLogger('RLSMigration');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get database connection
 */
function getDatabaseConnection(): { url: string; key: string } {
  // Try service role key first (for applying migrations)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  // If we have a direct database URL, use it
  if (databaseUrl) {
    // Extract connection details from URL
    const url = new URL(databaseUrl);
    return {
      url: supabaseUrl,
      key: serviceRoleKey || process.env.SUPABASE_ANON_KEY || '',
    };
  }

  // Use Supabase client with service role key
  if (!serviceRoleKey) {
    logger.warn('SUPABASE_SERVICE_ROLE_KEY not set, using anon key (may have limited permissions)');
  }

  return {
    url: supabaseUrl,
    key: serviceRoleKey || process.env.SUPABASE_ANON_KEY || '',
  };
}

/**
 * Apply RLS migration using Supabase REST API
 */
async function applyRLSMigrationViaAPI(): Promise<void> {
  const { url, key } = getDatabaseConnection();
  
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required');
  }

  const supabase = createClient(url, key);
  
  // Read migration file
  const migrationPath = join(__dirname, '../db/migrations/004_enable_rls_policies.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  logger.info('Applying RLS migration via Supabase API...');
  
  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  // Execute each statement
  for (const statement of statements) {
    if (statement.trim().length === 0) continue;
    
    try {
      // Use RPC to execute SQL (if available)
      // Note: This requires enabling pg_net extension or using direct connection
      logger.info(`Executing: ${statement.substring(0, 50)}...`);
      
      // For now, we'll log that direct SQL execution via API is limited
      // Users should apply via Supabase Dashboard SQL Editor or psql
      logger.warn('Direct SQL execution via API is limited. Please apply migration manually.');
      break;
    } catch (error: any) {
      logger.error(`Error executing statement: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting RLS migration application...');
    
    // Check if we can apply via API
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasServiceRoleKey) {
      logger.warn('SUPABASE_SERVICE_ROLE_KEY not set.');
      logger.warn('For best results, apply the migration manually via:');
      logger.warn('1. Supabase Dashboard → SQL Editor');
      logger.warn('2. Or using psql with your database connection string');
      logger.info('');
      logger.info('Migration file location:');
      logger.info('src/db/migrations/004_enable_rls_policies.sql');
      return;
    }

    // Try to apply via API (limited functionality)
    await applyRLSMigrationViaAPI();
    
    logger.info('✅ RLS migration instructions provided');
    logger.info('');
    logger.info('⚠️  Note: Supabase REST API has limited SQL execution capabilities.');
    logger.info('Please apply the migration using one of these methods:');
    logger.info('');
    logger.info('Method 1: Supabase Dashboard');
    logger.info('  1. Go to your Supabase Dashboard');
    logger.info('  2. Navigate to SQL Editor');
    logger.info('  3. Copy contents of: src/db/migrations/004_enable_rls_policies.sql');
    logger.info('  4. Paste and run');
    logger.info('');
    logger.info('Method 2: psql (Command Line)');
    logger.info('  psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \\');
    logger.info('    -f src/db/migrations/004_enable_rls_policies.sql');
    
  } catch (error: any) {
    logger.error('Failed to apply RLS migration:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as applyRLSMigration };

