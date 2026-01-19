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

import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import { SupabaseClientAdapter } from '../../../infrastructure/database/supabase/supabase-client.adapter.js';
import { AuditorDashboardRepository } from '../infrastructure/auditor-dashboard-repository.js';
import { AuditorDashboardState, auditorDashboardState } from './auditor-dashboard-state.js';
import { AuditorDashboardService } from './auditor-dashboard-service.js';
import { AuditorDashboardRenderer } from '../presentation/auditor-dashboard-renderer.js';
import { AuditorDashboardEventHandlers } from '../presentation/auditor-dashboard-events.js';
import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';

export class AuditorDashboardController {
  private repository: AuditorDashboardRepository | null = null;
  private state: AuditorDashboardState;
  private service: AuditorDashboardService;
  private renderer: AuditorDashboardRenderer;
  private eventHandlers: AuditorDashboardEventHandlers;
  
  constructor() {
    // Don't create repository in constructor - wait until authenticated
    this.state = auditorDashboardState;
    this.service = new AuditorDashboardService(null as any, this.state); // Will be set in initialize
    this.renderer = new AuditorDashboardRenderer(this.state);
    this.eventHandlers = new AuditorDashboardEventHandlers(
      this.state,
      this.service,
      this.renderer
    );
  }

  /**
   * Get or create the repository (lazy initialization with authentication)
   * ✅ SECURITY: Verifies authentication before creating repository
   */
  private async getRepository(): Promise<AuditorDashboardRepository> {
    if (!this.repository) {
      // ✅ SECURITY: Verify authentication first
      await getAuthenticatedSupabase(); // This will throw if not authenticated
      
      // Get base Supabase client (authentication already verified above)
      const { getSupabase } = await import('../../../utils/supabase-init.js');
      const baseClient = getSupabase();
      if (!baseClient) {
        throw new Error('Supabase client not initialized');
      }
      
      // Create adapter from base client (auth already verified)
      const db = new SupabaseClientAdapter(baseClient);
      this.repository = new AuditorDashboardRepository(db);
      // Update service with repository
      this.service = new AuditorDashboardService(this.repository, this.state);
    }
    return this.repository;
  }

