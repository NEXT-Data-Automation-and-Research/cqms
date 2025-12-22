/**
 * Database Configuration
 * 
 * Centralized configuration for database selection.
 * Change the database type via environment variable or default.
 * 
 * Usage:
 *   const config = DatabaseConfig.get();
 *   const db = DatabaseFactory.createClient(config.type);
 */

export type DatabaseType = 'supabase' | 'postgresql' | 'mysql';

export interface IDatabaseConfig {
  type: DatabaseType;
  connectionString?: string;
  options?: Record<string, any>;
}

export class DatabaseConfig {
  private config: IDatabaseConfig;
  private static instance: DatabaseConfig | null = null;

  private constructor() {
    // Get database type from environment or default to 'supabase'
    const dbType = this.getDatabaseTypeFromEnv();
    this.config = {
      type: dbType,
      connectionString: this.getConnectionString(),
      options: this.getDatabaseOptions()
    };
  }

  /**
   * Get database type from environment variable
   */
  private getDatabaseTypeFromEnv(): DatabaseType {
    if (typeof window !== 'undefined' && (window as any).env?.DATABASE_TYPE) {
      return (window as any).env.DATABASE_TYPE as DatabaseType;
    }
    if (typeof process !== 'undefined' && process.env?.DATABASE_TYPE) {
      return process.env.DATABASE_TYPE as DatabaseType;
    }
    return 'supabase'; // Default
  }

  /**
   * Get connection string if needed
   */
  private getConnectionString(): string | undefined {
    if (typeof window !== 'undefined' && (window as any).env?.DATABASE_URL) {
      return (window as any).env.DATABASE_URL;
    }
    if (typeof process !== 'undefined' && process.env?.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    return undefined;
  }

  /**
   * Get database-specific options
   */
  private getDatabaseOptions(): Record<string, any> {
    return {
      // Add database-specific options here
      // e.g., pool size, timeout, etc.
    };
  }

  /**
   * Get singleton instance
   */
  static get(): IDatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance.config;
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset(): void {
    DatabaseConfig.instance = null;
  }
}

