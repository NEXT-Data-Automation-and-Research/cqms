/**
 * Dev Bypass Authentication
 * Development-only authentication bypass for testing
 * ✅ SECURITY: Disabled in production mode
 */

import { logWarn, logInfo } from './logging-helper.js';

/**
 * Dev bypass - Create a fake authenticated session for testing
 * ✅ SECURITY: Only works in development mode (NODE_ENV !== 'production')
 * Only works when isDev=true in localStorage AND not in production
 */
export function enableDevBypassAuthentication(userEmail: string = 'dev@test.com'): void {
  // ✅ SECURITY FIX: Disable dev bypass in production
  const isProduction = typeof window !== 'undefined' && 
    (window as any).env?.NODE_ENV === 'production';
  
  if (isProduction) {
    logWarn('Dev bypass is disabled in production mode');
    return;
  }
  
  const isDev = localStorage.getItem('isDev') === 'true';
  
  if (!isDev) {
    logWarn('Dev bypass only works when isDev=true in localStorage');
    return;
  }

  // Create fake user info
  const fakeUser = {
    id: 'dev-user-' + Date.now(),
    email: userEmail,
    name: 'Dev User',
    picture: '',
    provider: 'dev-bypass',
    isDev: true,
  };

  localStorage.setItem('userInfo', JSON.stringify(fakeUser));
  logInfo('Dev bypass enabled for:', { email: userEmail });
}

/**
 * Check if current session is a dev bypass
 * SECURITY: Only works in development mode (NODE_ENV !== 'production')
 */
export function isDevBypassActive(): boolean {
  // ✅ SECURITY FIX: Disable dev bypass in production
  // Check if we're in production mode (from window.env or assume production if not set)
  const isProduction = typeof window !== 'undefined' && 
    (window as any).env?.NODE_ENV === 'production';
  
  // If production mode, dev bypass is disabled
  if (isProduction) {
    return false;
  }
  
  const userInfoStr = localStorage.getItem('userInfo');
  if (!userInfoStr) {
    return false;
  }
  
  try {
    const userInfo = JSON.parse(userInfoStr);
    return !!(userInfo.isDev || userInfo.provider === 'dev-bypass');
  } catch (error) {
    return false;
  }
}

