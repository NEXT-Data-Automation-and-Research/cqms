/**
 * Apply Audit Reports Database Migrations
 * This script applies the migrations needed for the Audit Reports feature
 * Uses direct PostgreSQL connection via the 'postgres' package
 */

import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logger
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  success: (msg: string, ...args: any[]) => console.log(`[✅] ${msg}`, ...args),
};

/**
 * Get database connection string
 */
function getDatabaseConnection(): string {
  // Try DATABASE_URL first
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return databaseUrl;
  }

  // Build from Supabase environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL or DATABASE_URL environment variable is required');
  }

  // Extract project ref from Supabase URL
  // Format: https://[PROJECT-REF].supabase.co
  const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    throw new Error('Could not extract project reference from SUPABASE_URL');
  }

  const projectRef = urlMatch[1];

  if (!dbPassword) {
    throw new Error('SUPABASE_DB_PASSWORD or DB_PASSWORD environment variable is required');
  }

  return `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

/**
 * Read SQL migration file
 */
function readMigrationFile(filename: string): string {
  const filePath = path.join(__dirname, '..', 'db', 'migrations', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Apply migration using direct PostgreSQL connection
 */
async function applyMigration(
  sql: postgres.Sql,
  migrationFile: string,
  migrationName: string
): Promise<void> {
  try {
    logger.info(`Applying migration: ${migrationName}...`);
    
    const sqlContent = readMigrationFile(migrationFile);
    
    // Execute the SQL
    await sql.unsafe(sqlContent);
    
    logger.success(`✅ Migration applied: ${migrationName}`);
    
  } catch (error: any) {
    logger.error(`❌ Failed to apply migration ${migrationName}:`, error.message);
    // Don't throw - continue with next migration
    throw error;
  }
}

/**
 * Apply all audit reports migrations
 */
async function applyAllMigrations(): Promise<void> {
  let sql: postgres.Sql | null = null;
  
  try {
    logger.info('🚀 Starting Audit Reports Database Setup...');
    logger.info('');
    
    // Get database connection
    const connectionString = getDatabaseConnection();
    
    // Create PostgreSQL connection
    sql = postgres(connectionString, {
      max: 1, // Use single connection for migrations
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    // Test connection
    logger.info('Testing database connection...');
    await sql`SELECT 1`;
    logger.success('✅ Database connection successful');
    logger.info('');
    
    // List of migrations to apply
    const migrations = [
      {
        file: '012_create_get_audit_tables_rpc.sql',
        name: 'Create get_audit_tables RPC Function'
      },
      {
        file: '013_add_audit_tables_rls_policies.sql',
        name: 'Add RLS Policies to Audit Tables'
      },
      {
        file: '014_fix_audit_tables_schema.sql',
        name: 'Fix Audit Tables Schema'
      }
    ];
    
    logger.info(`Found ${migrations.length} migrations to apply:`);
    migrations.forEach((m, i) => {
      logger.info(`  ${i + 1}. ${m.name} (${m.file})`);
    });
    logger.info('');
    
    // Apply each migration
    let successCount = 0;
    let failCount = 0;
    
    for (const migration of migrations) {
      try {
        await applyMigration(sql, migration.file, migration.name);
        successCount++;
        logger.info('');
      } catch (error: any) {
        failCount++;
        logger.warn(`⚠️  Skipping ${migration.name} due to error`);
        logger.info('Continuing with next migration...');
        logger.info('');
      }
    }
    
    logger.info('📋 Migration Summary:');
    logger.info(`  ✅ Successful: ${successCount}`);
    logger.info(`  ❌ Failed: ${failCount}`);
    logger.info('');
    
    if (successCount === migrations.length) {
      logger.success('🎉 All migrations applied successfully!');
      logger.info('');
      logger.info('Next steps:');
      logger.info('  1. Refresh your audit reports page');
      logger.info('  2. Verify data is loading correctly');
      logger.info('  3. Test the date filters');
    } else if (successCount > 0) {
      logger.warn('⚠️  Some migrations failed. Please review the errors above.');
      logger.info('You may need to apply failed migrations manually via Supabase Dashboard.');
    } else {
      logger.error('❌ All migrations failed. Please check your database connection and permissions.');
      logger.info('');
      logger.info('Alternative: Apply migrations manually via Supabase Dashboard → SQL Editor');
    }
    
  } catch (error: any) {
    logger.error('Failed to apply migrations:', error.message);
    logger.info('');
    logger.info('Required environment variables:');
    logger.info('  - DATABASE_URL (preferred)');
    logger.info('  OR');
    logger.info('  - SUPABASE_URL');
    logger.info('  - SUPABASE_DB_PASSWORD or DB_PASSWORD');
    logger.info('');
    logger.info('You can also apply migrations manually:');
    logger.info('  1. Supabase Dashboard → SQL Editor');
    logger.info('  2. Copy and run each migration file');
    process.exit(1);
  } finally {
    // Close database connection
    if (sql) {
      await sql.end();
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  await applyAllMigrations();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { applyAllMigrations };

