/**
 * Authenticated Server-Side Supabase Client
 * Creates a Supabase client using the user's JWT token from the request
 * This respects RLS policies instead of bypassing them with service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('AuthenticatedServerSupabase');

/**
 * Get authenticated Supabase client for server-side use
 * Uses the JWT token from the request to create a client that respects RLS
 * 
 * @param req Authenticated request with user and token
 * @returns Supabase client that respects RLS policies
 */
export async function getAuthenticatedServerSupabase(req: AuthenticatedRequest): Promise<SupabaseClient> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }

  // Get JWT token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization token');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Create client with anon key and JWT token in global headers
  // The Authorization header is what PostgREST uses for RLS policy evaluation
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify the token is valid
  const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
  
  if (getUserError || !user) {
    throw new Error(`Invalid token: ${getUserError?.message || 'User not found'}`);
  }

  // Try to set session (this helps RLS evaluate auth.role() and auth.uid())
  // Note: setSession may require a refresh_token, but we'll try anyway
  try {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token, // Use access token as refresh token (workaround)
    });
    
    if (sessionError) {
      logger.debug('Session setting note (RLS may still work via headers):', sessionError.message);
    }
  } catch (sessionError: any) {
    // Non-critical - RLS should work via Authorization header
    logger.debug('Session setting failed (non-critical):', sessionError?.message);
  }

  logger.debug(`Created authenticated server Supabase client for user: ${user.id}`);

  return supabase;
}

