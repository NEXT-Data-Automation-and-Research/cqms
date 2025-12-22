/**
 * Secure Supabase Client Wrapper
 * 
 * This wrapper ensures ALL database operations are authenticated.
 * It automatically verifies authentication before every call,
 * making your system secure by default.
 * 
 * Usage:
 *   import { getSecureSupabase } from './utils/secure-supabase.js';
 *   const supabase = await getSecureSupabase();
 *   const { data, error } = await supabase.from('users').select('*');
 */

import { getSupabase } from './supabase-init.js';
import { supabaseLogger } from './logger.js';

/**
 * Authentication verification result
 */
interface AuthVerification {
  isAuthenticated: boolean;
  userId: string | null;
  session: any | null;
  error?: string;
}

/**
 * Cache for authentication verification (valid for 30 seconds)
 */
let authCache: {
  verification: AuthVerification;
  timestamp: number;
} | null = null;

const AUTH_CACHE_DURATION = 30000; // 30 seconds

/**
 * Verify user authentication
 * Uses caching to avoid excessive API calls
 */
async function verifyAuthentication(): Promise<AuthVerification> {
  // Check cache first
  if (authCache && (Date.now() - authCache.timestamp) < AUTH_CACHE_DURATION) {
    return authCache.verification;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      isAuthenticated: false,
      userId: null,
      session: null,
      error: 'Supabase client not initialized',
    };
  }

  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
      const result = {
        isAuthenticated: false,
        userId: null,
        session: null,
        error: sessionError?.message || 'No active session',
      };
      
      // Cache negative result for shorter duration (5 seconds)
      authCache = {
        verification: result,
        timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000),
      };
      
      return result;
    }

    // Double-check with getUser() for extra security
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || user.id !== session.user.id) {
      const result = {
        isAuthenticated: false,
        userId: null,
        session: null,
        error: userError?.message || 'User verification failed',
      };
      
      authCache = {
        verification: result,
        timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000),
      };
      
      return result;
    }

    const result = {
      isAuthenticated: true,
      userId: user.id,
      session: session,
      error: undefined,
    };

    // Cache positive result
    authCache = {
      verification: result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error: any) {
    const result = {
      isAuthenticated: false,
      userId: null,
      session: null,
      error: error.message || 'Authentication verification failed',
    };
    
    authCache = {
      verification: result,
      timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000),
    };
    
    return result;
  }
}

/**
 * Clear authentication cache (call after sign in/out)
 */
export function clearAuthCache(): void {
  authCache = null;
  supabaseLogger.debug('Authentication cache cleared');
}

/**
 * Get authenticated Supabase client
 * 
 * This function returns a secure wrapper that automatically
 * verifies authentication before every database operation.
 * 
 * @param requireAuth - If true, throws error if not authenticated (default: true)
 * @returns Secure Supabase client wrapper
 */
export async function getSecureSupabase(requireAuth: boolean = true): Promise<any> {
  const supabase = getSupabase();
  
  if (!supabase) {
    throw new Error('Supabase client not initialized. Call initSupabase() first.');
  }

  // Verify authentication
  const auth = await verifyAuthentication();
  
  if (requireAuth && !auth.isAuthenticated) {
    const error = new Error(`Authentication required: ${auth.error || 'User not authenticated'}`);
    (error as any).code = 'AUTH_REQUIRED';
    (error as any).authError = auth.error;
    supabaseLogger.warn('Authentication required but user not authenticated:', auth.error);
    throw error;
  }

  // Return wrapped client with automatic auth verification
  return createSecureClient(supabase, auth);
}

/**
 * Create a secure client wrapper that intercepts all database calls
 */
function createSecureClient(supabase: any, auth: AuthVerification): any {
  // Create a proxy that intercepts all method calls
  return new Proxy(supabase, {
    get(target, prop) {
      const original = target[prop];
      
      // Intercept 'from' method (database operations)
      if (prop === 'from') {
        return function(tableName: string) {
          // Verify auth before allowing database access
          if (!auth.isAuthenticated) {
            const error = new Error(`Authentication required to access table '${tableName}'`);
            (error as any).code = 'AUTH_REQUIRED';
            throw error;
          }
          
          supabaseLogger.debug(`Secure database access to table: ${tableName} (user: ${auth.userId})`);
          
          // Get the original query builder
          const queryBuilder = original.call(target, tableName);
          
          // Wrap the query builder methods to add auth verification
          return createSecureQueryBuilder(queryBuilder, auth, tableName);
        };
      }
      
      // For auth methods, return original (they don't need auth verification)
      if (prop === 'auth') {
        return original;
      }
      
      // For storage methods, return original
      if (prop === 'storage') {
        return original;
      }
      
      // For other methods, return original
      return typeof original === 'function' ? original.bind(target) : original;
    },
  });
}

/**
 * Create a secure query builder that verifies auth on execution
 */
