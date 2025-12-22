/**
 * OAuth Authentication Handler
 * Handles Google OAuth sign-in and callback processing
 */

import { getSupabase } from './supabase-init.js';
import { clearAuthCache } from './secure-supabase.js';
import { saveUserProfileToDatabase } from './auth-user-profile.js';
import { storeDeviceFingerprint } from './auth-device.js';

/**
 * Sign in with Google using Supabase OAuth
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not initialized. Please wait a moment and try again.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/src/auth/presentation/auth-page.html`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Handle OAuth callback when user returns from Google
 */
export async function handleGoogleOAuthCallback(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase not initialized');
    return;
  }

  try {
    // Get the current session (Supabase processes OAuth callback automatically)
    // Wait a bit for session to be fully established
    let session = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts && !session) {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        if (attempts === maxAttempts - 1) {
          return; // Give up after max attempts
        }
      }
      
      if (currentSession && currentSession.user) {
        session = currentSession;
        break;
      }
      
      // Wait a bit before retrying
      if (attempts < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      attempts++;
    }
    
    if (!session || !session.user) {
      console.error('❌ No session found after OAuth callback - user may not be authenticated yet');
      console.log('Attempted to get session', maxAttempts, 'times');
      return;
    }

    const user = session.user;
    
    // Clear auth cache to ensure fresh verification
    clearAuthCache();
    
    // Wait a moment for session to fully propagate
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Save user profile to Supabase database (for notifications and future features)
    try {
      await saveUserProfileToDatabase(user);
    } catch (saveError: any) {
      console.error('❌ Error saving user profile:', saveError);
      console.error('Error details:', {
        message: saveError.message,
        code: saveError.code,
        stack: saveError.stack,
      });
      
      // Retry once after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        await saveUserProfileToDatabase(user);
      } catch (retryError: any) {
        console.error('❌ User profile save failed on retry:', retryError);
        // Don't block redirect - user is authenticated even if profile save fails
      }
    }
    
    // Fetch full user profile from database to get latest avatar_url and other data
    let fullUserData = null;
    try {
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (!dbError && dbUser) {
        fullUserData = dbUser;
        console.log('✅ Loaded full user profile from database after login');
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch full user profile from database, using metadata:', error);
    }

    // Save user info to localStorage with database data if available
    const userInfo = {
      id: user.id,
      email: fullUserData?.email || user.email,
      name: fullUserData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatar: fullUserData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      picture: fullUserData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      avatar_url: fullUserData?.avatar_url || null,
      provider: 'google',
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    console.log('✅ Updated localStorage with full user profile data');

    // ✅ SECURITY: Store device fingerprint for this session to prevent token copying
    if (session?.access_token) {
      storeDeviceFingerprint(session.access_token);
    }

    // Clear any OAuth parameters from URL
    if (window.location.search || window.location.hash) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Redirect to home page (wrapper page for authenticated users)
    window.location.href = '/src/features/home/presentation/home-page.html';
  } catch (error) {
    console.error('Error in handleGoogleOAuthCallback:', error);
  }
}

