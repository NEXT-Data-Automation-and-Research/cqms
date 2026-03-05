/**
 * Dev Bypass Authentication
 * Development-only authentication bypass for testing
 * ✅ SECURITY: Disabled in production mode
 */

import { logWarn, logInfo } from './logging-helper.js';

/**
 * Dev bypass - Create a fake authenticated session for testing
 * ✅ SECURITY: Only works when explicitly in development (NODE_ENV === 'development').
 * If window.env is missing or NODE_ENV is not 'development', treat as production (bypass disabled).
 * Also requires isDev=true in localStorage.
 */
export function enableDevBypassAuthentication(userEmail: string = 'dev@test.com'): void {
  // ✅ SECURITY: Default to production when window.env missing or NODE_ENV not 'development'
  const isDevMode = typeof window !== 'undefined' &&
    (window as any).env?.NODE_ENV === 'development';

  if (!isDevMode) {
    logWarn('Dev bypass is disabled (only available when NODE_ENV is "development")');
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
 * SECURITY: Only active when explicitly in development (NODE_ENV === 'development').
 * If window.env is missing or NODE_ENV is not 'development', treat as production (return false).
 */
export function isDevBypassActive(): boolean {
  // ✅ SECURITY: Default to production when window.env missing or NODE_ENV not 'development'
  const isDevMode = typeof window !== 'undefined' &&
    (window as any).env?.NODE_ENV === 'development';

  if (!isDevMode) {
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

