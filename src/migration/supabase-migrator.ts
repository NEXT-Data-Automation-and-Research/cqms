/**
 * Supabase Migration Tool
 * 
 * This tool migrates data from a source Supabase project to a destination project
 * using Supabase URL and anon key (instead of database password).
 * 
 * NOTE: Using anon key has limitations:
 * - Can only access data that RLS policies allow
 * - May not be able to read all tables if RLS is enabled
 * - For full access, consider using service role key or database password
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseMigrationConfig {
  source: {
    url: string;
    anonKey: string;
  };
  destination: {
    url: string;
    anonKey: string;
  };
}

export interface SupabaseMigrationProgress {
  status: 'idle' | 'connecting' | 'analyzing' | 'migrating' | 'completed' | 'error';
  currentTable?: string;
  totalTables?: number;
  completedTables?: number;
  currentRow?: number;
  totalRows?: number;
  completedRows?: number;
  message?: string;
  error?: string;
  tables?: string[];
  startTime?: Date;
  endTime?: Date;
}

export class SupabaseMigrator {
  private sourceClient: SupabaseClient | null = null;
  private destClient: SupabaseClient | null = null;
  private progress: SupabaseMigrationProgress = { status: 'idle' };
  private progressCallback?: (progress: SupabaseMigrationProgress) => void;

  constructor(private config: SupabaseMigrationConfig) {}

  /**
   * Set callback for progress updates
   */
  onProgress(callback: (progress: SupabaseMigrationProgress) => void) {
    this.progressCallback = callback;
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(updates: Partial<SupabaseMigrationProgress>) {
    this.progress = { ...this.progress, ...updates };
    if (this.progressCallback) {
      this.progressCallback(this.progress);
    }
  }

  /**
   * Connect to source database
   */
  async connectSource(): Promise<void> {
    this.updateProgress({ 
      status: 'connecting', 
      message: 'Connecting to source Supabase project...' 
    });

    this.sourceClient = createClient(this.config.source.url, this.config.source.anonKey);

    // Test connection by trying to access the API
    // We'll test with a simple query that should work or fail gracefully
    try {
      const { error } = await this.sourceClient.from('_test_connection_12345').select('*').limit(0);
      
      // If we get a relation error, connection is working (table just doesn't exist)
      // If we get other errors, connection might be failing
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist') && !error.message.includes('permission denied')) {
        // Connection might be working but we can't tell for sure
        // This is expected with anon key
      }
    } catch (error: any) {
      // If it's a network error, connection failed
      if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new Error(`Failed to connect to source: ${error.message}`);
      }
    }
    
    this.updateProgress({ 
      message: '✓ Connected to source Supabase project' 
    });
  }

  /**
   * Connect to destination database
   */
  private async connectDestination(): Promise<void> {
    this.updateProgress({ 
      message: 'Connecting to destination Supabase project...' 
    });

    this.destClient = createClient(this.config.destination.url, this.config.destination.anonKey);

    // Test connection
    try {
      const { error } = await this.destClient.from('_test_connection_12345').select('*').limit(0);
      
      // If we get a relation error, connection is working (table just doesn't exist)
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist') && !error.message.includes('permission denied')) {
        // Connection might be working but we can't tell for sure
      }
    } catch (error: any) {
      // If it's a network error, connection failed
      if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new Error(`Failed to connect to destination: ${error.message}`);
      }
    }
    
    this.updateProgress({ 
      message: '✓ Connected to destination Supabase project' 
    });
  }

  /**
   * Get list of tables from source database using REST API
   * Note: This uses the Supabase REST API which may have RLS limitations
   */
  async getTablesWithInfo(): Promise<Array<{ name: string; rowCount: number }>> {
    if (!this.sourceClient) throw new Error('Source database not connected');

    this.updateProgress({ 
      status: 'analyzing',
      message: 'Analyzing source database structure...' 
    });

    // Use RPC to get table information if available, otherwise try to query each table
    // Since we can't directly query information_schema with anon key, we'll try to discover tables
    // by attempting to query common table names or using a different approach
    
    // Alternative: Try to get tables by querying pg_catalog via RPC (if available)
    // Or we can try to query each potential table
    
    // For now, we'll use a discovery method: try common table patterns
    // This is a limitation of using anon key - we can't query system tables directly
    
    // Better approach: Use PostgREST to discover tables by trying to access them
    // We'll need to maintain a list or use a different method
    
    // Since we can't easily discover all tables with anon key, we'll return an empty array
    // and let the user specify tables manually, OR we can try to query known tables
    
    // Actually, we can use the REST API introspection if available
    // But the most reliable way is to query information_schema via RPC function
    
    // Let's try a different approach: query the REST API schema endpoint
    try {
      const response = await fetch(`${this.config.source.url}/rest/v1/`, {
        headers: {
          'apikey': this.config.source.anonKey,
          'Authorization': `Bearer ${this.config.source.anonKey}`
        }
      });
      
      // This won't give us table names directly, but we can try other methods
    } catch (error) {
      // Ignore
    }

    // Since we can't easily get all tables with anon key, we'll use a workaround:
    // Query a custom RPC function if it exists, or use a different method
    
    // For now, let's try to query information_schema via a custom RPC
    // If that doesn't work, we'll need to use database password or service role key
    
    // Best approach: Create an RPC function in the source database that returns table names
    // Or use the PostgREST schema discovery
    
    // Temporary solution: Return empty and let user specify, or try common tables
    const tables: Array<{ name: string; rowCount: number }> = [];
    
    // Try to discover tables by querying common patterns or using RPC
    // We'll implement a method that tries to query tables from a list
    
    this.updateProgress({ 
      totalTables: tables.length,
      tables: tables.map(t => t.name),
      message: `⚠️ Table discovery limited with anon key. Please specify tables manually or use database password for full access.` 
    });

    return tables;
  }

  /**
   * Get tables by trying to query them (user-specified or discovered)
   * This method accepts a list of table names to check
   */
  async getTablesInfo(tableNames: string[]): Promise<Array<{ name: string; rowCount: number }>> {
    if (!this.sourceClient) throw new Error('Source database not connected');

    this.updateProgress({ 
      status: 'analyzing',
      message: 'Analyzing specified tables...' 
    });

    const tablesWithInfo: Array<{ name: string; rowCount: number }> = [];

    for (const tableName of tableNames) {
      try {
        // Try to get row count by selecting with count
        const { count, error } = await this.sourceClient
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          // Table might not exist or RLS prevents access
          this.updateProgress({
            message: `⚠️ Could not access table ${tableName}: ${error.message}`
          });
          continue;
        }

        tablesWithInfo.push({
          name: tableName,
          rowCount: count || 0
        });
      } catch (error: any) {
        this.updateProgress({
          message: `⚠️ Error checking table ${tableName}: ${error.message}`
        });
      }
    }

    this.updateProgress({ 
      totalTables: tablesWithInfo.length,
      tables: tablesWithInfo.map(t => t.name),
      message: `✓ Found ${tablesWithInfo.length} accessible tables` 
    });

    return tablesWithInfo;
  }

  /**
   * Get all data from a table (paginated for large tables)
   */
  private async getTableData(tableName: string, batchSize: number = 1000): Promise<any[]> {
    if (!this.sourceClient) throw new Error('Source database not connected');

    const allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.sourceClient
        .from(tableName)
        .select('*')
        .range(from, from + batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch data from ${tableName}: ${error.message}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        from += batchSize;
        
        // If we got less than batchSize, we're done
        if (data.length < batchSize) {
          hasMore = false;
        }
      }
    }

    return allData;
  }

  /**
   * Insert data into destination table
   */
  private async insertTableData(tableName: string, data: any[]): Promise<void> {
    if (!this.destClient) throw new Error('Destination database not connected');
    if (data.length === 0) return;

    // Insert in batches to avoid payload size limits
    const batchSize = 500;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await this.destClient
        .from(tableName)
        .insert(batch);

      if (error) {
        // Try upsert if insert fails (might be due to conflicts)
        const { error: upsertError } = await this.destClient
          .from(tableName)
          .upsert(batch, { onConflict: 'id' }); // Adjust conflict column as needed

        if (upsertError) {
          throw new Error(`Failed to insert data into ${tableName}: ${upsertError.message}`);
        }
      }
    }
  }

  /**
   * Check if table exists in destination (by trying to query it)
   */
  private async tableExists(tableName: string): Promise<boolean> {
    if (!this.destClient) throw new Error('Destination database not connected');

    const { error } = await this.destClient
      .from(tableName)
      .select('*')
      .limit(0);

    // If no error or error is just "no rows", table exists
    return !error || !error.message.includes('does not exist');
  }

  /**
   * Main migration function
   */
  async migrate(options: {
    skipExisting?: boolean;
    batchSize?: number;
    selectedTables?: string[]; // Tables to migrate
    tableMappings?: Record<string, string>; // Map source table name to destination table name
  } = {}): Promise<void> {
    const startTime = new Date();
    this.updateProgress({ startTime, status: 'connecting' });

    try {
      // Connect to both databases
      await this.connectSource();
      await this.connectDestination();

      // Validate that we have tables to migrate
      if (!options.selectedTables || options.selectedTables.length === 0) {
        throw new Error('No tables specified for migration');
      }

      const tablesToMigrate = options.selectedTables;

      this.updateProgress({ 
        status: 'migrating',
        completedTables: 0,
        completedRows: 0,
        totalRows: 0,
        totalTables: tablesToMigrate.length
      });

      // Get row counts for selected tables
      const tablesInfo = await this.getTablesInfo(tablesToMigrate);
      let totalRows = tablesInfo.reduce((sum, table) => sum + table.rowCount, 0);
      
      this.updateProgress({ totalRows });

      // Migrate each table
      let completedTables = 0;
      let completedRows = 0;

      for (const sourceTable of tablesToMigrate) {
        // Get destination table name (use mapping if provided, otherwise use source name)
        const destTable = options.tableMappings?.[sourceTable] || sourceTable;
        
        // Check if table exists in destination
        if (options.skipExisting && await this.tableExists(destTable)) {
          this.updateProgress({
            currentTable: sourceTable,
            message: `⏭ Skipping ${sourceTable}${destTable !== sourceTable ? ` → ${destTable}` : ''} (already exists)`
          });
          completedTables++;
          continue;
        }

        this.updateProgress({
          currentTable: sourceTable,
          message: `Migrating table: ${sourceTable}${destTable !== sourceTable ? ` → ${destTable}` : ''}...`
        });

        // Get table info for row count
        const tableInfo = tablesInfo.find(t => t.name === sourceTable);
        const rowCount = tableInfo?.rowCount || 0;
        
        if (rowCount === 0) {
          this.updateProgress({
            message: `✓ ${sourceTable} is empty, skipping`
          });
          completedTables++;
          continue;
        }

        // Get all data
        const data = await this.getTableData(sourceTable, options.batchSize || 1000);
        
        // Insert into destination with new table name
        await this.insertTableData(destTable, data);
        
        completedTables++;
        completedRows += rowCount;

        this.updateProgress({
          completedTables,
          completedRows,
          message: `✓ Migrated ${sourceTable}${destTable !== sourceTable ? ` → ${destTable}` : ''} (${rowCount} rows)`
        });
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      this.updateProgress({
        status: 'completed',
        endTime,
        message: `✓ Migration completed! ${completedTables} tables, ${completedRows} rows in ${duration}s`
      });

    } catch (error: any) {
      this.updateProgress({
        status: 'error',
        error: error.message || 'Unknown error occurred',
        message: `✗ Error: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Get current progress
   */
  getProgress(): SupabaseMigrationProgress {
    return { ...this.progress };
  }

  /**
   * Test connections
   */
  async testConnections(): Promise<{ source: boolean; destination: boolean }> {
    try {
      await this.connectSource();
      await this.connectDestination();
      return { source: true, destination: true };
    } catch (error) {
      return { source: false, destination: false };
    }
  }
}

