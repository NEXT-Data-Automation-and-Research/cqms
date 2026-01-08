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
import { PROFILE_PAGE_COLORS } from '../../../core/constants/color-whitelists.js';

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
        <div style="background: ${PROFILE_PAGE_COLORS.CARD_BACKGROUND}; border-radius: 0.5rem; padding: 2rem; border: 0.0625rem solid ${PROFILE_PAGE_COLORS.CARD_BORDER}; box-shadow: ${PROFILE_PAGE_COLORS.CARD_SHADOW}; text-align: center;">
          <div style="margin-bottom: 1rem;">
            <svg style="margin: 0 auto; width: 4rem; height: 4rem; color: ${PROFILE_PAGE_COLORS.ERROR_ICON};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: ${PROFILE_PAGE_COLORS.ERROR_HEADING}; margin-bottom: 0.5rem;">Error</h2>
          <p style="color: ${PROFILE_PAGE_COLORS.ERROR_TEXT}; margin-bottom: 1rem;">${this.escapeHtml(message)}</p>
          <button 
            onclick="window.history.back()" 
            style="margin-top: 1rem; padding: 0.5rem 1rem; background-color: ${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_BG}; color: ${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_TEXT}; border: none; border-radius: 0.375rem; font-size: 0.5625rem; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s ease;"
            onmouseover="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_HOVER_BG}';"
            onmouseout="this.style.backgroundColor='${PROFILE_PAGE_COLORS.BUTTON_PRIMARY_BG}';"
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

