/**
 * API Client Utility
 * 
 * Helper functions for making authenticated API calls to the server
 * This provides a clean interface for client-side code to use server-side APIs
 * 
 * Features:
 * - Automatic token refresh on 401 errors
 * - CSRF token handling for state-changing requests
 * - Consistent error handling across all endpoints
 * 
 * Usage:
 *   import { apiClient } from './utils/api-client.js';
 *   const user = await apiClient.users.getMe();
 *   await apiClient.users.updateMe({ full_name: 'John Doe' });
 */

import { getSupabase } from './supabase-init.js';
import { createLogger } from './logger.js';

const logger = createLogger('APIClient');

// Track if we're currently handling a 401 to prevent infinite loops
let isHandling401 = false;

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

    // Make a lightweight GET request to obtain CSRF token from response headers.
    // IMPORTANT: Include the same Authorization header used in the state-changing request
    // so the server derives the same sessionId for CSRF validation.
    const response = await fetch('/api/csrf', {
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
      // Don't spam logs here; callers will gracefully handle missing token.
    }
  } catch (error) {
    logger.error('Failed to get CSRF token:', error);
  }

  return null;
}

/** Options for apiRequest that are not part of RequestInit (stripped before fetch) */
export interface ApiRequestOptions {
  /** When true, do not redirect to login on 401. Caller handles retry/redirect. Used for permission checks. */
  skipRedirectOn401?: boolean;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & ApiRequestOptions = {}
): Promise<{ data: T | null; error: any }> {
  const { skipRedirectOn401, ...fetchInit } = options;
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        data: null,
        error: { message: 'Not authenticated', code: 'AUTH_REQUIRED' },
      };
    }

    // Get CSRF token for state-changing requests
    const method = fetchInit.method || 'GET';
    const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
    
    // Build headers as a Record to allow dynamic property assignment
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(fetchInit.headers as Record<string, string>),
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
        // Avoid making a doomed network request that will 403 (and show up in console).
        return {
          data: null,
          error: { message: 'CSRF token not available', code: 'CSRF_REQUIRED' },
        };
      }
    }

    const response = await fetch(endpoint, {
      ...fetchInit,
      headers,
    });

    // Parse body safely: server or proxy may return plain text (e.g. "Too many requests" on 429)
    const text = await response.text();
    let json: any = {};
    if (text && text.trim()) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          json = JSON.parse(text);
        } catch (e) {
          logger.warn('Response declared JSON but parse failed', { endpoint, status: response.status, snippet: text.slice(0, 80) });
          json = { error: text };
        }
      } else {
        // Plain text or other: treat as error message when not ok
        json = response.ok ? {} : { error: text };
      }
    }

    if (!response.ok) {
      // Handle 401 errors with automatic token refresh (unless skipRedirectOn401 for permission checks)
      if (response.status === 401 && !isHandling401 && !skipRedirectOn401) {
        logger.warn('401 error - attempting token refresh');
        isHandling401 = true;
        
        try {
          const supabase = getSupabase();
          if (supabase) {
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (!refreshError && session) {
              // Token refreshed successfully - retry the request once
              logger.info('Token refreshed - retrying request');
              isHandling401 = false;
              return apiRequest<T>(endpoint, options);
            }
          }
          
          // Refresh failed - session is invalid
          logger.error('Token refresh failed - redirecting to login');
          
          // Store current path for redirect after login
          try {
            const currentPath = window.location.pathname + window.location.search;
            if (currentPath && !currentPath.includes('auth-page')) {
              sessionStorage.setItem('redirectAfterLogin', currentPath);
            }
          } catch (e) {}
          
          // Redirect to login
          window.location.href = '/src/auth/presentation/auth-page.html';
          
        } finally {
          isHandling401 = false;
        }
      }
      // When skipRedirectOn401 is true, fall through and return error to caller (no redirect)
      
      // Extract error message from various response formats
      let errorMessage = 'Request failed';
      let errorCode = response.status;
      
      // Try multiple ways to extract error message
      if (json.error) {
        if (typeof json.error === 'string') {
          errorMessage = json.error;
        } else {
          errorMessage = json.error.message || json.error.error || errorMessage;
          errorCode = json.error.code || json.error.status || errorCode;
        }
      } else if (json.message) {
        errorMessage = json.message;
      } else if (json.details?.message) {
        errorMessage = json.details.message;
      } else if (json.details?.error) {
        errorMessage = json.details.error;
      }
      
      // Log the full response for debugging
      logger.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        response: json,
        endpoint,
      });
      
      // Include all error details from the response
      const errorResponse: any = { 
        message: errorMessage, 
        code: errorCode, 
        status: response.status,
        statusText: response.statusText,
      };
      
      // Include details if available
      if (json.details) {
        errorResponse.details = json.details;
      } else {
        errorResponse.details = json;
      }
      
      return {
        data: null,
        error: errorResponse,
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

  /**
   * Google Meet operations
   */
  googleMeet: {
    /**
     * Generate a Google Meet link
     * @param options - Options for generating the Meet link
     * @returns Promise with meetLink and optional calendarEventId
     */
    async generate(options?: {
      title?: string;
      startTime?: string;
      endTime?: string;
      description?: string;
      attendees?: string[];
    }): Promise<{ success: boolean; meetLink: string; calendarEventId?: string }> {
      const result = await apiRequest<{ success: boolean; meetLink: string; calendarEventId?: string }>('/api/google-meet/generate', {
        method: 'POST',
        body: JSON.stringify(options || {}),
      });
      
      if (result.error) {
        // Create error with all available details
        const errorMessage = result.error.message || result.error.error || 'Failed to generate Meet link';
        const error = new Error(errorMessage);
        
        // Attach all error properties
        (error as any).code = result.error.code;
        (error as any).status = result.error.status;
        (error as any).statusText = result.error.statusText;
        (error as any).details = result.error.details;
        (error as any).error = result.error; // Include full error object
        
        // Log the error for debugging
        logger.error('[APIClient] Google Meet generation error:', {
          message: errorMessage,
          code: result.error.code,
          status: result.error.status,
          details: result.error.details,
        });
        
        throw error;
      }
      
      if (!result.data) {
        throw new Error('No data returned from Meet link generation');
      }
      
      return result.data;
    },
  },

  /**
   * Analytics operations (user activity and platform analytics)
   */
  analytics: {
    async getMe(params?: { days?: number; limit?: number }): Promise<{ page_views: any[]; from: string; to: string; limit: number }> {
      const q = new URLSearchParams();
      if (params?.days) q.set('days', String(params.days));
      if (params?.limit) q.set('limit', String(params.limit));
      const suffix = q.toString() ? `?${q.toString()}` : '';
      return apiClient.get(`/api/analytics/me${suffix}`);
    },
    async getAdminSummary(params?: { days?: number }): Promise<any> {
      const q = params?.days ? `?days=${params.days}` : '';
      return apiClient.get(`/api/analytics/admin/summary${q}`);
    },
    async getAdminByPage(params?: { days?: number }): Promise<any> {
      const q = params?.days ? `?days=${params.days}` : '';
      return apiClient.get(`/api/analytics/admin/by-page${q}`);
    },
    async getAdminByUser(userId: string, params?: { days?: number; limit?: number }): Promise<any> {
      const q = new URLSearchParams();
      if (params?.days) q.set('days', String(params.days));
      if (params?.limit) q.set('limit', String(params.limit));
      const suffix = q.toString() ? `?${q.toString()}` : '';
      return apiClient.get(`/api/analytics/admin/by-user/${encodeURIComponent(userId)}${suffix}`);
    },
  },

  /**
   * Generic HTTP methods for direct API calls
   * Use these when you need to call endpoints that don't have specific methods
   */
  async get<T = any>(endpoint: string): Promise<T> {
    const result = await apiRequest<T>(endpoint, { method: 'GET' });
    if (result.error) {
      const error: any = new Error(result.error.message || 'Request failed');
      error.code = result.error.code;
      error.status = result.error.status;
      error.statusText = result.error.statusText;
      error.details = result.error.details;
      throw error;
    }
    return result.data as T;
  },

  async post<T = any>(endpoint: string, data?: any, requestOptions?: ApiRequestOptions): Promise<T> {
    const result = await apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...requestOptions,
    });
    if (result.error) {
      const error: any = new Error(result.error.message || 'Request failed');
      error.code = result.error.code;
      error.status = result.error.status;
      error.statusText = result.error.statusText;
      error.details = result.error.details;
      throw error;
    }
    return result.data as T;
  },

  /**
   * POST that returns { data, error } without throwing. Use for permission checks so callers can
   * handle 401 (retry) vs 403 (access denied) without triggering global redirect on first 401.
   */
  async postWithResult<T = any>(
    endpoint: string,
    data?: any,
    requestOptions?: ApiRequestOptions
  ): Promise<{ data: T | null; error: any }> {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...requestOptions,
    });
  },

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const result = await apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      const error: any = new Error(result.error.message || 'Request failed');
      error.code = result.error.code;
      error.status = result.error.status;
      error.statusText = result.error.statusText;
      error.details = result.error.details;
      throw error;
    }
    return result.data as T;
  },

  async delete<T = any>(endpoint: string): Promise<T> {
    const result = await apiRequest<T>(endpoint, { method: 'DELETE' });
    if (result.error) {
      const error: any = new Error(result.error.message || 'Request failed');
      error.code = result.error.code;
      error.status = result.error.status;
      error.statusText = result.error.statusText;
      error.details = result.error.details;
      throw error;
    }
    return result.data as T;
  },

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const result = await apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (result.error) {
      const error: any = new Error(result.error.message || 'Request failed');
      error.code = result.error.code;
      error.status = result.error.status;
      error.statusText = result.error.statusText;
      error.details = result.error.details;
      throw error;
    }
    return result.data as T;
  },
};

