/**
 * Presentation Layer - Event Loader
 * Initializes the event management feature
 */

import { EventController } from '../application/event-controller.js';
import { EventRenderer } from './event-renderer.js';
import { EventEventHandlers } from './event-events.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

let eventController: EventController | null = null;
let eventRenderer: EventRenderer | null = null;
let eventHandlers: EventEventHandlers | null = null;

/**
 * Initialize event management feature
 */
async function initializeEventManagement(): Promise<void> {
  try {
    logInfo('[EventLoader] Initializing event management...');
    
    // Wait for Supabase to be ready
    await waitForSupabase();
    
    // Create controller
    eventController = new EventController();
    
    // Set loading state before initialization
    eventController.getStateManager().setLoading(true);
    
    // Create renderer early to show loading state
    eventRenderer = new EventRenderer(eventController.getStateManager());
    
    // Initial render to show loading state
    eventRenderer.render();
    
    // Initialize controller (loads data)
    await eventController.initialize();
    
    // Create event handlers
    eventHandlers = new EventEventHandlers(
      eventController,
      eventController.getStateManager(),
      eventRenderer
    );
    
    // Set up event handlers
    eventHandlers.setup();
    
    // Initial render
    eventRenderer.render();
    
    // Update scope info
    updateEventScopeInfo();
    
    // Subscribe to state changes
    eventController.getStateManager().subscribe(() => {
      eventRenderer?.render();
    });
    
    // Make available globally for event handlers
    (window as any).eventController = eventController;
    (window as any).eventRenderer = eventRenderer;
    (window as any).eventHandlers = eventHandlers;
    
    // Ensure handlers are available immediately for any already-rendered HTML
    if (eventHandlers) {
      // Re-render to attach event listeners to any existing HTML
      eventRenderer.render();
    }
    
    logInfo('[EventLoader] Event management initialized');
  } catch (error) {
    logError('[EventLoader] Error initializing event management:', error);
    const eventsList = document.getElementById('eventsList');
    if (eventsList) {
      // H4: Add error state with retry button
      eventsList.innerHTML = `
        <div class="px-4 py-12 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-sm font-semibold text-red-600 mb-1">Error loading events</p>
          <p class="text-xs text-gray-500 mb-4">Please check your connection and try again</p>
          <button onclick="window.location.reload()" class="px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-dark transition-colors">
            Retry
          </button>
        </div>
      `;
    }
  }
}

/**
 * Wait for Supabase to be ready
 */
function waitForSupabase(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).supabaseReady) {
      resolve();
      return;
    }
    
    window.addEventListener('supabaseReady', () => {
      resolve();
    }, { once: true });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!(window as any).supabaseReady) {
        logError('[EventLoader] Supabase not ready after 10 seconds');
        resolve(); // Continue anyway
      }
    }, 10000);
  });
}

/**
 * Update event scope info based on user role
 */
function updateEventScopeInfo(): void {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const isSuperAdmin = userInfo.role === 'Super Admin';
  const scopeInfo = document.getElementById('eventScopeInfo');
  
  if (scopeInfo && eventController) {
    if (isSuperAdmin) {
      scopeInfo.textContent = 'Viewing all events (Super Admin)';
      scopeInfo.classList.remove('text-gray-500');
      scopeInfo.classList.add('text-blue-600', 'font-medium');
    } else {
      scopeInfo.textContent = 'Viewing your events only';
      scopeInfo.classList.remove('text-blue-600', 'font-medium');
      scopeInfo.classList.add('text-gray-500');
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventManagement);
} else {
  initializeEventManagement();
}

