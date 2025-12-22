/**
 * Application Layer - Auditor Dashboard Controller
 * Main orchestrator that coordinates between layers
 */

// Type declaration for window.accessControl
declare global {
  interface Window {
    accessControl?: {
      enforcePageAccess: (page: string) => boolean;
    };
  }
}

import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
import { AuditorDashboardRepository } from '../infrastructure/auditor-dashboard-repository.js';
import { AuditorDashboardState, auditorDashboardState } from './auditor-dashboard-state.js';
import { AuditorDashboardService } from './auditor-dashboard-service.js';
import { AuditorDashboardRenderer } from '../presentation/auditor-dashboard-renderer.js';
import { AuditorDashboardEventHandlers } from '../presentation/auditor-dashboard-events.js';

export class AuditorDashboardController {
  private repository: AuditorDashboardRepository;
  private state: AuditorDashboardState;
  private service: AuditorDashboardService;
  private renderer: AuditorDashboardRenderer;
  private eventHandlers: AuditorDashboardEventHandlers;

  constructor() {
    // Create database client using factory (easy to switch databases!)
    const db = DatabaseFactory.createClient('supabase');
    this.repository = new AuditorDashboardRepository(db);
    this.state = auditorDashboardState;
    this.service = new AuditorDashboardService(this.repository, this.state);
    this.renderer = new AuditorDashboardRenderer(this.state);
    this.eventHandlers = new AuditorDashboardEventHandlers(
      this.state,
      this.service,
      this.renderer
    );
  }

