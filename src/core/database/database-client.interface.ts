/**
 * Database Client Interface
 * 
 * This is like a "remote control" for databases.
 * It works with ANY database (Supabase, PostgreSQL, MySQL, etc.)
 * 
 * By using this interface, we can switch databases easily
 * without changing all our code!
 */

import { IQueryBuilder } from './query-builder.interface.js';

export type { IQueryBuilder };

export interface IDatabaseClient {
  /**
   * Get a table to query
   * @param table - Table name
   * @returns Query builder for that table
   */
  from(table: string): IQueryBuilder;
  
  /**
   * Authentication operations (if database supports it)
   */
  auth?: {
    getUser(): Promise<{ data: { user: any }, error: any }>;
    getSession(): Promise<{ data: { session: any }, error: any }>;
  };
  
  /**
   * Connect to the database
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if connected to the database
   */
  isConnected(): boolean;
}

