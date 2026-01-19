/**
 * Page Initializer
 * Handles page initialization, template loading, and module setup
 */

import { loadAllTemplates } from './template-loader.js';

/**
 * Initialize the user management page
 * Loads templates and initializes the main user management module
 */
export async function initializeUserManagementPage(): Promise<void> {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise<void>((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    });
  }

  // Load templates first
  await loadAllTemplates();

  // Signal that templates are loaded
  const win = window as any;
  win.templatesLoaded = true;
  window.dispatchEvent(new CustomEvent('templatesLoaded'));

  // Load TypeScript module for user management
  await import('./user-management-main.js');
}

// Auto-initialize when module loads
initializeUserManagementPage().catch((error) => {
  console.error('[PageInitializer] Failed to initialize user management page:', error);
});
