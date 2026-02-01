/**
 * Device Fingerprinting and Validation
 * Prevents token copying attacks by validating device fingerprints
 * 
 * DESIGN: Uses "stable" characteristics that don't change often
 * to reduce false positives while still detecting actual token theft.
 * 
 * STABLE (used): OS, platform, timezone, language, hardware cores
 * UNSTABLE (excluded): browser version, screen resolution (changes with zoom)
 */

import { getDeviceInfo } from './device-info.js';
import { logWarn, logInfo } from './logging-helper.js';

/**
 * Generate a device fingerprint for the current browser/device
 * Uses STABLE characteristics that rarely change to reduce false positives
 */
export function generateDeviceFingerprint(): string {
  const deviceInfo = getDeviceInfo();
  
  // Use only STABLE characteristics to reduce false positives
  // These don't change when user zooms, updates browser, etc.
  const stableData = [
    deviceInfo.os,                    // Windows, macOS, Linux, iOS, Android
    deviceInfo.platform,              // Win32, MacIntel, Linux, etc.
    deviceInfo.timezone,              // America/New_York, etc.
    deviceInfo.language,              // en-US, etc.
    deviceInfo.hardware_concurrency,  // CPU cores (rarely changes)
  ].filter(Boolean).join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < stableData.length; i++) {
    const char = stableData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Generate a "loose" fingerprint for comparison
 * Even more tolerant - just OS + platform + timezone
 */
function generateLooseFingerprint(): string {
  const deviceInfo = getDeviceInfo();
  
  const looseData = [
    deviceInfo.os,
    deviceInfo.platform,
    deviceInfo.timezone,
  ].filter(Boolean).join('|');
  
  let hash = 0;
  for (let i = 0; i < looseData.length; i++) {
    const char = looseData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Validate device fingerprint against stored session fingerprint
 * Returns true if device matches, false if different device detected
 * 
 * TOLERANCE STRATEGY:
 * 1. First, compare exact fingerprints
 * 2. If mismatch, compare loose fingerprints (OS + platform + timezone only)
 * 3. If loose match, update stored fingerprint (minor change like browser update)
 * 4. Only fail if loose fingerprint also mismatches (actual different device)
 * 
 * Note: When tokens refresh, the access token changes, so we use a user-based key
 * instead of token-based key to maintain fingerprint across token refreshes
 */
export function validateDeviceFingerprint(sessionToken: string, userId?: string): boolean {
  // Use user ID if available (persists across token refreshes)
  const fingerprintKey = userId 
    ? `device_fingerprint_user_${userId}`
    : `device_fingerprint_${sessionToken.substring(0, 20)}`;
  
  const looseKey = userId
    ? `device_fingerprint_loose_${userId}`
    : `device_fingerprint_loose_${sessionToken.substring(0, 20)}`;
  
  const storedFingerprint = localStorage.getItem(fingerprintKey);
  const storedLooseFingerprint = localStorage.getItem(looseKey);
  const currentFingerprint = generateDeviceFingerprint();
  const currentLooseFingerprint = generateLooseFingerprint();
  
  if (!storedFingerprint) {
    // First time - store both fingerprints
    localStorage.setItem(fingerprintKey, currentFingerprint);
    localStorage.setItem(looseKey, currentLooseFingerprint);
    logInfo('✅ Device fingerprint stored for session security');
    return true;
  }
  
  // Exact match - all good
  if (storedFingerprint === currentFingerprint) {
    return true;
  }
  
  // Fingerprint changed - check loose fingerprint
  if (storedLooseFingerprint === currentLooseFingerprint) {
    // Same device, just minor changes (browser update, zoom change, etc.)
    // Update stored fingerprint to new value
    logInfo('📱 Device fingerprint updated (minor change detected)');
    localStorage.setItem(fingerprintKey, currentFingerprint);
    return true;
  }
  
  // Loose fingerprint also mismatches - this is a different device
  logWarn('🚨 SECURITY ALERT: Device fingerprint mismatch detected!');
  logWarn('This may indicate token copying to a different device.');
  return false;
}

/**
 * Store device fingerprint for a session
 * Stores both exact and loose fingerprints for tolerance
 */
export function storeDeviceFingerprint(accessToken: string, userId?: string): void {
  const fingerprint = generateDeviceFingerprint();
  const looseFingerprint = generateLooseFingerprint();
  
  // Store using user-based key (persists across token refreshes) if userId available
  if (userId) {
    localStorage.setItem(`device_fingerprint_user_${userId}`, fingerprint);
    localStorage.setItem(`device_fingerprint_loose_${userId}`, looseFingerprint);
    logInfo('✅ Device fingerprint stored for user');
  }
  
  // Also store using token-based key for backward compatibility
  const tokenPrefix = accessToken.substring(0, 20);
  localStorage.setItem(`device_fingerprint_${tokenPrefix}`, fingerprint);
  localStorage.setItem(`device_fingerprint_loose_${tokenPrefix}`, looseFingerprint);
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

