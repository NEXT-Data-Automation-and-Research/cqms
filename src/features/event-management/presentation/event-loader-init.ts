/**
 * Event Management - Loader Initialization
 * Loads the event management module
 */

/**
 * Initialize event management module
 */
export async function initializeEventManagement(): Promise<void> {
  try {
    // Load event management module
    await import('./event-loader.js');
  } catch (error) {
    console.error('[EventLoaderInit] Error loading event management:', error);
  }
}

// Auto-initialize when module loads
initializeEventManagement();
