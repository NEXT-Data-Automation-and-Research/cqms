/**
 * Intelligent Data Refresh Service
 * Handles selective data refresh without full page reloads
 */

interface RefreshOptions {
  force?: boolean;
  sections?: string[];
  silent?: boolean;
}

type RefreshFunction = () => Promise<void>;

/**
 * Service for managing intelligent data refresh
 * Replaces full page reloads with selective section updates
 */
export class DataRefreshService {
  private refreshInterval: number | null = null;
  private refreshFunctions: Map<string, RefreshFunction> = new Map();
  private readonly DEFAULT_INTERVAL = 2 * 60 * 1000; // 2 minutes

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
   * Refresh specific sections or all sections
   */
  async refresh(options: RefreshOptions = {}): Promise<void> {
    const { force = false, sections, silent = false } = options;

    // Only refresh if page is visible
    if (document.hidden && !force) {
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
