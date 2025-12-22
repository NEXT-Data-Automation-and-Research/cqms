/**
 * Environment Setup Utility
 * Creates .env file from template if it doesn't exist
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './utils/logger.js';

const logger = createLogger('SetupEnv');

const ENV_TEMPLATE = `# Server Configuration
PORT=4000
NODE_ENV=development

# Application Configuration
APP_NAME=Migration Project
API_URL=http://localhost:4000

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Add your environment variables here
# Example:
# DATABASE_URL=your_database_url
# API_KEY=your_api_key
# SECRET_KEY=your_secret_key
`;

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup environment file from template
 * Creates .env file if it doesn't exist
 */
export async function setupEnvFile(): Promise<void> {
  const envPath = path.join(__dirname, '../.env');

  try {
    // Check if .env file exists
    await fs.access(envPath);
    logger.info('.env file already exists');
  } catch (error: any) {
    // File doesn't exist, create it
    if (error.code === 'ENOENT') {
      try {
        await fs.writeFile(envPath, ENV_TEMPLATE, 'utf-8');
        logger.info('Created .env file from template');
      } catch (writeError: any) {
        logger.error('Failed to create .env file:', writeError);
        throw new Error(`Failed to create .env file: ${writeError.message}`);
      }
    } else {
      logger.error('Error checking .env file:', error);
      throw new Error(`Failed to check .env file: ${error.message}`);
    }
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupEnvFile().catch((error) => {
    logger.error('Setup failed:', error);
    process.exit(1);
  });
}
