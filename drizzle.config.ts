/**
 * Drizzle ORM Configuration
 * Configuration for Drizzle ORM database migrations and queries
 */

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Note: For Supabase, you'll typically use the connection string
    // Get this from Supabase Dashboard → Settings → Database → Connection string
    // Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
    connectionString: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
} satisfies Config;

