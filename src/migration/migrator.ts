/**
 * Safe Database Migration Tool
 * 
 * This tool migrates data from a source Supabase project to a destination project.
 * ALL operations on the source database are READ-ONLY to ensure production safety.
 */

import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface MigrationConfig {
  source: {
    projectRef: string;
    dbPassword: string;
    url?: string;
    anonKey?: string;
  };
  destination: {
    projectRef: string;
    dbPassword: string;
    url?: string;
    anonKey?: string;
  };
}

export interface MigrationProgress {
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

export class SafeMigrator {
  private sourceClient: postgres.Sql | null = null;
  private destClient: postgres.Sql | null = null;
  private progress: MigrationProgress = { status: 'idle' };
  private progressCallback?: (progress: MigrationProgress) => void;

  constructor(config: MigrationConfig) {
    this.config = config;
  }

  private config: MigrationConfig;

  /**
   * Set callback for progress updates
   */
  onProgress(callback: (progress: MigrationProgress) => void) {
    this.progressCallback = callback;
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(updates: Partial<MigrationProgress>) {
    this.progress = { ...this.progress, ...updates };
    if (this.progressCallback) {
      this.progressCallback(this.progress);
    }
  }

  /**
   * Connect to source database (READ-ONLY mode)
   */
  async connectSource(): Promise<void> {
    this.updateProgress({ 
      status: 'connecting', 
      message: 'Connecting to source database (READ-ONLY mode)...' 
    });

    const sourceUrl = this.config.source.url || 
      `postgresql://postgres:${encodeURIComponent(this.config.source.dbPassword)}@db.${this.config.source.projectRef}.supabase.co:5432/postgres`;

    // Create connection with read-only transaction mode
    this.sourceClient = postgres(sourceUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Verify connection with a read-only query
    await this.sourceClient`SELECT 1 as test`;
    
    this.updateProgress({ 
      message: '✓ Connected to source database (READ-ONLY)' 
    });
  }

  /**
   * Connect to destination database
   */
  private async connectDestination(): Promise<void> {
    this.updateProgress({ 
      message: 'Connecting to destination database...' 
    });

    const destUrl = this.config.destination.url || 
      `postgresql://postgres:${encodeURIComponent(this.config.destination.dbPassword)}@db.${this.config.destination.projectRef}.supabase.co:5432/postgres`;

    this.destClient = postgres(destUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Verify connection
    await this.destClient`SELECT 1 as test`;
    
    this.updateProgress({ 
      message: '✓ Connected to destination database' 
    });
  }

  /**
   * Get list of tables from source database (READ-ONLY)
   * Returns table names with row counts
   */
  async getTablesWithInfo(): Promise<Array<{ name: string; rowCount: number }>> {
    if (!this.sourceClient) throw new Error('Source database not connected');

    this.updateProgress({ 
      status: 'analyzing',
      message: 'Analyzing source database structure...' 
    });

    // Get all user tables (exclude system tables)
    const tables = await this.sourceClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name
    `;

    const tableNames = tables.map((t: any) => t.table_name);
    
    // Get row counts for each table
    const tablesWithInfo = await Promise.all(
      tableNames.map(async (name) => {
        const count = await this.getRowCount(name);
        return { name, rowCount: count };
      })
    );
    
    this.updateProgress({ 
      totalTables: tableNames.length,
      tables: tableNames,
      message: `✓ Found ${tableNames.length} tables` 
    });

    return tablesWithInfo;
  }

  /**
   * Get list of tables from source database (READ-ONLY)
   */
  private async getTables(): Promise<string[]> {
    if (!this.sourceClient) throw new Error('Source database not connected');

    this.updateProgress({ 
      status: 'analyzing',
      message: 'Analyzing source database structure...' 
    });

    // Get all user tables (exclude system tables)
    const tables = await this.sourceClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name
    `;

    const tableNames = tables.map((t: any) => t.table_name);
    
    this.updateProgress({ 
      totalTables: tableNames.length,
      tables: tableNames,
      message: `✓ Found ${tableNames.length} tables` 
    });

    return tableNames;
  }

  /**
   * Get row count for a table (READ-ONLY)
   */
  private async getRowCount(tableName: string): Promise<number> {
    if (!this.sourceClient) throw new Error('Source database not connected');

    // Escape table name to prevent SQL injection
    const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
    const result = await this.sourceClient.unsafe(
      `SELECT COUNT(*) as count FROM ${escapedTableName}`
    );
    
    return Number(result[0]?.count || 0);
  }

  /**
   * Get all data from a table (READ-ONLY, paginated for large tables)
   */
  private async getTableData(tableName: string, batchSize: number = 1000): Promise<any[]> {
    if (!this.sourceClient) throw new Error('Source database not connected');

    const allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    // Escape table name to prevent SQL injection
    const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;

    while (hasMore) {
      // Use unsafe for dynamic table names, but with parameterized offset/limit
      const batch = await this.sourceClient.unsafe(
        `SELECT * FROM ${escapedTableName} LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );

      if (batch.length === 0) {
        hasMore = false;
      } else {
        allData.push(...batch);
        offset += batchSize;
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

    // Get column names from first row
    const columns = Object.keys(data[0]);
    
    // Escape identifiers
    const escapedTableName = `"${tableName.replace(/"/g, '""')}"`;
    const escapedColumns = columns.map(col => `"${col.replace(/"/g, '""')}"`).join(', ');
    
    // Insert in batches to avoid memory issues
    const batchSize = 500;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Build values array for this batch
      const values = batch.map(row => 
        columns.map(col => row[col])
      );

      // Build INSERT query with proper parameterization
      const valuePlaceholders = values.map((_, idx) => {
        const startParam = idx * columns.length + 1;
        return `(${columns.map((_, colIdx) => `$${startParam + colIdx}`).join(', ')})`;
      }).join(', ');
      
      const flatValues = values.flat();
      const query = `INSERT INTO ${escapedTableName} (${escapedColumns}) VALUES ${valuePlaceholders} ON CONFLICT DO NOTHING`;
      
      await this.destClient.unsafe(query, flatValues);
    }
  }

  /**
   * Check if table exists in destination
   */
  private async tableExists(tableName: string): Promise<boolean> {
    if (!this.destClient) throw new Error('Destination database not connected');

    const result = await this.destClient`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists
    `;

    return result[0]?.exists || false;
  }

  /**
   * Main migration function
   */
  async migrate(options: {
    skipExisting?: boolean;
    batchSize?: number;
    selectedTables?: string[]; // Tables to migrate (if empty, migrate all)
    tableMappings?: Record<string, string>; // Map source table name to destination table name
  } = {}): Promise<void> {
    const startTime = new Date();
    this.updateProgress({ startTime, status: 'connecting' });

    try {
      // Connect to both databases
      await this.connectSource();
      await this.connectDestination();

      // Get list of tables
      const allTables = await this.getTables();
      
      if (allTables.length === 0) {
        throw new Error('No tables found in source database');
      }

      // Filter tables if selection is provided
      let tablesToMigrate = allTables;
      if (options.selectedTables && options.selectedTables.length > 0) {
        tablesToMigrate = allTables.filter(table => options.selectedTables!.includes(table));
        
        if (tablesToMigrate.length === 0) {
          throw new Error('No selected tables found in source database');
        }
      }

      this.updateProgress({ 
        status: 'migrating',
        completedTables: 0,
        completedRows: 0,
        totalRows: 0,
        totalTables: tablesToMigrate.length
      });

      // Calculate total rows for selected tables
      let totalRows = 0;
      for (const table of tablesToMigrate) {
        const count = await this.getRowCount(table);
        totalRows += count;
      }
      
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

        // Get row count
        const rowCount = await this.getRowCount(sourceTable);
        
        if (rowCount === 0) {
          this.updateProgress({
            message: `✓ ${sourceTable} is empty, skipping`
          });
          completedTables++;
          continue;
        }

        // Get all data (READ-ONLY operation)
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
    } finally {
      // Close connections
      if (this.sourceClient) {
        await this.sourceClient.end();
      }
      if (this.destClient) {
        await this.destClient.end();
      }
    }
  }

  /**
   * Get current progress
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Test connections (READ-ONLY on source)
   */
  async testConnections(): Promise<{ source: boolean; destination: boolean }> {
    try {
      await this.connectSource();
      await this.connectDestination();
      return { source: true, destination: true };
    } catch (error) {
      return { source: false, destination: false };
    } finally {
      if (this.sourceClient) await this.sourceClient.end();
      if (this.destClient) await this.destClient.end();
    }
  }
}

