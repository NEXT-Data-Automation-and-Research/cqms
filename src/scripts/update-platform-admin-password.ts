/**
 * Update the shared platform admin password (stored in Supabase).
 * Uses the service role to call set_platform_admin_password RPC.
 *
 * Usage:
 *   npx tsx src/scripts/update-platform-admin-password.ts "YourNewPassword"
 *   # or
 *   PLATFORM_ADMIN_PASSWORD=YourNewPassword npx tsx src/scripts/update-platform-admin-password.ts
 *
 * Requires in .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const passwordFromEnv = process.env.PLATFORM_ADMIN_PASSWORD;
const passwordFromArg = process.argv[2];

const newPassword = passwordFromArg?.trim() || passwordFromEnv?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!newPassword) {
  console.error('Provide the new password as first argument or set PLATFORM_ADMIN_PASSWORD');
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error('Password must be at least 8 characters');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { error } = await supabase.rpc('set_platform_admin_password', {
    p_new_password: newPassword,
  });
  if (error) {
    console.error('Failed to update password:', error.message);
    process.exit(1);
  }
  console.log('Platform admin password updated successfully.');
}

main();
