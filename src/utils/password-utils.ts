/**
 * Password Utilities
 * Secure password generation and hashing utilities
 * 
 * SECURITY: Never log passwords or password hashes
 * 
 * NOTE: This file is used in both browser and Node.js contexts.
 * Web Crypto API (crypto.subtle) is used for browser compatibility.
 */

/**
 * Generate a secure random password
 * Format: 12 characters with uppercase, lowercase, numbers, and special chars
 * 
 * @param length Password length (default: 12)
 * @returns Secure random password
 */
export function generateSecurePassword(length: number = 12): string {
  // Character sets
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I and O for clarity
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Exclude l and o for clarity
  const numbers = '23456789'; // Exclude 0, 1 for clarity
  const special = '!@#$%&*';
  
  // Ensure at least one character from each set
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hash password using SHA-256 (for compatibility with existing system)
 * 
 * NOTE: SHA-256 is not ideal for password hashing (no salt, fast)
 * TODO: Migrate to bcrypt or argon2 for better security
 * 
 * Uses Web Crypto API (available in both browser and Node.js 15+)
 * 
 * @param password Plain text password
 * @returns SHA-256 hash (hex string)
 */
export async function hashPasswordSHA256(password: string): Promise<string> {
  // Use Web Crypto API - works in both browser and Node.js
  const crypto = globalThis.crypto || (globalThis as any).window?.crypto;
  if (!crypto || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate default password for new users
 * Currently uses email as password (for compatibility)
 * 
 * SECURITY WARNING: This is insecure and should be replaced with:
 * 1. Generate secure random password
 * 2. Hash it properly (bcrypt/argon2)
 * 3. Require password change on first login
 * 
 * @param email User email
 * @returns Password hash (currently just email)
 */
export function generateDefaultPasswordHash(email: string): string {
  // SECURITY: Currently returns email as password hash
  // This is insecure but maintained for compatibility
  // TODO: Implement proper password generation and hashing
  return email.toLowerCase().trim();
}

