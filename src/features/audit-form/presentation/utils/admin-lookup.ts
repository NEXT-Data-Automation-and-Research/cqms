/**
 * Admin Lookup Utility
 * Finds Intercom admin IDs for employees
 * Migrated from audit-form.html findAdminIdForEmployee() and findAdminIdForCurrentUser()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getSupabaseClient } from './supabase-client-helper.js';

interface AdminCache {
  id: string;
  email: string;
  name?: string;
  admin_data?: {
    id: string;
    email?: string;
    name?: string;
  };
}

export class AdminLookup {
  /**
   * Find admin ID for employee email
   */
  async findAdminIdForEmployee(employeeEmail: string): Promise<string | null> {
    const normalizedEmail = employeeEmail.toLowerCase().trim();
    let adminId: string | null = null;
    let adminFound = false;
    
    // Get Supabase configuration
    const supabaseUrl = (window as any).SupabaseConfig?.url || '';
    const supabaseAnonKey = (window as any).SupabaseConfig?.anonKey || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      this.showError('Configuration error: Supabase credentials not found.');
      return null;
    }
    
    // Try Supabase cache first
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        logInfo(`Looking up admin in Supabase cache for email: ${normalizedEmail}`);
        const { data: cachedAdmins, error: queryError } = await supabase
          .from('intercom_admin_cache')
          .select('id, email, name, admin_data')
          .eq('email', normalizedEmail)
          .limit(1);
        
        const typedAdmins = cachedAdmins as AdminCache[] | null;
        
        if (!queryError && typedAdmins && typedAdmins.length > 0) {
          const cachedAdmin = typedAdmins[0];
          adminId = cachedAdmin.id || cachedAdmin.admin_data?.id || null;
          if (adminId) {
            logInfo(`Admin found in Supabase cache: ${adminId}`);
            adminFound = true;
          }
        } else if (queryError) {
          logWarn('Error querying admin cache:', queryError);
        }
      }
    } catch (cacheError) {
      logWarn('Error accessing Supabase cache:', cacheError);
    }
    
    // Fallback to Intercom API
    if (!adminFound) {
      logInfo('Admin not in cache, fetching from Intercom API...');
      try {
        adminId = await this.fetchAdminFromIntercomAPI(normalizedEmail, supabaseUrl, supabaseAnonKey);
        if (adminId) {
          adminFound = true;
        }
      } catch (error) {
        logError('Error fetching admin from Intercom API:', error);
        this.showError(`Failed to find admin: ${(error as Error).message}`);
        return null;
      }
    }
    
    if (!adminId) {
      this.showError(`Admin ID not found for email: ${employeeEmail}`);
      return null;
    }
    
    return adminId;
  }

  /**
   * Find admin ID for current user
   */
  async findAdminIdForCurrentUser(userEmail: string): Promise<string | null> {
    return this.findAdminIdForEmployee(userEmail);
  }

  /**
   * Fetch admin from Intercom API
   */
  private async fetchAdminFromIntercomAPI(
    normalizedEmail: string,
    supabaseUrl: string,
    supabaseAnonKey: string
  ): Promise<string | null> {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=admins`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const admins = data.admins || data || [];
    
    // Find admin with matching email (case-insensitive)
    const admin = admins.find((a: any) => a.email && a.email.toLowerCase() === normalizedEmail);
    
    if (!admin || !admin.id) {
      return null;
    }
    
    const adminId = admin.id;
    logInfo(`Admin found via Intercom API: ${adminId}`);
    
    // Cache admin for future use (async, don't wait)
    this.cacheAdminAsync(admin).catch(err => {
      logWarn('Failed to cache admin (non-critical):', err);
    });
    
    return adminId;
  }

  /**
   * Cache admin in Supabase
   */
  private async cacheAdminAsync(admin: any): Promise<void> {
    try {
      const adminId = admin.id;
      const adminEmail = admin.email || '';
      const adminName = admin.name || '';
      
      if (!adminId) {
        return;
      }
      
      const supabase = await getSupabaseClient();
      if (!supabase) {
        return;
      }
      
      const cacheData = {
        id: adminId,
        email: adminEmail.toLowerCase().trim(),
        name: adminName,
        admin_data: admin,
        last_synced_at: new Date().toISOString()
      };
      
      const { error: upsertError } = await supabase
        .from('intercom_admin_cache')
        .upsert(cacheData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        logWarn('Failed to cache admin:', upsertError);
      }
    } catch (error) {
      logWarn('Error caching admin:', error);
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (typeof (window as any).showPullConversationsError === 'function') {
      (window as any).showPullConversationsError(message);
    } else {
      logError(message);
    }
  }
}

// Singleton instance
let adminLookupInstance: AdminLookup | null = null;

/**
 * Get admin lookup instance
 */
export function getAdminLookup(): AdminLookup {
  if (!adminLookupInstance) {
    adminLookupInstance = new AdminLookup();
  }
  return adminLookupInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).findAdminIdForEmployee = async (employeeEmail: string) => {
    const lookup = getAdminLookup();
    const adminId = await lookup.findAdminIdForEmployee(employeeEmail);
    (window as any).pullConversationsAdminId = adminId;
    return adminId;
  };
  
  (window as any).findAdminIdForCurrentUser = async (userEmail: string) => {
    const lookup = getAdminLookup();
    const adminId = await lookup.findAdminIdForCurrentUser(userEmail);
    (window as any).pullConversationsAdminId = adminId;
    logInfo(`Admin ID set: ${adminId}`);
    return adminId;
  };
}

