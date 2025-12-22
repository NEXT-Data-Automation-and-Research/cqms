/**
 * Main application TypeScript
 * Handles environment variable loading and server status
 */

import { logger } from './utils/logger.js';

interface EnvVariables {
  NODE_ENV?: string;
  APP_NAME?: string;
  API_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: string | undefined;
}

/**
 * Load environment variables from the API
 */
async function loadEnvironmentVariables(): Promise<void> {
  try {
    const response = await fetch('/api/env');
    const env: EnvVariables = await response.json();
    
    // Store in window.env for Supabase initialization
    (window as any).env = env;
    
    // Update app title
    const appTitleElement = document.getElementById('app-title');
    if (appTitleElement && env.APP_NAME) {
      appTitleElement.textContent = env.APP_NAME;
    }
    
    // Update port display
    if (env.API_URL) {
      const port = new URL(env.API_URL).port || '4000';
      const portElement = document.getElementById('port');
      const footerPortElement = document.getElementById('footer-port');
      
      if (portElement) {
        portElement.textContent = port;
      }
      if (footerPortElement) {
        footerPortElement.textContent = port;
      }
    }
    
    // Display environment variables
    displayEnvironmentVariables(env);
    
  } catch (error) {
    logger.error('Error loading environment variables:', error);
    const envVarsContainer = document.getElementById('env-vars');
    if (envVarsContainer) {
      envVarsContainer.innerHTML = '<p class="error">Error loading environment variables</p>';
    }
  }
}

/**
 * Display environment variables in the UI
 */
function displayEnvironmentVariables(env: EnvVariables): void {
  const envVarsContainer = document.getElementById('env-vars');
  if (!envVarsContainer) {
    return;
  }

  const envList = Object.entries(env)
    .map(([key, value]) => {
      // Mask sensitive values
      const displayValue = key.toLowerCase().includes('key') || 
                         key.toLowerCase().includes('secret') || 
                         key.toLowerCase().includes('password')
        ? '••••••••'
        : value || '';
      
      return `
        <div class="env-item">
          <span class="env-key">${key}:</span>
          <span class="env-value">${displayValue}</span>
        </div>
      `;
    })
    .join('');
  
  envVarsContainer.innerHTML = envList || '<p>No environment variables found</p>';
}

/**
 * Update server status indicator
 */
function updateServerStatus(): void {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  
  if (!statusIndicator || !statusText) {
    return;
  }

  // Check if server is responding
  fetch('/api/env')
    .then(() => {
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = 'Server Status: Online';
    })
    .catch(() => {
      statusIndicator.className = 'status-indicator inactive';
      statusText.textContent = 'Server Status: Offline';
    });
}

// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
  logger.info('Migration Project - Application Loaded');
  
  // Load environment variables
  loadEnvironmentVariables();
  
  // Update status
  updateServerStatus();
  
  // Set up periodic status checks
  setInterval(updateServerStatus, 5000);
});

// Export functions for use in other scripts
(window as any).MigrationApp = {
  loadEnvironmentVariables,
  displayEnvironmentVariables,
  updateServerStatus
};

