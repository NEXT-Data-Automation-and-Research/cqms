/**
 * User Profile Loader
 * Loads and renders user profile page
 */

import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
import { PeopleRepository } from '../infrastructure/people-repository.js';
import { UserProfileRenderer } from './renderers/user-profile-renderer.js';
import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import { safeSetHTML } from '../../../utils/html-sanitizer.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

declare global {
  interface Window {
    supabaseReady?: boolean;
    supabaseClient?: any;
    supabaseClientReady?: boolean;
  }
}

export class UserProfileLoader {
  private renderer: UserProfileRenderer | null = null;

  async init(): Promise<void> {
    try {
      logInfo('[UserProfileLoader] Initializing...');

      // Wait for Supabase to be ready
      await this.waitForSupabase();

      // Get email from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const email = urlParams.get('email');

      if (!email) {
        this.renderError('Email parameter is required');
        return;
      }

      // Initialize database and repository
      const db = DatabaseFactory.createClient();
      const peopleRepository = new PeopleRepository(db);

      // Create renderer
      this.renderer = new UserProfileRenderer({
        peopleRepository,
        email
      });

      // Render profile
      await this.renderer.render();

      logInfo('[UserProfileLoader] Initialized successfully');
    } catch (error) {
      logError('[UserProfileLoader] Initialization failed:', error);
      this.renderError(`Failed to load user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async waitForSupabase(): Promise<void> {
    // Check if already initialized
    if (window.supabaseReady) {
      logInfo('[UserProfileLoader] Supabase already ready');
      return;
    }
    
    // Wait for supabaseReady event (set by HTML page initialization)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Supabase initialization timeout'));
      }, 10000); // 10 second timeout
      
      if (window.supabaseReady) {
        clearTimeout(timeout);
        resolve();
        return;
      }
      
      window.addEventListener('supabaseReady', () => {
        clearTimeout(timeout);
        logInfo('[UserProfileLoader] Supabase ready');
        resolve();
      }, { once: true });
    });
  }

  private renderError(message: string): void {
    const container = document.getElementById('user-profile-container');
    if (container) {
      const html = `
        <div class="glass-card rounded-xl p-8 text-center">
          <div class="mb-4">
            <svg class="mx-auto w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Error</h2>
          <p class="text-white/70">${this.escapeHtml(message)}</p>
          <button 
            onclick="window.history.back()" 
            class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all"
          >
            Go Back
          </button>
        </div>
      `;
      safeSetHTML(container, html);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Note: Initialization is now handled by the HTML page script
// which waits for supabaseClientReady before importing this module