  /**
   * Initialize the dashboard
   */
  async initialize(): Promise<void> {
    try {
      console.log('[AuditorDashboard] Initializing dashboard controller...');
      
      // Check page access (support both old and new filename)
      // If accessControl exists, use it; otherwise skip the check
      if (window.accessControl) {
        const currentPage = window.location.pathname.split('/').pop() || '';
        const pageName = currentPage === 'auditor-dashboard-page.html' ? 'auditor-dashboard-page.html' : 'auditor-dashboard.html';
        if (!window.accessControl.enforcePageAccess(pageName)) {
          console.warn('[AuditorDashboard] Page access denied by accessControl');
          return;
        }
      } else {
        console.log('[AuditorDashboard] accessControl not found, skipping access check');
      }

      // Get current user - try localStorage first, then Supabase session
      let userEmail = '';
      let userRole = '';
      
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.email) {
        userEmail = userInfo.email;
        userRole = userInfo.role || '';
        console.log('[AuditorDashboard] Got user from localStorage:', userEmail);
      } else if (window.supabaseClient) {
        // Try to get from Supabase session if not in localStorage
        try {
          const { data: { user }, error } = await window.supabaseClient.auth.getUser();
          if (user && !error) {
            userEmail = user.email || '';
            userRole = user.user_metadata?.role || '';
            console.log('[AuditorDashboard] Got user from Supabase session:', userEmail);
          }
        } catch (error) {
          console.warn('[AuditorDashboard] Failed to get user from Supabase:', error);
        }
      }
      
      this.state.initialize(userEmail, userRole);

      if (!this.state.currentUserEmail) {
        console.error('[AuditorDashboard] No user logged in - email is empty');
        return;
      }
      
      console.log('[AuditorDashboard] User:', this.state.currentUserEmail);

      // Wait for Supabase
      let attempts = 0;
      while (!window.supabaseClient && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.supabaseClient) {
        console.error('[AuditorDashboard] Supabase client not initialized');
        return;
      }
      
      console.log('[AuditorDashboard] Supabase client ready');

      // Initialize UI
      console.log('[AuditorDashboard] Initializing UI...');
      this.renderer.initializeUI();
      this.state.initializeTodayFilter();
      this.eventHandlers.setupEventListeners();

      // Load data in parallel
      console.log('[AuditorDashboard] Loading data...');
      await Promise.all([
        this.loadAllUsers(),
        this.loadScorecards(),
        this.loadInitialData()
      ]);

      // Setup presence tracking
      console.log('[AuditorDashboard] Setting up presence tracking...');
      await this.setupPresenceTracking();

      // Mark initial load as complete
      setTimeout(() => {
        this.state.loading.isInitialLoad = false;
      }, 500);
      
      console.log('[AuditorDashboard] Dashboard initialized successfully');

    } catch (error) {
      console.error('[AuditorDashboard] Error initializing dashboard:', error);
      throw error; // Re-throw to be caught by the page's error handler
    }
  }

  /**
   * Load all users
   */
  private async loadAllUsers(): Promise<void> {
    this.state.allUsers = await this.repository.loadAllUsers();
  }

  /**
   * Load scorecards
   */
  private async loadScorecards(): Promise<void> {
    const scorecards = await this.repository.loadScorecards();
    this.state.allScorecards = scorecards;
    this.state.cachedScorecardTables = scorecards.map(s => s.table_name).filter(Boolean);
    this.renderer.populateScorecardFilter(scorecards);
  }

  /**
   * Load initial data based on current tab
   */
  private async loadInitialData(): Promise<void> {
    this.renderer.showLoadingState();

    if (this.state.currentTab === 'team-stats') {
      await this.loadTeamStats();
    } else {
      await this.loadStandupView();
    }
  }

  /**
   * Load team stats
   */
  async loadTeamStats(): Promise<void> {
    try {
      this.state.loading.isLoading = true;
      const stats = await this.service.calculateTeamStats();
      this.state.teamStats = stats;
      this.renderer.renderTeamStats(stats);
      this.renderer.hideLoadingState();
    } catch (error) {
      console.error('Error loading team stats:', error);
      this.renderer.hideLoadingState();
    }
  }

  /**
   * Load standup view
   */
  async loadStandupView(): Promise<void> {
    try {
      this.state.loading.isLoading = true;
      const data = await this.service.calculateStandupViewData();
      this.state.standupViewData = data;
      this.renderer.renderStandupView(data);
      this.renderer.hideLoadingState();
    } catch (error) {
      console.error('Error loading standup view:', error);
      this.renderer.hideLoadingState();
    }
  }

  /**
   * Setup presence tracking
   */
  private async setupPresenceTracking(): Promise<void> {
    try {
      if (!window.supabaseClient || !this.state.currentUserEmail) {
        return;
      }

      if (this.state.currentUserRole !== 'Quality Analyst') {
        return;
      }

      const channelName = 'auditor-presence';
      this.state.presenceChannel = window.supabaseClient.channel(channelName, {
        config: {
          presence: {
            key: this.state.currentUserEmail
          }
        }
      });

      this.state.presenceChannel
        .on('presence', { event: 'sync' }, () => {
          this.updateOnlineAuditors();
        })
        .on('presence', { event: 'join' }, () => {
          this.updateOnlineAuditors();
        })
        .on('presence', { event: 'leave' }, () => {
          this.updateOnlineAuditors();
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await this.trackPresence();
            this.startHeartbeat();
          }
        });
    } catch (error) {
      console.error('Error setting up presence tracking:', error);
    }
  }

  /**
   * Track current user's presence
   */
  private async trackPresence(): Promise<void> {
    try {
      if (!this.state.presenceChannel) return;

      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.role !== 'Quality Analyst') return;

      await this.state.presenceChannel.track({
        email: this.state.currentUserEmail,
        name: userInfo.name || this.state.currentUserEmail,
        role: userInfo.role,
        online_at: window.dhakaDateToUTCISO?.(window.getDhakaNow?.() || new Date()) || new Date().toISOString(),
        page: 'auditor-dashboard'
      });
    } catch (error) {
      console.error('Error tracking presence:', error);
    }
  }

  /**
   * Start heartbeat for presence
   */
  private startHeartbeat(): void {
    if (this.state.heartbeatInterval) {
      clearInterval(this.state.heartbeatInterval);
    }

    this.state.heartbeatInterval = setInterval(async () => {
      await this.trackPresence();
    }, 30000); // 30 seconds
  }

  /**
   * Update online auditors list
   */
  private updateOnlineAuditors(): void {
    try {
      if (!this.state.presenceChannel) return;

      const state = this.state.presenceChannel.presenceState();
      const newOnlineAuditors = new Set<string>();

      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.role === 'Quality Analyst' && presence.email) {
            newOnlineAuditors.add(presence.email);
          }
        });
      });

      this.state.onlineAuditors = newOnlineAuditors;
      this.renderer.updateOnlineStatusIndicators();
    } catch (error) {
      console.error('Error updating online auditors:', error);
    }
  }

  /**
   * Apply date filter
   */
  async applyDateFilter(startDate: string | null, endDate: string | null): Promise<void> {
    this.state.cancelOngoingFetches();
    this.renderer.showLoadingState();
    this.state.applyDateFilter(startDate, endDate);
    await this.loadInitialData();
  }

  /**
   * Clear date filter
   */
  async clearDateFilter(): Promise<void> {
    this.state.cancelOngoingFetches();
    this.renderer.showLoadingState();
    this.state.initializeTodayFilter();
    await this.loadInitialData();
  }

  /**
   * Switch tab
   */
  async switchTab(index: number): Promise<void> {
    this.state.currentTab = index === 0 ? 'team-stats' : 'standup-view';
    this.renderer.showLoadingState();
    await this.loadInitialData();
  }

  /**
   * Cleanup on page unload
   */
  async cleanup(): Promise<void> {
    if (this.state.heartbeatInterval) {
      clearInterval(this.state.heartbeatInterval);
      this.state.heartbeatInterval = null;
    }

    if (this.state.presenceChannel) {
      await this.state.presenceChannel.untrack();
      await this.state.presenceChannel.unsubscribe();
      this.state.presenceChannel = null;
    }
  }
}

// Export singleton instance
export const auditorDashboardController = new AuditorDashboardController();

