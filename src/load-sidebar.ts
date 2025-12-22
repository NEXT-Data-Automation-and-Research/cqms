/**
 * Sidebar Loader Entry Point
 * This file imports the modular sidebar loader
 * 
 * The sidebar is now split into simple, easy-to-understand modules:
 * - Domain: types and data shapes (types.ts, entities.ts)
 * - Infrastructure: database access (sidebar-repository.ts)
 * - Application: business logic and state (sidebar-state.ts, sidebar-service.ts)
 * - Presentation: UI and user interaction (sidebar-loader.ts, sidebar-user-profile.ts, etc.)
 */

import type { SidebarLoader } from './features/sidebar/presentation/sidebar-loader.js';

// Import the main sidebar loader
// This will auto-initialize when the module loads
import '/js/features/sidebar/presentation/sidebar-loader.js';

// Export a function for manual initialization if needed
export async function initSidebar(): Promise<SidebarLoader> {
  // Dynamic import at runtime - path resolves in browser
  // Using string variable to bypass TypeScript's compile-time module resolution
  const modulePath = '/js/features/sidebar/presentation/sidebar-loader.js';
  const module = await import(modulePath) as any;
  return module.sidebarLoader as SidebarLoader;
}

// For backward compatibility, expose on window if needed
if (typeof window !== 'undefined') {
  (window as any).initSidebar = initSidebar;
}

