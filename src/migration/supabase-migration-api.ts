/**
 * Supabase Migration API Endpoints
 * Handles HTTP requests for the Supabase URL/anon key based migration tool
 */

import express from 'express';
import { SupabaseMigrator, SupabaseMigrationConfig, SupabaseMigrationProgress } from './supabase-migrator.js';

const router = express.Router();

let currentMigrator: SupabaseMigrator | null = null;
let migrationProgress: SupabaseMigrationProgress = { status: 'idle' };

/**
 * Test database connections
 */
router.post('/test-connections', async (req, res) => {
  try {
    const config: SupabaseMigrationConfig = req.body;

    if (!config.source?.url || !config.source?.anonKey) {
      return res.status(400).json({ 
        error: 'Source URL and anon key are required' 
      });
    }

    if (!config.destination?.url || !config.destination?.anonKey) {
      return res.status(400).json({ 
        error: 'Destination URL and anon key are required' 
      });
    }

    const migrator = new SupabaseMigrator(config);
    const result = await migrator.testConnections();

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Failed to test connections' 
    });
  }
});

/**
 * Get tables info from source database
 * Accepts a list of table names to check
 */
router.post('/get-tables-info', async (req, res) => {
  let migrator: SupabaseMigrator | null = null;
  try {
    const { config, tableNames } = req.body;

    if (!config?.source?.url || !config?.source?.anonKey) {
      return res.status(400).json({ 
        error: 'Source URL and anon key are required' 
      });
    }

    if (!tableNames || !Array.isArray(tableNames) || tableNames.length === 0) {
      return res.status(400).json({ 
        error: 'Table names array is required' 
      });
    }

    migrator = new SupabaseMigrator(config);
    
    // Connect to source database
    await migrator.connectSource();
    
    const tables = await migrator.getTablesInfo(tableNames);
    
    // Close connection (Supabase client doesn't need explicit close, but we can clean up)
    migrator = null;

    res.json({ tables });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Failed to get tables info' 
    });
  }
});

/**
 * Start migration
 */
router.post('/start', async (req, res) => {
  try {
    if (currentMigrator && migrationProgress.status === 'migrating') {
      return res.status(400).json({ 
        error: 'Migration already in progress' 
      });
    }

    const { config, options } = req.body;

    if (!config.source?.url || !config.source?.anonKey) {
      return res.status(400).json({ 
        error: 'Source URL and anon key are required' 
      });
    }

    if (!config.destination?.url || !config.destination?.anonKey) {
      return res.status(400).json({ 
        error: 'Destination URL and anon key are required' 
      });
    }

    if (!options?.selectedTables || options.selectedTables.length === 0) {
      return res.status(400).json({ 
        error: 'At least one table must be selected for migration' 
      });
    }

    // Create new migrator
    currentMigrator = new SupabaseMigrator(config);
    
    // Set up progress callback
    currentMigrator.onProgress((progress) => {
      migrationProgress = progress;
    });

    // Start migration in background
    currentMigrator.migrate(options || {}).catch((error) => {
      // Migration errors are logged by the migrator itself
      // This catch is just to prevent unhandled promise rejection
    });

    res.json({ 
      success: true, 
      message: 'Migration started' 
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Failed to start migration' 
    });
  }
});

/**
 * Get migration progress
 */
router.get('/progress', (req, res) => {
  res.json(migrationProgress);
});

/**
 * Stop migration (if possible)
 */
router.post('/stop', (req, res) => {
  currentMigrator = null;
  migrationProgress = { status: 'idle' };
  res.json({ 
    success: true, 
    message: 'Migration stopped' 
  });
});

/**
 * Reset migration state
 */
router.post('/reset', (req, res) => {
  currentMigrator = null;
  migrationProgress = { status: 'idle' };
  res.json({ 
    success: true, 
    message: 'Migration state reset' 
  });
});

export default router;




