/**
 * OAuth Authentication Handler
 * Handles Google OAuth sign-in and callback processing
 */

import { getSupabase } from './supabase-init.js';
import { clearAuthCache } from './secure-supabase.js';
import { saveUserProfileToDatabase } from './auth-user-profile.js';
import { storeDeviceFingerprint } from './auth-device.js';
import { logError, logWarn, logInfo } from './logging-helper.js';
import { showLoadingOverlay, hideLoadingOverlay } from './loading-overlay.js';

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
    logError('Supabase not initialized');
    return;
  }

  // Show loading overlay immediately
  showLoadingOverlay('Completing sign in...');

  try {
    // Get the current session (Supabase processes OAuth callback automatically)
    // Wait a bit for session to be fully established
    let session = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts && !session) {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        logError('Auth callback error:', error);
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
      logError('❌ No session found after OAuth callback - user may not be authenticated yet');
      logInfo('Attempted to get session', { maxAttempts });
      return;
    }

    const user = session.user;
    
    // Clear auth cache to ensure fresh verification
    clearAuthCache();
    
    // Wait a moment for session to fully propagate
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Save user profile to Supabase database (for notifications and future features)
    let isNewDevice = false;
    try {
      const result = await saveUserProfileToDatabase(user);
      isNewDevice = result.isNewDevice;
    } catch (saveError: any) {
      logError('❌ Error saving user profile:', saveError);
      logError('Error details:', {
        message: saveError.message,
        code: saveError.code,
        stack: saveError.stack,
      });
      
      // Retry once after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const result = await saveUserProfileToDatabase(user);
        isNewDevice = result.isNewDevice;
      } catch (retryError: any) {
        logError('❌ User profile save failed on retry:', retryError);
        // Don't block redirect - user is authenticated even if profile save fails
      }
    }
    
    // Store new device flag for notification consent check
    if (isNewDevice) {
      sessionStorage.setItem('isNewDeviceLogin', 'true');
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
        logInfo('✅ Loaded full user profile from database after login');
      }
    } catch (error) {
      logWarn('⚠️ Could not fetch full user profile from database, using metadata:', error);
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
    logInfo('✅ Updated localStorage with full user profile data');

    // ✅ SECURITY: Store device fingerprint for this session to prevent token copying
    // ✅ FIX: Pass userId to ensure fingerprint is stored with user-based key
    if (session?.access_token) {
      storeDeviceFingerprint(session.access_token, user.id);
      // ✅ FIX: Small delay to ensure fingerprint is persisted before redirect
      // This prevents race conditions where auth-checker validates before fingerprint is stored
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear any OAuth parameters from URL
    if (window.location.search || window.location.hash) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Check for stored redirect path, otherwise go to home
    const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/src/features/home/presentation/home-page.html';
    sessionStorage.removeItem('redirectAfterLogin');
    
    // ✅ FIX: Set a flag to indicate login just completed (prevents immediate validation failures)
    sessionStorage.setItem('loginJustCompleted', 'true');
    setTimeout(() => {
      sessionStorage.removeItem('loginJustCompleted');
    }, 5000); // Remove flag after 5 seconds
    
    // Use navigation utility for consistency
    const { redirectAfterAction } = await import('./navigation.js');
    redirectAfterAction(redirectPath);
  } catch (error) {
    logError('Error in handleGoogleOAuthCallback:', error);
    hideLoadingOverlay();
    // Show error to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      background: #ef4444;
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      z-index: 10001;
      max-width: 400px;
    `;
    errorDiv.textContent = 'Sign in failed. Please try again.';
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