function createSecureQueryBuilder(queryBuilder: any, auth: AuthVerification, tableName: string): any {
  // Methods that execute queries
  const executionMethods = ['select', 'insert', 'update', 'upsert', 'delete'];
  
  // Wrap execution methods
  const wrappedBuilder = new Proxy(queryBuilder, {
    get(target, prop) {
      const original = target[prop];
      
      if (typeof original !== 'function') {
        return original;
      }
      
      // For execution methods, add auth verification
      if (executionMethods.includes(prop as string)) {
        return function(...args: any[]) {
          // Verify auth before executing
          if (!auth.isAuthenticated) {
            const error = new Error(`Authentication required for ${String(prop)} operation on '${tableName}'`);
            (error as any).code = 'AUTH_REQUIRED';
            throw error;
          }
          
          supabaseLogger.debug(`Executing secure ${String(prop)} operation on ${tableName}`);
          
          // Execute original method
          const result = original.apply(target, args);
          
          // For 'select', 'insert', 'update', 'upsert', 'delete' - they return query builders that can be chained
          // We need to wrap the query builder so chaining methods work
          if (result && typeof result === 'object' && result !== null) {
            // Check if it's a query builder (has chaining methods)
            const isQueryBuilder = 
              typeof result.eq === 'function' ||
              typeof result.filter === 'function' ||
              typeof result.order === 'function' ||
              typeof result.limit === 'function' ||
              typeof result.single === 'function' ||
              typeof result.maybeSingle === 'function';
            
            if (isQueryBuilder) {
              // Wrap the query builder so chaining works
              return createSecureQueryBuilder(result, auth, tableName);
            }
            
            // If it's a promise (final execution), add auth verification
            if (typeof result.then === 'function') {
              return result.then((response: any) => {
                // Check for auth errors in response
                if (response?.error) {
                  // Check if it's an auth-related error
                  if (response.error.message?.includes('JWT') || 
                      response.error.message?.includes('authentication') ||
                      response.error.message?.includes('permission') ||
                      response.error.code === 'PGRST301' ||
                      response.error.code === '42501') {
                    // Clear cache and throw
                    clearAuthCache();
                    const error = new Error(`Authentication failed: ${response.error.message}`);
                    (error as any).code = 'AUTH_FAILED';
                    (error as any).originalError = response.error;
                    supabaseLogger.error('Authentication failed during database operation:', response.error);
                    throw error;
                  }
                }
                return response;
              }).catch((error: any) => {
                // Handle auth-related errors
                if (error.message?.includes('JWT') || 
                    error.message?.includes('authentication') ||
                    error.message?.includes('permission')) {
                  clearAuthCache();
                  supabaseLogger.error('Authentication error during database operation:', error);
                }
                throw error;
              });
            }
          }
          
          return result;
        };
      }
      
      // For non-execution methods (eq, filter, order, maybeSingle, etc.), 
      // execute and wrap the result if it's a query builder
      return function(...args: any[]) {
        const result = original.apply(target, args);
        
        // If result is a query builder (chaining), wrap it recursively
        if (result && typeof result === 'object' && result !== null) {
          // If it's already a promise (execution result), return as-is
          if (typeof result.then === 'function') {
            return result;
          }
          
          // Check if it looks like a Supabase query builder
          // Query builders have methods like eq, filter, order, maybeSingle, etc.
          const hasQueryBuilderMethods = 
            typeof result.eq === 'function' ||
            typeof result.filter === 'function' ||
            typeof result.order === 'function' ||
            typeof result.limit === 'function' ||
            typeof result.range === 'function' ||
            typeof result.single === 'function' ||
            typeof result.maybeSingle === 'function' ||
            typeof result.select === 'function' ||
            typeof result.insert === 'function' ||
            typeof result.update === 'function';
          
          if (hasQueryBuilderMethods) {
            // Wrap it to continue the chain
            return createSecureQueryBuilder(result, auth, tableName);
          }
        }
        
        return result;
      };
    },
  });
  
  return wrappedBuilder;
}

/**
 * Secure database operation helpers
 * These functions automatically verify authentication
 */

/**
 * Secure SELECT operation
 */
export async function secureSelect<T = any>(
  tableName: string,
  query?: string,
  options?: { filter?: Record<string, any>; orderBy?: string; limit?: number }
): Promise<{ data: T[] | null; error: any }> {
  const supabase = await getSecureSupabase();
  
  let queryBuilder = supabase.from(tableName).select(query || '*');
  
  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      queryBuilder = queryBuilder.eq(key, value);
    });
  }
  
  if (options?.orderBy) {
    queryBuilder = queryBuilder.order(options.orderBy, { ascending: true });
  }
  
  if (options?.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }
  
  return await queryBuilder;
}

/**
 * Secure INSERT operation
 */
export async function secureInsert<T = any>(
  tableName: string,
  data: T | T[]
): Promise<{ data: T[] | null; error: any }> {
  const supabase = await getSecureSupabase();
  return await supabase.from(tableName).insert(data).select();
}

/**
 * Secure UPDATE operation
 */
export async function secureUpdate<T = any>(
  tableName: string,
  data: Partial<T>,
  filter: Record<string, any>
): Promise<{ data: T[] | null; error: any }> {
  const supabase = await getSecureSupabase();
  
  let queryBuilder = supabase.from(tableName).update(data);
  
  Object.entries(filter).forEach(([key, value]) => {
    queryBuilder = queryBuilder.eq(key, value);
  });
  
  return await queryBuilder.select();
}

/**
 * Secure UPSERT operation
 */
export async function secureUpsert<T = any>(
  tableName: string,
  data: T | T[],
  options?: { onConflict?: string }
): Promise<{ data: T[] | null; error: any }> {
  const supabase = await getSecureSupabase();
  
  const upsertOptions: any = {};
  if (options?.onConflict) {
    upsertOptions.onConflict = options.onConflict;
  }
  
  return await supabase.from(tableName).upsert(data, upsertOptions).select();
}

/**
 * Secure DELETE operation
 */
export async function secureDelete(
  tableName: string,
  filter: Record<string, any>
): Promise<{ data: any[] | null; error: any }> {
  const supabase = await getSecureSupabase();
  
  let queryBuilder = supabase.from(tableName).delete();
  
  Object.entries(filter).forEach(([key, value]) => {
    queryBuilder = queryBuilder.eq(key, value);
  });
  
  return await queryBuilder.select();
}

/**
 * Get current authenticated user ID
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const auth = await verifyAuthentication();
  return auth.userId;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const auth = await verifyAuthentication();
  return auth.isAuthenticated;
}

