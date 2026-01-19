/**
 * Admin Check Utility
 * Verifies if a user has admin privileges
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';

const logger = createLogger('AdminCheck');

/**
 * Get list of admin emails from environment variable
 * Format: comma-separated list, e.g., "admin@example.com,admin2@example.com"
 */
function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
  if (!adminEmailsEnv) {
    return [];
  }
  return adminEmailsEnv
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
}

/**
 * Get list of admin email domains from environment variable
 * Format: comma-separated list, e.g., "@company.com,@admin.com"
 */
function getAdminDomains(): string[] {
  const adminDomainsEnv = process.env.ADMIN_EMAIL_DOMAINS || '';
  if (!adminDomainsEnv) {
    return [];
  }
  return adminDomainsEnv
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(domain => domain.length > 0 && domain.startsWith('@'));
}

/**
 * Check if user has admin privileges
 * 
 * Admin status is determined by:
 * 1. user.user_metadata?.role === 'admin'
 * 2. user.email is in ADMIN_EMAILS environment variable
 * 3. user.email domain is in ADMIN_EMAIL_DOMAINS environment variable
 * 4. user.role in people table is 'Super Admin' or 'Admin'
 * 
 * @param req Authenticated request with user attached
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(req: AuthenticatedRequest): Promise<boolean> {
  if (!req.user) {
    logger.warn('Admin check failed: No user in request');
    return false;
  }

  const user = req.user;
  const userEmail = user.email?.toLowerCase().trim() || '';

  if (!userEmail) {
    logger.warn('Admin check failed: No email in user object');
    return false;
  }

  // Check 1: user_metadata.role === 'admin'
  const userRole = (user as any).user_metadata?.role;
  if (userRole === 'admin') {
    logger.info(`User ${userEmail} is admin (user_metadata role check)`);
    return true;
  }

  // Check 2: Email in admin list
  const adminEmails = getAdminEmails();
  if (adminEmails.length > 0 && adminEmails.includes(userEmail)) {
    logger.info(`User ${userEmail} is admin (email list)`);
    return true;
  }

  // Check 3: Email domain in admin domains
  const adminDomains = getAdminDomains();
  if (adminDomains.length > 0) {
    for (const domain of adminDomains) {
      if (userEmail.endsWith(domain)) {
        logger.info(`User ${userEmail} is admin (domain check: ${domain})`);
        return true;
      }
    }
  }

  // Check 4: Role in people table (Super Admin or Admin)
  try {
    const supabase = getServerSupabase();
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();

    if (!peopleError && peopleData?.role) {
      const role = peopleData.role.trim();
      if (role === 'Super Admin' || role === 'Admin') {
        logger.info(`User ${userEmail} is admin (people table role check: ${role})`);
        return true;
      }
    } else if (peopleError) {
      logger.warn(`Error checking people table for user ${userEmail}:`, peopleError.message);
    }
  } catch (error: any) {
    logger.warn(`Exception checking people table for user ${userEmail}:`, error.message);
    // Continue to return false - don't fail open
  }

  logger.warn(`User ${userEmail} is not an admin`);
  return false;
}

/**
 * Middleware to require admin access
 * Returns 403 if user is not an admin
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isUserAdmin = await isAdmin(req);
    if (!isUserAdmin) {
      logger.warn(`Admin access denied for user: ${req.user?.email || 'unknown'}`);
      res.status(403).json({ 
        error: 'Admin access required',
        message: 'This endpoint requires administrator privileges'
      });
      return;
    }
    next();
  } catch (error: any) {
    logger.error('Error in requireAdmin middleware:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to verify admin access'
    });
  }
}

