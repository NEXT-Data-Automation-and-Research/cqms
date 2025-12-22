/**
 * Database Factory
 * 
 * Factory for creating database clients.
 * Uses centralized configuration for database selection.
 * 
 * Usage:
 *   const db = DatabaseFactory.createClient();
 *   // Or specify type: const db = DatabaseFactory.createClient('postgresql');
 */

import { IDatabaseClient } from '../core/database/database-client.interface.js';
import { DatabaseConfig } from '../core/config/database-config.js';
import { SupabaseClientAdapter } from './database/supabase/supabase-client.adapter.js';
// Future: import { PostgreSQLClientAdapter } from './database/postgresql/postgresql-client.adapter.js';
// Future: import { MySQLClientAdapter } from './database/mysql/mysql-client.adapter.js';

export class DatabaseFactory {
  /**
   * Create a database client
   * @param type - Optional database type (defaults to configured type)
   * @returns Database client that follows our interface
   */
  static createClient(type?: 'supabase' | 'postgresql' | 'mysql'): IDatabaseClient {
    const config = DatabaseConfig.get();
    const dbType = type || config.type;

    switch (dbType) {
      case 'supabase':
        // Get the Supabase client from window (or wherever it's stored)
        if (typeof window === 'undefined' || !(window as any).supabaseClient) {
          throw new Error('Supabase client not initialized. Call initSupabase() first.');
        }
        return new SupabaseClientAdapter((window as any).supabaseClient);
      
      // Future: Add PostgreSQL support
      // case 'postgresql':
      //   if (!config.connectionString) {
      //     throw new Error('PostgreSQL connection string not configured');
      //   }
      //   return new PostgreSQLClientAdapter(config.connectionString, config.options);
      
      // Future: Add MySQL support
      // case 'mysql':
      //   if (!config.connectionString) {
      //     throw new Error('MySQL connection string not configured');
      //   }
      //   return new MySQLClientAdapter(config.connectionString, config.options);
      
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  /**
   * Get the configured database type
   */
  static getConfiguredType(): 'supabase' | 'postgresql' | 'mysql' {
    return DatabaseConfig.get().type;
  }
}
