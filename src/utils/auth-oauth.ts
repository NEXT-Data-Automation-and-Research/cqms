/**
 * OAuth Authentication Handler
 * Handles Google OAuth sign-in and callback processing
 */

import { getSupabase, initSupabase, isSupabaseInitialized } from './supabase-init.js';
import { clearAuthCache } from './secure-supabase.js';
import { saveUserProfileToDatabase } from './auth-user-profile.js';
import { storeDeviceFingerprint } from './auth-device.js';
import { logError, logWarn, logInfo } from './logging-helper.js';
import { showLoadingOverlay, hideLoadingOverlay, updateLoadingOverlayMessage } from './loading-overlay.js';

/**
 * Wait for Supabase to be initialized with timeout
 * RELIABILITY: Increased timeout and added retry logic to prevent lockouts
 */
async function waitForSupabaseInit(maxWait: number = 15000): Promise<any> {
  // If already initialized, return immediately
  if (isSupabaseInitialized()) {
    return getSupabase();
  }

  // Try to initialize (includes retry logic)
  try {
    const initResult = await initSupabase();
    if (initResult) {
      return initResult;
    }
  } catch (initError) {
    logWarn('Initial Supabase init attempt failed:', initError);
    // Continue to polling as fallback
  }

  // If initialization didn't complete, wait for it with timeout
  const startTime = Date.now();
  const pollInterval = 200; // Check every 200ms
  
  while (Date.now() - startTime < maxWait) {
    if (isSupabaseInitialized()) {
      return getSupabase();
    }
    
    // Every 3 seconds, try to trigger initialization again
    const elapsed = Date.now() - startTime;
    if (elapsed > 0 && elapsed % 3000 < pollInterval) {
      logInfo('Re-attempting Supabase initialization...');
      try {
        const retryResult = await initSupabase();
        if (retryResult) {
          return retryResult;
        }
      } catch (retryError) {
        // Continue polling
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  // Final check before giving up
  if (isSupabaseInitialized()) {
    return getSupabase();
  }

  // Check if user has a cached session - if so, redirect them to home instead of showing error
  // They're already logged in, no need to re-authenticate
  const cachedSession = localStorage.getItem('supabase.auth.token');
  const userInfo = localStorage.getItem('userInfo');
  
  if (cachedSession && userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      if (parsed && parsed.id && parsed.email) {
        logInfo('Supabase init timeout but valid cached session exists - redirecting to home');
        sessionStorage.setItem('authDegradedMode', 'true');
        window.location.replace('/home');
        // Return null instead of throwing - the redirect will happen
        return null as any;
      }
    } catch (parseError) {
      // Invalid cache, throw error
    }
  }

  throw new Error('Unable to connect to authentication service. Please check your internet connection and refresh the page.');
}

/**
 * Sign in with Google using Supabase OAuth
 * RELIABILITY: Added check for existing session before attempting sign-in
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await waitForSupabaseInit();
  if (!supabase) {
    throw new Error('Supabase not initialized. Please wait a moment and try again.');
  }

  // On localhost always use current origin so login stays on localhost; on production use PUBLIC_APP_URL when set
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const baseUrl = (typeof window !== 'undefined' && !isLocalhost && (window as any).envConfig?.PUBLIC_APP_URL)
    ? (window as any).envConfig.PUBLIC_APP_URL
    : window.location.origin;
  const redirectToUrl = `${baseUrl}/src/auth/presentation/auth-page.html`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectToUrl,
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
  logInfo('🔄 Starting OAuth callback handling...');
  
  // ✅ CRITICAL: Set OAuth flag IMMEDIATELY before any async operations
  // This prevents auth-checker race conditions
  try {
    sessionStorage.setItem('oauthCallbackInProgress', 'true');
    (window as any).__oauthCallbackInProgress = true;
  } catch (e) {
    // sessionStorage may not be available
  }
  
  const supabase = await waitForSupabaseInit();
  if (!supabase) {
    logError('❌ Supabase not initialized - cannot handle OAuth callback');
    hideLoadingOverlay();
    // Clear OAuth flag on failure
    try {
      sessionStorage.removeItem('oauthCallbackInProgress');
      delete (window as any).__oauthCallbackInProgress;
    } catch (e) {}
    return;
  }
  
  logInfo('✅ Supabase initialized, proceeding with callback handling');

  // Show loading overlay immediately
  showLoadingOverlay('Completing sign in...');

  try {
    // Check for OAuth parameters in URL
    const urlHash = window.location.hash;
    const urlSearch = window.location.search;
    const hasOAuthParams = urlHash.includes('access_token') || 
                           urlHash.includes('code') ||
                           urlSearch.includes('code') ||
                           urlSearch.includes('access_token');
    
    logInfo('OAuth callback detected:', {
      hasHash: !!urlHash,
      hasSearch: !!urlSearch,
      hasOAuthParams,
      hashPreview: urlHash.substring(0, 100)
    });
    
    // Supabase processes OAuth callback automatically from URL hash when detectSessionInUrl is true
    // Wait for Supabase to process the callback and establish session
    let session = null;
    
    // Try to get session immediately (Supabase may have already processed the hash)
    const { data: { session: initialSession }, error: initialError } = await supabase.auth.getSession();
    if (!initialError && initialSession && initialSession.user) {
      session = initialSession;
      logInfo('✅ Session already available');
    } else if (initialError) {
      logWarn('Initial session check error:', initialError);
    }
    
    // If no session yet, wait for Supabase to process the OAuth callback
    if (!session) {
      logInfo('Waiting for Supabase to process OAuth callback...');
      
      // CRITICAL: Supabase with detectSessionInUrl should process the hash automatically
      // But we need to give it time and potentially trigger it explicitly
      // First, wait a moment for Supabase to initialize and process the hash
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try getSession again - this should trigger hash processing if not already done
      const { data: { session: secondCheckSession }, error: secondCheckError } = await supabase.auth.getSession();
      if (!secondCheckError && secondCheckSession && secondCheckSession.user) {
        session = secondCheckSession;
        logInfo('✅ Session established after initial wait');
      } else {
        logInfo('Session not yet available, setting up listener and polling...');
        
        let subscription: any = null;
        let resolved = false;
        
        // Set up auth state change listener to catch when Supabase processes the hash
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event: string, currentSession: any) => {
          logInfo(`Auth state change event: ${event}`, {
            hasSession: !!currentSession,
            hasUser: !!(currentSession?.user)
          });
          
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && currentSession && currentSession.user && !resolved) {
            resolved = true;
            if (subscription) {
              subscription.unsubscribe();
            }
            session = currentSession;
            logInfo(`✅ Session established via ${event} event`);
          }
        });
        subscription = authSubscription;
        
        // Poll getSession as fallback (in case auth state change doesn't fire immediately)
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds total (30 * 500ms) - increased for reliability
        
        // ✅ UX: Progressive feedback messages during polling
        const progressMessages = [
          { at: 0, message: 'Completing sign in...' },
          { at: 4, message: 'Verifying credentials...' },
          { at: 8, message: 'Still connecting...' },
          { at: 14, message: 'This is taking longer than expected...' },
          { at: 20, message: 'Almost there...' },
        ];
        
        while (!session && attempts < maxAttempts && !resolved) {
          await new Promise(r => setTimeout(r, 500));
          const { data: { session: polledSession }, error } = await supabase.auth.getSession();
          if (!error && polledSession && polledSession.user) {
            resolved = true;
            if (subscription) {
              subscription.unsubscribe();
            }
            session = polledSession;
            logInfo('✅ Session established via polling');
            break;
          }
          attempts++;
          
          // ✅ UX: Update loading message based on progress
          const progressUpdate = progressMessages.find(p => p.at === attempts);
          if (progressUpdate) {
            updateLoadingOverlayMessage(progressUpdate.message);
            logInfo(`Progress update: ${progressUpdate.message}`);
          }
          
          if (attempts % 5 === 0) {
            logInfo(`Still waiting for session... (attempt ${attempts}/${maxAttempts})`);
          }
        }
        
        // Clean up subscription if still active
        if (subscription && !resolved) {
          subscription.unsubscribe();
        }
      }
    }
    
    // Final check - try getSession one more time
    if (!session) {
      const { data: { session: finalSession }, error: finalError } = await supabase.auth.getSession();
      if (!finalError && finalSession && finalSession.user) {
        session = finalSession;
      }
    }
    
    if (!session || !session.user) {
      logError('❌ No session found after OAuth callback - user may not be authenticated yet');
      logError('Debug info:', {
        hasSession: !!session,
        hasUser: !!(session?.user),
        urlHash: window.location.hash.substring(0, 50),
        urlSearch: window.location.search
      });
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
      return;
    }
    
    console.log('✅✅✅ SESSION ESTABLISHED - User ID:', session.user.id, 'Email:', session.user.email);
    logInfo('✅ Session established after OAuth callback');
    logInfo('User ID:', session.user.id);
    logInfo('User Email:', session.user.email);

    const user = session.user;
    
    // ✅ CRITICAL: Set login flag IMMEDIATELY to prevent auth-checker from interfering
    // Set multiple flags to ensure auth-checker doesn't block us
    sessionStorage.setItem('loginJustCompleted', 'true');
    sessionStorage.setItem('oauthCallbackInProgress', 'true');
    (window as any).__oauthRedirectInProgress = true;
    
    setTimeout(() => {
      sessionStorage.removeItem('loginJustCompleted');
      sessionStorage.removeItem('oauthCallbackInProgress');
      delete (window as any).__oauthRedirectInProgress;
    }, 10000); // Extended to 10 seconds for safety
    
    console.log('✅ Login flags set to prevent auth-checker interference');
    
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

    // Fetch role and other profile data from people table (critical for role-based access control)
    // Try lowercase first, then original case - people.email may be stored with different casing
    type PeopleProfile = { role?: string; department?: string; designation?: string; team?: string; team_supervisor?: string };
    let peopleData: PeopleProfile | null = null;
    const rawEmail = (fullUserData?.email || user.email || '').trim();
    const userEmailLower = rawEmail.toLowerCase();
    try {
      let peopleResult: PeopleProfile | null = null;
      let peopleError: any = null;
      const { data: d1, error: e1 } = await supabase
        .from('people')
        .select('role, department, designation, team, team_supervisor')
        .eq('email', userEmailLower)
        .maybeSingle();
      peopleResult = d1;
      peopleError = e1;
      if (!peopleResult && rawEmail !== userEmailLower) {
        const { data: d2, error: e2 } = await supabase
          .from('people')
          .select('role, department, designation, team, team_supervisor')
          .eq('email', rawEmail)
          .maybeSingle();
        if (d2) {
          peopleResult = d2;
          peopleError = e2;
        }
      }
      if (!peopleError && peopleResult) {
        peopleData = peopleResult;
        logInfo('✅ Loaded role and profile data from people table:', {
          role: peopleResult.role,
          department: peopleResult.department,
          designation: peopleResult.designation,
        });
      } else if (peopleError) {
        logWarn('⚠️ Could not fetch role from people table:', peopleError);
      }
    } catch (error) {
      logWarn('⚠️ Could not fetch people data:', error);
    }

    // Save user info to localStorage with database data if available
    // IMPORTANT: Include role from people table for role-based access control
    const userInfo = {
      id: user.id,
      email: fullUserData?.email || user.email,
      name: fullUserData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatar: fullUserData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      picture: fullUserData?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      avatar_url: fullUserData?.avatar_url || null,
      provider: 'google',
      // Role-based access control fields (from people table)
      role: peopleData?.role || 'Employee', // Default to Employee if not found
      department: peopleData?.department || null,
      designation: peopleData?.designation || null,
      team: peopleData?.team || null,
      team_supervisor: peopleData?.team_supervisor || null,
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    logInfo('✅ Updated localStorage with full user profile data including role:', userInfo.role);
    
    // ✅ FIX: Signal other tabs that login completed (for cross-tab sync)
    try {
      localStorage.setItem('crossTabLoginCompleted', Date.now().toString());
      // Remove immediately - the storage event is what matters
      setTimeout(() => {
        try {
          localStorage.removeItem('crossTabLoginCompleted');
        } catch (e) {}
      }, 100);
    } catch (e) {
      // Ignore storage errors
    }

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
    
    // ✅ FIX: Replace current history entry to prevent back button going to auth page
    // This addresses Scenario 59: Back button after login
    try {
      // Replace the auth page in history so back button doesn't return here
      window.history.replaceState({ authenticated: true }, '', window.location.href);
    } catch (e) {
      // Ignore history errors
    }

    // ✅ CRITICAL: Ensure redirect happens - wrap in try-catch to prevent any errors from blocking redirect
    try {
      // Check for stored redirect path, otherwise go to home
      // Use clean URL /home instead of full path for consistency with auth-checker
      let redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        // Convert full path to clean URL if it's the home page
        if (redirectPath === '/src/features/home/presentation/home-page.html') {
          redirectPath = '/home';
        }
      } else {
        redirectPath = '/home';
      }
      
      console.log('🔄🔄🔄 REDIRECTING TO:', redirectPath);
      console.log('Session established, user authenticated, proceeding with redirect...');
      console.log('Current URL before redirect:', window.location.href);
      logInfo(`🔄 Redirecting to: ${redirectPath}`);
      logInfo('Session established, user authenticated, proceeding with redirect...');
      logInfo('Current URL before redirect:', window.location.href);
      
      hideLoadingOverlay();
      
      // CRITICAL: Ensure redirect happens - use both setTimeout and immediate attempt
      // This handles cases where one method might be blocked
      const performRedirect = () => {
        logInfo('Executing redirect...');
        try {
          window.location.replace(redirectPath);
        } catch (redirectErr) {
          logError('window.location.replace failed, trying href:', redirectErr);
          try {
            window.location.href = redirectPath;
          } catch (hrefErr) {
            logError('Both redirect methods failed:', hrefErr);
            // Last resort: assign to location
            (window as any).location = redirectPath;
          }
        }
      };
      
      // Try immediate redirect first
      console.log('🚀 ABOUT TO REDIRECT TO:', redirectPath);
      console.log('Current location:', window.location.href);
      performRedirect();
      
      // Backup: also schedule redirect in case immediate one was blocked
      setTimeout(() => {
        const currentPath = window.location.pathname;
        console.log('Backup redirect check - current path:', currentPath);
        if (currentPath.includes('auth-page') || currentPath.includes('auth-page.html')) {
          console.log('Still on auth page after 500ms, forcing redirect...');
          logInfo('Still on auth page, forcing redirect...');
          performRedirect();
        }
      }, 500);
      
      // Final safety net - force redirect after 1 second no matter what
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath.includes('auth-page') || currentPath.includes('auth-page.html')) {
          console.error('CRITICAL: Still on auth page after 1 second, forcing redirect with window.location.href');
          window.location.href = redirectPath;
        }
      }, 1000);
    } catch (redirectError) {
      logError('Error during redirect setup, attempting direct redirect:', redirectError);
      // Fallback: try direct redirect even if setup failed
      hideLoadingOverlay();
      try {
        window.location.replace('/home');
      } catch (finalError) {
        logError('Final redirect attempt failed:', finalError);
        // Last resort: use href instead of replace
        window.location.href = '/home';
      }
    }
  } catch (error) {
    logError('Error in handleGoogleOAuthCallback:', error);
    
    // Even if there's an error, if we have a session, try to redirect anyway
    try {
      const { data: { session: errorSession } } = await supabase.auth.getSession();
      if (errorSession && errorSession.user) {
        logInfo('Error occurred but session exists, attempting redirect anyway...');
        sessionStorage.setItem('loginJustCompleted', 'true');
        hideLoadingOverlay();
        await new Promise(resolve => setTimeout(resolve, 200));
        window.location.replace('/home');
        return;
      }
    } catch (sessionCheckError) {
      logError('Could not check session after error:', sessionCheckError);
    }
    
    // ✅ Clear OAuth flags on error so user can retry
    try {
      sessionStorage.removeItem('oauthCallbackInProgress');
      delete (window as any).__oauthCallbackInProgress;
    } catch (e) {}
    
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