  /**
   * Initialize the dashboard
   */
  async initialize(): Promise<void> {
    logInfo('[AuditorDashboard] ===== INITIALIZE METHOD CALLED - Entry point =====');
    logInfo('[AuditorDashboard] Timestamp:', { timestamp: new Date().toISOString() });
    try {
      logInfo('[AuditorDashboard] Initializing dashboard controller...');
      
      // Check page access (support both old and new filename)
      // If accessControl exists, use it; otherwise skip the check
      logInfo('[AuditorDashboard] Checking accessControl', { exists: !!window.accessControl });
      if (window.accessControl) {
        const currentPage = window.location.pathname.split('/').pop() || '';
        const pageName = currentPage === 'auditor-dashboard-page.html' ? 'auditor-dashboard-page.html' : 'auditor-dashboard.html';
        logInfo('[AuditorDashboard] Checking page access for:', { pageName });
        const hasAccess = window.accessControl.enforcePageAccess(pageName);
        logInfo('[AuditorDashboard] Access result:', { hasAccess });
        if (!hasAccess) {
          logWarn('[AuditorDashboard] Page access denied by accessControl');
          return;
        }
        logInfo('[AuditorDashboard] Page access granted');
      } else {
        logInfo('[AuditorDashboard] accessControl not found, skipping access check');
      }

      // Get current user - try localStorage first, then Supabase session
      let userEmail = '';
      let userRole = '';
      
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.email) {
        userEmail = userInfo.email;
        userRole = userInfo.role || '';
        logInfo('[AuditorDashboard] Got user from localStorage:', { email: userEmail });
      } else if (window.supabaseClient) {
        // Try to get from Supabase session if not in localStorage
        try {
          const { data: { user }, error } = await window.supabaseClient.auth.getUser();
          if (user && !error) {
            userEmail = user.email || '';
            userRole = user.user_metadata?.role || '';
            logInfo('[AuditorDashboard] Got user from Supabase session:', { email: userEmail });
          }
        } catch (error) {
          logWarn('[AuditorDashboard] Failed to get user from Supabase:', error);
        }
      }
      
      this.state.initialize(userEmail, userRole);

      if (!this.state.currentUserEmail) {
        logError('[AuditorDashboard] No user logged in - email is empty');
        return;
      }
      
      logInfo('[AuditorDashboard] User:', { email: this.state.currentUserEmail });

      // Wait for Supabase
      let attempts = 0;
      while (!window.supabaseClient && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.supabaseClient) {
        logError('[AuditorDashboard] Supabase client not initialized');
        return;
      }
      
      logInfo('[AuditorDashboard] Supabase client ready');

      // Initialize UI
      logInfo('[AuditorDashboard] Initializing UI...');
      this.renderer.initializeUI();
      this.state.initializeTodayFilter();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:143',message:'about to call setupEventListeners',data:{eventHandlersExists:!!this.eventHandlers,hasSetupMethod:typeof this.eventHandlers.setupEventListeners==='function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      this.eventHandlers.setupEventListeners();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:145',message:'setupEventListeners called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Update week display
      this.eventHandlers.updateWeekDisplay();
      
      // Expose event handlers to window for global functions
      (window as any).auditorDashboardEventHandlers = this.eventHandlers;

      // Load data - repository must be initialized first
      logInfo('[AuditorDashboard] Loading data...');
      // #region agent log
      logInfo('[DEBUG] Controller loading data - hypothesis D');
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:140',message:'controller loading data',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch((e)=>logWarn('[DEBUG] Fetch failed:',e));
      // #endregion
      
      // Initialize repository first (needed by service)
      await this.getRepository();
      logInfo('[AuditorDashboard] Repository initialized');
      
      // Load users and scorecards first, then initial data (which needs repository)
      await Promise.all([
        this.loadAllUsers(),
        this.loadScorecards()
      ]);
      
      // Now load initial data (which uses service that needs repository)
      await this.loadInitialData();
      
      // Populate employee filter after assignments are loaded
      try {
        const period = this.state.getCurrentPeriodDates();
        const { scheduled, completed } = await (await this.getRepository()).loadTeamAssignments(period);
        if (typeof this.renderer.populateEmployeeFilter === 'function') {
          this.renderer.populateEmployeeFilter([...scheduled, ...completed]);
        } else {
          logWarn('[DEBUG] populateEmployeeFilter not available, skipping');
        }
      } catch (error) {
        logWarn('[DEBUG] Error loading assignments for employee filter:', error);
      }
      // #region agent log
      logInfo('[DEBUG] Controller data loaded', { users: this.state.allUsers.length, scorecards: this.state.allScorecards.length });
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:145',message:'controller data loaded',data:{usersCount:this.state.allUsers.length,scorecardsCount:this.state.allScorecards.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch((e)=>logWarn('[DEBUG] Fetch failed:',e));
      // #endregion

      // Setup presence tracking
      logInfo('[AuditorDashboard] Setting up presence tracking...');
      await this.setupPresenceTracking();

      // Mark initial load as complete
      setTimeout(() => {
        this.state.loading.isInitialLoad = false;
      }, 500);
      
      logInfo('[AuditorDashboard] Dashboard initialized successfully');

    } catch (error) {
      logError('[AuditorDashboard] Error initializing dashboard:', error);
      throw error; // Re-throw to be caught by the page's error handler
    }
  }

  /**
   * Load all users
   */
  private async loadAllUsers(): Promise<void> {
    this.state.allUsers = await (await this.getRepository()).loadAllUsers();
    // Populate filter dropdowns after users are loaded
    logInfo('[DEBUG] loadAllUsers - users loaded:', { count: this.state.allUsers.length });
    logInfo('[DEBUG] loadAllUsers - renderer methods:', {
      populateAuditorFilter: typeof this.renderer.populateAuditorFilter,
      populateChannelFilter: typeof this.renderer.populateChannelFilter,
      populateEmployeeFilter: typeof this.renderer.populateEmployeeFilter
    });
    if (typeof this.renderer.populateAuditorFilter === 'function') {
      this.renderer.populateAuditorFilter(this.state.allUsers);
    } else {
      logWarn('[DEBUG] populateAuditorFilter not available, skipping');
    }
    if (typeof this.renderer.populateChannelFilter === 'function') {
      this.renderer.populateChannelFilter(this.state.allUsers);
    } else {
      logWarn('[DEBUG] populateChannelFilter not available, skipping');
    }
  }

  /**
   * Load scorecards
   */
  private async loadScorecards(): Promise<void> {
    const scorecards = await (await this.getRepository()).loadScorecards();
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
    // #region agent log
    const period = this.state.getCurrentPeriodDates();
    logInfo('[DEBUG] loadTeamStats entry', { 
      filters: this.state.currentFilters, 
      dateFilter: this.state.dateFilter,
      periodStart: period.start?.toISOString(),
      periodEnd: period.end?.toISOString()
    });
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:197',message:'loadTeamStats entry',data:{filters:this.state.currentFilters,dateFilter:this.state.dateFilter,periodStart:period.start?.toISOString(),periodEnd:period.end?.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      this.state.loading.isLoading = true;
      this.renderer.showLoadingState();
      const stats = await this.service.calculateTeamStats();
      // #region agent log
      logInfo('[DEBUG] loadTeamStats stats calculated', { 
        auditorStatsCount: stats.auditorStats.length, 
        totalAssigned: stats.totalAssigned,
        completed: stats.completed
      });
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:200',message:'loadTeamStats stats calculated',data:{auditorStatsCount:stats.auditorStats.length,totalAssigned:stats.totalAssigned,completed:stats.completed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      this.state.teamStats = stats;
      this.renderer.renderTeamStats(stats);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:203',message:'loadTeamStats rendered',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      this.renderer.hideLoadingState();
      this.state.loading.isLoading = false;
    } catch (error) {
      // #region agent log
      logError('[DEBUG] loadTeamStats error', error);
      fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:206',message:'loadTeamStats error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      logError('Error loading team stats:', error);
      this.renderer.hideLoadingState();
      this.state.loading.isLoading = false;
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
      logError('Error loading standup view:', error);
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
      logError('Error setting up presence tracking:', error);
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
      logError('Error tracking presence:', error);
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
      logError('Error updating online auditors:', error);
    }
  }

  /**
   * Apply date filter
   */
  async applyDateFilter(startDate: string | null, endDate: string | null): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:420',message:'controller.applyDateFilter entry',data:{startDate,endDate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    logInfo('[DEBUG] applyDateFilter called', { startDate, endDate });
    this.state.cancelOngoingFetches();
    this.renderer.showLoadingState();
    this.state.applyDateFilter(startDate, endDate);
    
    // Ensure repository is initialized before loading data
    const repo = await this.getRepository();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:427',message:'repository obtained',data:{repoExists:!!repo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Update date button text and inputs
    this.updateDateButtonText();
    if ((window as any).auditorDashboardEventHandlers) {
      (window as any).auditorDashboardEventHandlers.updateDateInputs();
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:433',message:'calling loadInitialData',data:{currentTab:this.state.currentTab},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    await this.loadInitialData();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auditor-dashboard-controller.ts:435',message:'loadInitialData completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  }

  /**
   * Clear date filter
   */
  async clearDateFilter(): Promise<void> {
    logInfo('[DEBUG] clearDateFilter called');
    this.state.cancelOngoingFetches();
    this.renderer.showLoadingState();
    this.state.initializeTodayFilter();
    
    // Ensure repository is initialized before loading data
    await this.getRepository();
    
    // Update date button text and inputs
    this.updateDateButtonText();
    if ((window as any).auditorDashboardEventHandlers) {
      (window as any).auditorDashboardEventHandlers.updateDateInputs();
      (window as any).auditorDashboardEventHandlers.updateDateButtonText();
    }
    
    await this.loadInitialData();
  }

  /**
   * Update date button text
   */
  private updateDateButtonText(): void {
    const dateBtnText = document.getElementById('dateBtnText');
    if (!dateBtnText) return;

    if (this.state.dateFilter.start && this.state.dateFilter.end) {
      const startDate = window.parseDhakaDate?.(this.state.dateFilter.start);
      const endDate = window.parseDhakaDate?.(this.state.dateFilter.end);
      
      if (startDate && endDate && window.formatDhakaDate) {
        const startStr = window.formatDhakaDate(startDate);
        const endStr = window.formatDhakaDate(endDate);
        if (startStr === endStr) {
          dateBtnText.textContent = startStr;
        } else {
          dateBtnText.textContent = `${startStr} - ${endStr}`;
        }
      } else {
        dateBtnText.textContent = 'Date Range';
      }
    } else {
      dateBtnText.textContent = 'Date Range';
    }
  }

  /**
   * Switch tab
   */
  async switchTab(index: number): Promise<void> {
    this.state.currentTab = index === 0 ? 'team-stats' : 'standup-view';
    
    // Update tab UI
    const tabButtons = document.querySelectorAll('.tab-button');
    const slider = document.querySelector('.tab-slider');
    const tabBar = document.querySelector('.tab-navigation');
    
    tabButtons.forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (slider && tabBar) {
      const containerPadding = 5;
      const tabWidth = ((tabBar as HTMLElement).offsetWidth - (containerPadding * 2)) / 2;
      (slider as HTMLElement).style.left = `${containerPadding + (index * tabWidth)}px`;
      (slider as HTMLElement).style.width = `${tabWidth}px`;
    }
    
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

