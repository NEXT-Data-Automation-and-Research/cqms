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
  // Methods that execute queries (return promises)
  const executionMethods = ['insert', 'update', 'upsert', 'delete'];
  // Methods that return query builders (can be chained)
  const queryBuilderMethods = ['select', 'filter', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps', 'textSearch', 'match', 'not', 'or', 'order', 'limit', 'range', 'abortSignal', 'single', 'maybeSingle', 'csv', 'geojson', 'explain', 'rollback', 'returns'];

  return new Proxy(queryBuilder, {
    get(target, prop) {
      const original = target[prop];

      if (typeof original !== 'function') {
        return original;
      }

      // CRITICAL: Pass through 'then' and 'catch' directly to enable proper await behavior
      // Supabase query builders are thenable - they execute when awaited
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return function(...args: any[]) {
          const result = original.apply(target, args);
          return result;
        };
      }

      // Execution methods (insert, update, delete, upsert) - these return promises
      if (executionMethods.includes(prop as string)) {
        return function(...args: any[]) {
          if (!auth.isAuthenticated) {
            const error = new Error(`Authentication required for ${String(prop)} on '${tableName}'`);
            (error as any).code = 'AUTH_REQUIRED';
            throw error;
          }

          logger.debug(`Executing authenticated ${String(prop)} on ${tableName}`);
          const result = original.apply(target, args);

          // Wrap the result to continue the chain
          if (result && typeof result === 'object' && typeof result.then === 'function') {
            return createAuthenticatedQueryBuilder(result, auth, tableName);
          }

          return result;
        };
      }

      // Query builder methods (select, eq, order, etc.) - these return query builders that can be chained
      return function(...args: any[]) {
        if (!auth.isAuthenticated && queryBuilderMethods.includes(prop as string)) {
          const error = new Error(`Authentication required for ${String(prop)} on '${tableName}'`);
          (error as any).code = 'AUTH_REQUIRED';
          throw error;
        }

        const result = original.apply(target, args);

        // Check if result is a query builder (can be chained further)
        if (result && typeof result === 'object') {
          const isQueryBuilder =
            typeof result.eq === 'function' ||
            typeof result.filter === 'function' ||
            typeof result.order === 'function' ||
            typeof result.select === 'function' ||
            typeof result.limit === 'function' ||
            typeof result.in === 'function' ||
            typeof result.like === 'function' ||
            typeof result.then === 'function'; // Supabase query builders are thenable

          if (isQueryBuilder) {
            // Wrap the query builder so it can be chained further
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

