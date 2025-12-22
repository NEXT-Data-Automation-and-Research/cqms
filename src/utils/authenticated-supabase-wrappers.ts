/**
 * Authenticated Supabase Wrappers
 * Creates authenticated wrappers for Supabase client, query builder, and storage
 */

import type { AuthStatus } from './authenticated-supabase-auth.js';
import { clearAuthCache } from './authenticated-supabase-auth.js';
import { createLogger } from './logger.js';

const logger = createLogger('AuthWrappers');

/**
 * Create authenticated client wrapper
 * Intercepts all database operations to ensure authentication
 */
export function createAuthenticatedClient(supabase: any, auth: AuthStatus): any {
  return new Proxy(supabase, {
    get(target, prop) {
      const original = target[prop];
      
      if (prop === 'from') {
        return function(tableName: string) {
          if (!auth.isAuthenticated) {
            const error = new Error(`Authentication required to access table '${tableName}'`);
            (error as any).code = 'AUTH_REQUIRED';
            throw error;
          }
          
          logger.debug(`Authenticated database access: ${tableName} (user: ${auth.userId})`);
          const queryBuilder = original.call(target, tableName);
          return createAuthenticatedQueryBuilder(queryBuilder, auth, tableName);
        };
      }
      
      if (prop === 'auth') {
        return original;
      }
      
      if (prop === 'storage') {
        return createAuthenticatedStorage(original, auth);
      }
      
      return typeof original === 'function' ? original.bind(target) : original;
    },
  });
}

/**
 * Create authenticated query builder
 * Wraps query builder methods to enforce authentication
 */
function createAuthenticatedQueryBuilder(queryBuilder: any, auth: AuthStatus, tableName: string): any {
  const executionMethods = ['select', 'insert', 'update', 'upsert', 'delete'];
  
  return new Proxy(queryBuilder, {
    get(target, prop) {
      const original = target[prop];
      
      if (typeof original !== 'function') {
        return original;
      }
      
      if (executionMethods.includes(prop as string)) {
        return function(...args: any[]) {
          if (!auth.isAuthenticated) {
            const error = new Error(`Authentication required for ${String(prop)} on '${tableName}'`);
            (error as any).code = 'AUTH_REQUIRED';
            throw error;
          }
          
          logger.debug(`Executing authenticated ${String(prop)} on ${tableName}`);
          const result = original.apply(target, args);
          
          if (result && typeof result === 'object') {
            if (typeof result.then === 'function') {
              return result.then((response: any) => {
                if (response?.error) {
                  if (response.error.code === 'PGRST301' || response.error.code === '42501') {
                    clearAuthCache();
                    const error = new Error(`Authentication failed: ${response.error.message}`);
                    (error as any).code = 'AUTH_FAILED';
                    throw error;
                  }
                }
                return response;
              });
            }
            
            const isQueryBuilder = 
              typeof result.eq === 'function' ||
              typeof result.filter === 'function' ||
              typeof result.order === 'function';
            
            if (isQueryBuilder) {
              return createAuthenticatedQueryBuilder(result, auth, tableName);
            }
          }
          
          return result;
        };
      }
      
      return function(...args: any[]) {
        const result = original.apply(target, args);
        
        if (result && typeof result === 'object' && typeof result.then !== 'function') {
          const isQueryBuilder = 
            typeof result.eq === 'function' ||
            typeof result.filter === 'function' ||
            typeof result.order === 'function';
          
          if (isQueryBuilder) {
            return createAuthenticatedQueryBuilder(result, auth, tableName);
          }
        }
        
        return result;
      };
    },
  });
}

/**
 * Create authenticated storage wrapper
 */
function createAuthenticatedStorage(storage: any, auth: AuthStatus): any {
  return new Proxy(storage, {
    get(target, prop) {
      const original = target[prop];
      
      if (prop === 'from') {
        return function(bucketName: string) {
          if (!auth.isAuthenticated) {
            const error = new Error(`Authentication required to access bucket '${bucketName}'`);
            (error as any).code = 'AUTH_REQUIRED';
            throw error;
          }
          return original.call(target, bucketName);
        };
      }
      
      return typeof original === 'function' ? original.bind(target) : original;
    },
  });
}

