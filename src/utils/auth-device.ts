/**
 * Device Fingerprinting and Validation
 * Prevents token copying attacks by validating device fingerprints
 */

import { getDeviceInfo } from './device-info.js';
import { logWarn, logInfo } from './logging-helper.js';

/**
 * Generate a device fingerprint for the current browser/device
 * Uses key device characteristics that are hard to spoof
 */
export function generateDeviceFingerprint(): string {
  const deviceInfo = getDeviceInfo();
  
  // Create fingerprint from key device characteristics
  const fingerprintData = [
    deviceInfo.user_agent,
    deviceInfo.browser,
    deviceInfo.browser_version,
    deviceInfo.os,
    deviceInfo.os_version,
    deviceInfo.platform,
    deviceInfo.screen?.resolution,
    deviceInfo.hardware_concurrency,
    deviceInfo.device_memory,
    deviceInfo.timezone,
    deviceInfo.language,
  ].filter(Boolean).join('|');
  
  // Simple hash (for production, consider using a proper hashing library)
  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Validate device fingerprint against stored session fingerprint
 * Returns true if device matches, false if different device detected
 * 
 * Note: When tokens refresh, the access token changes, so we use a user-based key
 * instead of token-based key to maintain fingerprint across token refreshes
 */
export function validateDeviceFingerprint(sessionToken: string, userId?: string): boolean {
  // Use user ID if available (persists across token refreshes)
  // Otherwise fall back to token-based key
  const fingerprintKey = userId 
    ? `device_fingerprint_user_${userId}`
    : `device_fingerprint_${sessionToken.substring(0, 20)}`;
  
  const storedFingerprint = localStorage.getItem(fingerprintKey);
  const currentFingerprint = generateDeviceFingerprint();
  
  if (!storedFingerprint) {
    // First time - store the fingerprint for this session/user
    localStorage.setItem(fingerprintKey, currentFingerprint);
    return true;
  }
  
  // Compare fingerprints
  if (storedFingerprint !== currentFingerprint) {
    logWarn('🚨 SECURITY ALERT: Device fingerprint mismatch detected!');
    logWarn('This may indicate token copying or device change.');
    return false;
  }
  
  return true;
}

/**
 * Store device fingerprint for a session
 * ✅ FIX: Also stores using user-based key to match validation logic
 */
export function storeDeviceFingerprint(accessToken: string, userId?: string): void {
  const fingerprint = generateDeviceFingerprint();
  
  // Store using user-based key (persists across token refreshes) if userId available
  if (userId) {
    const userFingerprintKey = `device_fingerprint_user_${userId}`;
    localStorage.setItem(userFingerprintKey, fingerprint);
    logInfo('✅ Device fingerprint stored for user (persists across token refreshes)');
  }
  
  // Also store using token-based key for backward compatibility
  const tokenFingerprintKey = `device_fingerprint_${accessToken.substring(0, 20)}`;
  localStorage.setItem(tokenFingerprintKey, fingerprint);
  logInfo('✅ Device fingerprint stored for session security');
}

/**
 * Clear all device fingerprints from localStorage
 */
export function clearDeviceFingerprints(): void {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('device_fingerprint_')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Check if current device is different from stored device info
 * Detects new device logins by comparing key device identifiers
 */
export function isNewDeviceLogin(currentDeviceInfo: any, storedDeviceInfo: any): boolean {
  if (!storedDeviceInfo || Object.keys(storedDeviceInfo).length === 0) {
    return true; // No stored device info means new device
  }

  // Compare key device identifiers
  const keyFields = [
    'user_agent',
    'browser',
    'browser_version',
    'os',
    'os_version',
    'device_type',
    'platform',
  ];

  for (const field of keyFields) {
    if (currentDeviceInfo[field] !== storedDeviceInfo[field]) {
      return true; // Different device detected
    }
  }

  // Also check screen resolution as additional indicator
  if (currentDeviceInfo.screen?.resolution !== storedDeviceInfo.screen?.resolution) {
    return true;
  }

  return false; // Same device
}

