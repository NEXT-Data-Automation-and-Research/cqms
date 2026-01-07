/**
 * User Profile Management
 * Handles saving and retrieving user profile data from database
 */

import { getSupabase } from './supabase-init.js';
import { getSecureSupabase } from './secure-supabase.js';
import { getDeviceInfo } from './device-info.js';
import { isNewDeviceLogin } from './auth-device.js';
import { USER_PRIVATE_FIELDS } from '../core/constants/field-whitelists.js';
import { logError, logWarn, logInfo } from './logging-helper.js';

/**
 * Check if user information has changed and needs updating
 */
function hasInformationChanged(
  currentInfo: { full_name?: string; avatar_url?: string; email?: string },
  storedInfo: { full_name?: string; avatar_url?: string; email?: string }
): boolean {
  return (
    currentInfo.full_name !== storedInfo.full_name ||
    currentInfo.avatar_url !== storedInfo.avatar_url ||
    currentInfo.email !== storedInfo.email
  );
}

/**
 * Save or update user profile in Supabase database
 * 
 * This function:
 * 1. Always checks if user exists
 * 2. If exists: Updates information if there are discrepancies, detects new device logins
 * 3. If doesn't exist: Creates new user with all information
 * 4. Runs after authentication is completed
 * 
 * Creates/updates user profile with:
 * - Basic user information
 * - Comprehensive device/browser information for analytics
 * - Notification preferences (for future web push notifications)
 * - Activity tracking (last sign in, sign in count, first sign in, etc.)
 * 
 * @returns Object with isNewDevice flag indicating if this is a new device login
 */
export async function saveUserProfileToDatabase(user: any): Promise<{ isNewDevice: boolean }> {
  try {
    // ✅ Get secure Supabase client (automatically verifies auth)
    // Use requireAuth=false initially to avoid blocking on first sign-in
    let supabase;
    try {
      supabase = await getSecureSupabase(true);
    } catch (authError: any) {
      logError('❌ Failed to get secure Supabase client:', authError);
      logError('Auth error code:', authError.code);
      logError('Auth error message:', authError.message);
      
      // If auth is required but not available, try with regular client as fallback
      // This can happen on first sign-in when session is still propagating
      logInfo('⚠️ Attempting fallback to regular client...');
      const baseSupabase = getSupabase();
      if (!baseSupabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // Verify session exists
      const { data: { session }, error: sessionError } = await baseSupabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No active session found');
      }
      
      supabase = baseSupabase;
    }
    
    // ✅ Verify user.id matches authenticated user (extra security check)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      logError('❌ Authentication verification failed:', authError?.message);
      throw new Error(`Authentication verification failed: ${authError?.message || 'Unknown error'}`);
    }
    
    if (authUser.id !== user.id) {
      logError('❌ Security violation - user ID mismatch', {
        authenticatedUserId: authUser.id,
        providedUserId: user.id,
      });
      throw new Error('User ID mismatch - security violation');
    }

    // Get comprehensive device information for current session
    const currentDeviceInfo = getDeviceInfo();
    const now = new Date().toISOString();
    
    // Always check if user exists (use maybeSingle to avoid errors when user doesn't exist)
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select(USER_PRIVATE_FIELDS)
      .eq('id', user.id)
      .maybeSingle(); // Returns null if no rows found instead of throwing error
    
    // Handle fetch errors (but continue if user just doesn't exist)
    if (fetchError && fetchError.code !== 'PGRST116') {
      logWarn('⚠️ Error checking for existing user:', fetchError.message);
      // Continue anyway - will try to create new user
    }

    // Determine if this is a new user or existing user
    const isNewUser = !existingUser;
    
    // Prepare current user information from auth metadata
    const currentUserInfo = {
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      email: user.email,
    };

    // Check for discrepancies if user exists
    let hasInfoChanged = false;
    let isNewDevice = false;
    
    if (existingUser) {
      // Check if user information has changed
      hasInfoChanged = hasInformationChanged(currentUserInfo, {
        full_name: existingUser.full_name,
        avatar_url: existingUser.avatar_url,
        email: existingUser.email,
      });

      // Check if this is a new device login
      isNewDevice = isNewDeviceLogin(currentDeviceInfo, existingUser.device_info || {});

      // Log only significant changes (new device)
      if (isNewDevice) {
        logInfo('🆕 New device login detected for:', { email: user.email });
      }
    }

    // Calculate sign-in analytics
    const signInCount = existingUser 
      ? String(parseInt(existingUser.sign_in_count || '0', 10) + 1)
      : '1';
    const firstSignInAt = existingUser?.first_sign_in_at || now;

    // Prepare user profile data
    // For existing users, preserve notification preferences if they exist
    const defaultNotificationPreferences = {
      email: true,
      push: true,
      in_app: true,
      categories: {
        system: true,
        task: true,
        message: true,
        reminder: true,
      },
    };

    const userProfile: any = {
      id: user.id,
      email: currentUserInfo.email,
      full_name: currentUserInfo.full_name,
      avatar_url: currentUserInfo.avatar_url,
      provider: 'google',
      // Analytics and activity tracking
      last_sign_in_at: now,
      sign_in_count: signInCount,
      first_sign_in_at: firstSignInAt,
      // Comprehensive device information for production analytics
      device_info: currentDeviceInfo,
      // Preserve existing notification preferences or use defaults
      notification_preferences: existingUser?.notification_preferences || defaultNotificationPreferences,
      updated_at: now,
    };

    // If this is a new user, set created_at
    if (isNewUser) {
      userProfile.created_at = now;
    }

    // Upsert user profile (insert if new, update if exists)
    // This ensures user data is always up-to-date for notifications and analytics
    const { data, error } = await supabase
      .from('users')
      .upsert(userProfile, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      // Log detailed error information
      logError('❌ Error saving user profile to database:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        user_id: user.id,
        email: user.email,
        userProfile: JSON.stringify(userProfile, null, 2),
      });
      
      // Handle specific error codes
      if (error.code === '42P01') {
        logWarn('⚠️ users table not found. Please create it using the migration files.');
      } else if (error.code === '23503') {
        logError('❌ Foreign key constraint error - user might not exist in auth.users yet');
      } else if (error.code === '23505') {
        logError('❌ Unique constraint violation - email might already exist');
      } else if (error.code === '42501') {
        logError('❌ Permission denied - RLS policy might be blocking the operation');
        logError('⚠️ Check RLS policies on users table. User must be authenticated.');
      } else if (error.code === 'PGRST301') {
        logError('❌ JWT expired - session might have expired');
      }
      
      // Re-throw error so caller can handle it
      throw error;
    } else {
      // Success - user profile saved (only log errors, not success)
      // Return new device flag (true for new users, false for existing same device)
      return { isNewDevice: isNewUser || isNewDevice };
    }
  } catch (error: any) {
    logError('❌ Error in saveUserProfileToDatabase:', error);
    logError('Error stack:', error.stack);
    // Don't throw - allow auth to continue even if profile save fails
    // Return false for new device on error (conservative approach)
    return { isNewDevice: false };
  }
}

