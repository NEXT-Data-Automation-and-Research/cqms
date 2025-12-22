// Simple JavaScript version for npm install (no TypeScript compilation needed)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const envExample = `# Server Configuration
PORT=4000
NODE_ENV=development

# Application Configuration
APP_NAME=Migration Project
API_URL=http://localhost:4000

# Supabase Configuration (Serverless - Safe to expose to client)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Add your environment variables here
# Example:
# DATABASE_URL=your_database_url
# API_KEY=your_api_key
# SECRET_KEY=your_secret_key
`;

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envExample);
    console.log('✅ Created .env file from template');
} else {
    console.log('ℹ️  .env file already exists');
}
