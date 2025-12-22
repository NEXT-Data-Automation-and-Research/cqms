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

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
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
};

