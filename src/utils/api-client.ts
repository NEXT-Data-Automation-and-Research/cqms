/**
 * API Client Utility
 * 
 * Helper functions for making authenticated API calls to the server
 * This provides a clean interface for client-side code to use server-side APIs
 * 
 * Usage:
 *   import { apiClient } from './utils/api-client.js';
 *   const user = await apiClient.users.getMe();
 *   await apiClient.users.updateMe({ full_name: 'John Doe' });
 */

import { getSupabase } from './supabase-init.js';
import { createLogger } from './logger.js';

const logger = createLogger('APIClient');

/**
 * Get authentication token from Supabase
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Get CSRF token from server
 * Makes a GET request to get the token from response headers
 * Note: CSRF tokens are generated per-request, so we need to fetch fresh tokens
 */
async function getCSRFToken(authToken: string): Promise<string | null> {
  try {
    if (!authToken) {
      return null;
    }

    // Make a GET request to any API endpoint to get CSRF token from response headers
    // The csrfToken middleware generates a new token for each request
    // IMPORTANT: Use the same auth token that will be used in the POST request
    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    // Get token from response headers (check both cases for compatibility)
    const token = response.headers.get('X-CSRF-Token') || response.headers.get('x-csrf-token');
    if (token) {
      logger.debug('CSRF token fetched successfully', { tokenLength: token.length });
      return token;
    } else {
      // Log available headers for debugging
      const headerKeys: string[] = [];
      response.headers.forEach((_, key) => headerKeys.push(key));
      logger.warn('CSRF token not found in response headers', { 
        availableHeaders: headerKeys,
        status: response.status 
      });
    }
  } catch (error) {
    logger.error('Failed to get CSRF token:', error);
  }

  return null;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        data: null,
        error: { message: 'Not authenticated', code: 'AUTH_REQUIRED' },
      };
    }

    // Get CSRF token for state-changing requests
    const method = options.method || 'GET';
    const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
    
    // Build headers as a Record to allow dynamic property assignment
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    // Fetch fresh CSRF token for state-changing requests
    // CSRF tokens are tied to session ID (derived from auth token), so we need a fresh token
    // IMPORTANT: Use the same auth token for both GET (to get token) and POST (to use token)
    // This ensures the session ID matches
    if (needsCSRF) {
      const csrfToken = await getCSRFToken(token);
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
        logger.debug('CSRF token added to request', { endpoint, method, tokenLength: csrfToken.length });
      } else {
        logger.warn('CSRF token not available for request', { endpoint, method });
        // Don't fail the request, let the server handle it
      }
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: json.error || { message: 'Request failed', code: response.status },
      };
    }

    return { data: json.data || json, error: null };
  } catch (error: any) {
    logger.error('API request error:', error);
    return {
      data: null,
      error: { message: error.message || 'Network error', code: 'NETWORK_ERROR' },
    };
  }
}

/**
 * API Client - Provides easy-to-use methods for server-side APIs
 */
export const apiClient = {
  /**
   * User operations
   */
  users: {
    /**
     * Get current user's profile
     */
    async getMe(): Promise<{ data: any | null; error: any }> {
      return apiRequest('/api/users/me');
    },

    /**
     * Update current user's profile
     */
    async updateMe(updates: {
      full_name?: string;
      avatar_url?: string;
      notification_preferences?: any;
      device_info?: any;
    }): Promise<{ data: any | null; error: any }> {
      return apiRequest('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    /**
     * Create user profile (after signup)
     */
    async create(userData: {
      email: string;
      full_name?: string;
      avatar_url?: string;
      provider?: string;
      device_info?: any;
    }): Promise<{ data: any | null; error: any }> {
      return apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
  },

  /**
   * Notification operations
   */
  notifications: {
    /**
     * Get user's notifications
     */
    async getAll(options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }): Promise<{ data: any[] | null; error: any }> {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));

      const query = params.toString();
      return apiRequest(`/api/notifications${query ? `?${query}` : ''}`);
    },

    /**
     * Create a notification
     */
    async create(notification: {
      title: string;
      body: string;
      icon_url?: string;
      image_url?: string;
      action_url?: string;
      type?: string;
      category?: string;
      metadata?: any;
    }): Promise<{ data: any | null; error: any }> {
      return apiRequest('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notification),
      });
    },

    /**
     * Update a notification (e.g., mark as read)
     */
    async update(
      id: string,
      updates: { status?: string; read_at?: string }
    ): Promise<{ data: any | null; error: any }> {
      return apiRequest(`/api/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },

    /**
     * Delete a notification
     */
    async delete(id: string): Promise<{ data: null; error: any }> {
      return apiRequest(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * Notification subscription operations
   */
  subscriptions: {
    /**
     * Get user's notification subscriptions
     */
    async getAll(options?: {
      is_active?: boolean;
    }): Promise<{ data: any[] | null; error: any }> {
      const params = new URLSearchParams();
      if (options?.is_active !== undefined) {
        params.append('is_active', String(options.is_active));
      }

      const query = params.toString();
      return apiRequest(`/api/notification-subscriptions${query ? `?${query}` : ''}`);
    },

    /**
     * Create a notification subscription
     */
    async create(subscription: {
      endpoint: string;
      p256dh: string;
      auth: string;
      user_agent?: string;
      platform?: string;
      browser?: string;
      browser_version?: string;
      os?: string;
      os_version?: string;
      device_type?: string;
      screen_resolution?: string;
      language?: string;
      timezone?: string;
    }): Promise<{ data: any | null; error: any }> {
      return apiRequest('/api/notification-subscriptions', {
        method: 'POST',
        body: JSON.stringify(subscription),
      });
    },

    /**
     * Delete a notification subscription
     */
    async delete(id: string): Promise<{ data: null; error: any }> {
      return apiRequest(`/api/notification-subscriptions/${id}`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * People/User Management operations
   */
  people: {
    /**
     * Get all people/users
     */
    async getAll(): Promise<{ data: any[] | null; error: any }> {
      return apiRequest('/api/people');
    },

    /**
     * Get a person by email
     */
    async getByEmail(email: string): Promise<{ data: any | null; error: any }> {
      return apiRequest(`/api/people/${encodeURIComponent(email)}`);
    },

    /**
     * Create a new person/user
     */
    async create(userData: any): Promise<{ data: any | null; error: any }> {
      return apiRequest('/api/people', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    /**
     * Update a person by email
     */
    async update(email: string, updates: any): Promise<{ data: any | null; error: any }> {
      return apiRequest(`/api/people/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    /**
     * Bulk update multiple people
     */
    async bulkUpdate(emails: string[], updates: any): Promise<{ data: any[] | null; error: any }> {
      return apiRequest('/api/people/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ emails, updates }),
      });
    },
  },
};

