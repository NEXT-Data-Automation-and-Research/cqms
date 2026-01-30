/**
 * Intelligent Data Refresh Service
 * Handles selective data refresh without full page reloads
 * 
 * ✅ FIX: Added auth-aware refresh to prevent API calls during auth transitions
 * This addresses Scenario 28-32: Background process conflicts
 */

interface RefreshOptions {
  force?: boolean;
  sections?: string[];
  silent?: boolean;
}

type RefreshFunction = () => Promise<void>;

/**
 * Check if auth is in a transitional state
 * Checks both the new auth coordinator and legacy flags
 */
function isAuthTransitioning(): boolean {
  try {
    // Check legacy flags
    if (sessionStorage.getItem('oauthCallbackInProgress') === 'true') return true;
    if (sessionStorage.getItem('loginJustCompleted') === 'true') return true;
    if (sessionStorage.getItem('cacheReloadInProgress') === 'true') return true;
    if ((window as any).__oauthCallbackInProgress) return true;
    if ((window as any).__cacheReloadInProgress) return true;
    if ((window as any).__redirectingToLogin) return true;
    
    // Check auth coordinator if available
    if ((window as any).authCoordinator?.isTransitioning?.()) return true;
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Service for managing intelligent data refresh
 * Replaces full page reloads with selective section updates
 */
export class DataRefreshService {
  private refreshInterval: number | null = null;
  private refreshFunctions: Map<string, RefreshFunction> = new Map();
  private readonly DEFAULT_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private isPaused: boolean = false;

  /**
   * Register a refresh function for a specific section
   */
  registerSection(name: string, refreshFn: RefreshFunction): void {
    this.refreshFunctions.set(name, refreshFn);
  }

  /**
   * Start automatic refresh
   */
  start(interval: number = this.DEFAULT_INTERVAL): void {
    if (this.refreshInterval !== null) {
      this.stop();
    }

    this.refreshInterval = window.setInterval(() => {
      this.refresh({ silent: true });
    }, interval);
  }

  /**
   * Stop automatic refresh
   */
  stop(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Pause refresh temporarily (during auth transitions)
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume refresh after auth transition
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Refresh specific sections or all sections
   */
  async refresh(options: RefreshOptions = {}): Promise<void> {
    const { force = false, sections, silent = false } = options;

    // Only refresh if page is visible
    if (document.hidden && !force) {
      return;
    }

    // ✅ FIX: Don't refresh if auth is in a transitional state
    // This prevents API errors during login/logout/token refresh
    if (!force && (this.isPaused || isAuthTransitioning())) {
      if (!silent) {
        console.log('[DataRefreshService] Skipping refresh - auth transition in progress');
      }
      return;
    }

    if (!silent) {
      console.log('Refreshing dashboard data...');
    }

    const sectionsToRefresh = sections || Array.from(this.refreshFunctions.keys());

    // Refresh critical sections first, then secondary
    const criticalSections = ['stats', 'assignedAudits'];
    const secondarySections = sectionsToRefresh.filter(s => !criticalSections.includes(s));

    // Refresh critical sections
    const criticalPromises = criticalSections
      .filter(s => sectionsToRefresh.includes(s))
      .map(section => {
        const fn = this.refreshFunctions.get(section);
        return fn ? fn().catch(err => {
          if (!silent) console.warn(`Error refreshing ${section}:`, err);
        }) : Promise.resolve();
      });

    await Promise.all(criticalPromises);

    if (!silent) {
      console.log('Critical data refreshed');
    }

    // Refresh secondary sections (non-blocking)
    secondarySections.forEach(section => {
      const fn = this.refreshFunctions.get(section);
      if (fn) {
        fn().catch(err => {
          if (!silent) console.warn(`Error refreshing ${section}:`, err);
        });
      }
    });
  }

  /**
   * Refresh a single section
   */
  async refreshSection(name: string): Promise<void> {
    const fn = this.refreshFunctions.get(name);
    if (fn) {
      await fn().catch(err => console.error(`Error refreshing ${name}:`, err));
    }
  }
}

// Export singleton instance
export const dataRefreshService = new DataRefreshService();
