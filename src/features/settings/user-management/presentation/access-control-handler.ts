/**
 * Access Control Handler
 * Handles access control initialization and checks
 */

import { logWarn, logError, logInfo } from '../../../../utils/logging-helper.js';

export class AccessControlHandler {
  /**
   * Wait for access control to be available (optional - doesn't block if not available)
   */
  async waitForAccessControl(): Promise<void> {
    let attempts = 0;
    // Wait for supabaseClient first
    while (!window.supabaseClient && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    // Wait for accessControl to be available (optional, but wait a bit)
    attempts = 0;
    while (!window.accessControl && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    // If accessControl exists, try to load rules (but don't fail if it doesn't)
    if (window.accessControl && typeof (window.accessControl as any).loadRulesFromDatabase === 'function') {
      try {
        await (window.accessControl as any).loadRulesFromDatabase();
        logInfo('[AccessControlHandler] Access control rules loaded successfully');
      } catch (error) {
        // Access control loading failed, but continue anyway
        logWarn('[AccessControlHandler] Failed to load access control rules:', error);
      }
    } else {
      logInfo('[AccessControlHandler] accessControl not available, will skip access check');
    }
  }

  /**
   * Check and enforce page access
   * If accessControl exists, use it; otherwise allow access (like dashboard pattern)
   */
  async enforcePageAccess(pageName: string): Promise<boolean> {
    // If accessControl exists, use it; otherwise allow access (like dashboard does)
    if (!window.accessControl) {
      logInfo('[AccessControlHandler] accessControl not found, allowing access (optional feature)');
      return true; // Allow access if accessControl is not available (optional feature)
    }

    try {
      const accessAllowed = await window.accessControl.enforcePageAccess(pageName);
      if (!accessAllowed) {
        logWarn(`[AccessControlHandler] Access denied for page: ${pageName}`);
      }
      return accessAllowed;
    } catch (error) {
      logError('[AccessControlHandler] Error checking page access:', error);
      // On error, allow access (fail open) - accessControl is optional
      return true;
    }
  }
}

