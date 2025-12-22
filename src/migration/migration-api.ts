/**
 * Migration API Endpoints
 * Handles HTTP requests for the migration tool
 */

import express from 'express';
import { SafeMigrator, MigrationConfig, MigrationProgress } from './migrator.js';

const router = express.Router();

let currentMigrator: SafeMigrator | null = null;
let migrationProgress: MigrationProgress = { status: 'idle' };

/**
 * Test database connections
 */
router.post('/test-connections', async (req, res) => {
  try {
    const config: MigrationConfig = req.body;

    if (!config.source?.projectRef || !config.source?.dbPassword) {
      return res.status(400).json({ 
        error: 'Source project ref and password are required' 
      });
    }

    if (!config.destination?.projectRef || !config.destination?.dbPassword) {
      return res.status(400).json({ 
        error: 'Destination project ref and password are required' 
      });
    }

    const migrator = new SafeMigrator(config);
    const result = await migrator.testConnections();

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || 'Failed to test connections' 
    });
  }
});

/**
 * Get tables from source database with row counts
 */
router.post('/get-tables', async (req, res) => {
  let migrator: SafeMigrator | null = null;
  try {
    const config: MigrationConfig = req.body;

    if (!config.source?.projectRef || !config.source?.dbPassword) {
      return res.status(400).json({ 
        error: 'Source project ref and password are required' 
      });
    }

    migrator = new SafeMigrator(config);
    
    // Connect to source database
    await migrator.connectSource();
    
    const tables = await migrator.getTablesWithInfo();
    
    // Close connection
    if ((migrator as any).sourceClient) {
      await (migrator as any).sourceClient.end();
    }

    res.json({ tables });
  } catch (error: any) {
    // Ensure connection is closed on error
    if (migrator && (migrator as any).sourceClient) {
      try {
        await (migrator as any).sourceClient.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    res.status(500).json({ 
      error: error.message || 'Failed to get tables' 
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

    if (!config.source?.projectRef || !config.source?.dbPassword) {
      return res.status(400).json({ 
        error: 'Source project ref and password are required' 
      });
    }

    if (!config.destination?.projectRef || !config.destination?.dbPassword) {
      return res.status(400).json({ 
        error: 'Destination project ref and password are required' 
      });
    }

    // Create new migrator
    currentMigrator = new SafeMigrator(config);
    
    // Set up progress callback
    currentMigrator.onProgress((progress) => {
      migrationProgress = progress;
    });

    // Start migration in background
    currentMigrator.migrate(options || {}).catch((error) => {
      console.error('Migration error:', error);
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
  // Note: This is a simple implementation
  // In production, you'd want to properly cancel the migration
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

