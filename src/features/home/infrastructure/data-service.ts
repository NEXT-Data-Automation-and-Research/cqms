/**
 * Data Service for Home Page
 * Handles all data loading operations for the homepage dashboard
 */

import type { 
  User, 
  Assignment, 
  Audit, 
  Notification, 
  Update, 
  StatsData, 
  FiltersData,
  Scorecard,
  Event,
  PeriodDates
} from './types.js';
import { homeState, HomeState } from './state.js';
import type { DateFilterManager } from './date-filter.js';

export class DataService {
  /**
   * Load current user profile from database
   */
  static async loadCurrentUserProfile(): Promise<User | null> {
    try {
      if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
      }

      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await window.supabaseClient.auth.getUser();
      if (authError || !authUser) {
        throw new Error('User not authenticated');
      }

      // Fetch user data from database
      const { data: userData, error } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        throw error;
      }

      if (userData) {
        // Update localStorage with latest data including avatar_url
        const userInfo = {
          id: authUser.id,
          email: userData.email || authUser.email,
          name: userData.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          role: userData.role || 'User',
          avatar: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          picture: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          avatar_url: userData.avatar_url || null,
          channel: userData.channel || null,
          team: userData.team || null,
          team_supervisor: userData.team_supervisor || null,
          quality_mentor: userData.quality_mentor || false,
          employee_id: userData.employee_id || null,
          intercom_admin_alias: userData.intercom_admin_alias || null
        };

        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        // Update UI immediately (with retry mechanism for component loading)
        this.renderUserProfile(userInfo);

        // Also try again after a short delay to ensure component is loaded
        setTimeout(() => {
          this.renderUserProfile(userInfo);
        }, 1000);

        return userInfo as User;
      }

      return null;
    } catch (error) {
      console.error('Error in loadCurrentUserProfile:', error);
      // Fallback to localStorage
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          this.renderUserProfile(userInfo);
          // Also try again after a short delay
          setTimeout(() => {
            this.renderUserProfile(userInfo);
          }, 1000);
          return userInfo as User;
        } catch (e) {
          console.error('Error parsing userInfo from localStorage:', e);
        }
      }
      return null;
    }
  }

  /**
   * Load all users from the database
   */
  static async loadAllUsers(state: HomeState = homeState): Promise<void> {
    try {
      // Check cache first
      const cachedUsers = sessionStorage.getItem('cachedUsers');
      const cachedUsersTime = sessionStorage.getItem('cachedUsersTime');
      const cacheAge = cachedUsersTime ? Date.now() - parseInt(cachedUsersTime) : Infinity;
      
      if (cachedUsers && cacheAge < 300000) { // 5 minutes cache
        state.allUsers = JSON.parse(cachedUsers);
        return;
      }

      if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await window.supabaseClient
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }

      state.allUsers = (data || []) as User[];
      
      // Cache the results
      sessionStorage.setItem('cachedUsers', JSON.stringify(state.allUsers));
      sessionStorage.setItem('cachedUsersTime', Date.now().toString());
    } catch (error) {
      console.error('Error in loadAllUsers:', error);
      throw error;
    }
  }

  /**
   * Load recent updates/activities for the dashboard
   */
  static async loadRecentUpdates(
    state: HomeState = homeState, 
    dateFilterManager: DateFilterManager
  ): Promise<void> {
    try {
      if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const period = dateFilterManager.getCurrentPeriodDates();
      const startDate = window.dhakaDateToUTCISO 
        ? window.dhakaDateToUTCISO(period.start) 
        : period.start.toISOString();
      const endDate = window.dhakaDateToUTCISO 
        ? window.dhakaDateToUTCISO(period.end) 
        : period.end.toISOString();

      // Get all scorecards to query their tables
      const { data: scorecards, error: scorecardsError } = await window.supabaseClient
        .from('scorecards')
        .select('id, name, table_name')
        .eq('is_active', true);

      if (scorecardsError) {
        console.error('Error loading scorecards:', scorecardsError);
        throw scorecardsError;
      }

      const updates: Update[] = [];

      // Query each scorecard table for recent audits
      if (scorecards && scorecards.length > 0) {
        for (const scorecard of scorecards) {
          if (!scorecard.table_name) continue;

          try {
            const { data: audits, error: auditError } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('*')
              .gte('created_at', startDate)
              .lte('created_at', endDate)
              .order('created_at', { ascending: false })
              .limit(50);

            if (auditError) {
              console.warn(`Error loading audits from ${scorecard.table_name}:`, auditError);
              continue;
            }

            if (audits) {
              for (const audit of audits) {
                const update: Update = {
                  id: audit.id || '',
                  type: 'audit_created',
                  timestamp: audit.created_at || audit.submitted_at,
                  auditId: audit.id,
                  scorecardId: scorecard.id,
                  scorecardTable: scorecard.table_name,
                  displayName: audit.auditor_name || audit.employee_name,
                  displayEmail: audit.auditor_email || audit.employee_email,
                  status: audit.status,
                  statusText: audit.status || 'Created'
                };
                updates.push(update);
              }
            }
          } catch (error) {
            console.warn(`Error processing scorecard ${scorecard.name}:`, error);
            continue;
          }
        }
      }

      // Sort by timestamp (most recent first)
      updates.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      // Limit to most recent 20 updates
      const recentUpdates = updates.slice(0, 20);

      // Update UI with recent updates
      this.renderRecentUpdates(recentUpdates);
    } catch (error) {
      console.error('Error in loadRecentUpdates:', error);
      throw error;
    }
  }

  /**
   * Update stats cards with current statistics
   */
  static async updateYourStats(
    state: HomeState = homeState,
    dateFilterManager: DateFilterManager
  ): Promise<void> {
    try {
      if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const period = dateFilterManager.getCurrentPeriodDates();
      const startDate = window.dhakaDateToUTCISO 
        ? window.dhakaDateToUTCISO(period.start) 
        : period.start.toISOString();
      const endDate = window.dhakaDateToUTCISO 
        ? window.dhakaDateToUTCISO(period.end) 
        : period.end.toISOString();

      // Get all active scorecards
      const { data: scorecards, error: scorecardsError } = await window.supabaseClient
        .from('scorecards')
        .select('id, name, table_name')
        .eq('is_active', true);

      if (scorecardsError) {
        console.error('Error loading scorecards:', scorecardsError);
        throw scorecardsError;
      }

      const stats: StatsData = {
        totalAssigned: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        remaining: 0,
        percentage: 0,
        daysRemaining: 0,
        avgDuration: 0,
        avgDurationText: '0m',
        totalAuditsConducted: 0,
        totalScoreSum: 0,
        totalAuditsWithScore: 0,
        avgQualityScore: 0,
        avgQualityScoreText: '0%',
        passingCount: 0,
        notPassingCount: 0,
        activeReversals: 0,
        resolvedReversals: 0,
        totalReversals: 0,
        requiresAcknowledgment: 0
      };

      // Aggregate stats from all scorecard tables
      if (scorecards && scorecards.length > 0) {
        for (const scorecard of scorecards) {
          if (!scorecard.table_name) continue;

          try {
            // Get assignments for this scorecard
            const { data: assignments, error: assignError } = await window.supabaseClient
              .from('assignments')
              .select('*')
              .eq('scorecard_id', scorecard.id)
              .gte('scheduled_date', startDate)
              .lte('scheduled_date', endDate);

            if (!assignError && assignments) {
              stats.totalAssigned += assignments.length;
              stats.completed += assignments.filter((a: any) => a.status === 'completed').length;
              stats.inProgress += assignments.filter((a: any) => a.status === 'in_progress').length;
              stats.pending += assignments.filter((a: any) => a.status === 'pending').length;
            }

            // Get audits for this scorecard
            const { data: audits, error: auditError } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('*')
              .gte('created_at', startDate)
              .lte('created_at', endDate);

            if (!auditError && audits) {
              stats.totalAuditsConducted += audits.length;

              // Calculate average score
              let scoreSum = 0;
              let scoreCount = 0;
              let passingCount = 0;
              let notPassingCount = 0;

              for (const audit of audits) {
                if (audit.average_score !== null && audit.average_score !== undefined) {
                  const score = typeof audit.average_score === 'string' 
                    ? parseFloat(audit.average_score) 
                    : audit.average_score;
                  if (!isNaN(score)) {
                    scoreSum += score;
                    scoreCount++;
                  }
                }

                const passingStatus = audit.passing_status || audit.passingStatus;
                if (passingStatus === 'Passing' || passingStatus === 'passing') {
                  passingCount++;
                } else if (passingStatus === 'Not Passing' || passingStatus === 'not_passing') {
                  notPassingCount++;
                }

                // Check for reversals
                if (audit.reversal_requested_at || audit.reversalRequestedAt) {
                  if (audit.reversal_approved === null || audit.reversal_approved === undefined) {
                    stats.activeReversals++;
                  } else {
                    stats.resolvedReversals++;
                  }
                  stats.totalReversals++;
                }

                // Check for acknowledgments
                const ackStatus = audit.acknowledgement_status || audit.acknowledgementStatus;
                if (ackStatus === 'pending' || ackStatus === 'Pending') {
                  stats.requiresAcknowledgment++;
                }

                // Calculate average duration
                if (audit.audit_duration) {
                  const duration = typeof audit.audit_duration === 'string'
                    ? parseFloat(audit.audit_duration)
                    : audit.audit_duration;
                  if (!isNaN(duration) && duration > 0) {
                    stats.avgDuration += duration;
                  }
                }
              }

              stats.totalScoreSum += scoreSum;
              stats.totalAuditsWithScore += scoreCount;
              stats.passingCount += passingCount;
              stats.notPassingCount += notPassingCount;
            }
          } catch (error) {
            console.warn(`Error processing stats for ${scorecard.name}:`, error);
            continue;
          }
        }
      }

      // Calculate averages
      if (stats.totalAuditsWithScore > 0) {
        stats.avgQualityScore = stats.totalScoreSum / stats.totalAuditsWithScore;
        stats.avgQualityScoreText = `${Math.round(stats.avgQualityScore)}%`;
      }

      // Calculate remaining assignments
      stats.remaining = stats.totalAssigned - stats.completed;
      stats.percentage = stats.totalAssigned > 0 
        ? Math.round((stats.completed / stats.totalAssigned) * 100) 
        : 0;

      // Calculate days remaining in period
      const now = window.getDhakaNow ? window.getDhakaNow() : new Date();
      const end = period.end;
      const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      stats.daysRemaining = Math.max(0, daysRemaining);

      // Calculate average duration
      const totalAudits = stats.totalAuditsConducted;
      if (totalAudits > 0 && stats.avgDuration > 0) {
        const avgDuration = stats.avgDuration / totalAudits;
        const hours = Math.floor(avgDuration / 60);
        const minutes = Math.round(avgDuration % 60);
        stats.avgDurationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }

      // Update UI with stats
      this.renderStats(stats, state.isAgent);
    } catch (error) {
      console.error('Error in updateYourStats:', error);
      throw error;
    }
  }

  /**
   * Load assigned audits for the current user
   */
  static async loadAssignedAudits(
    state: HomeState = homeState,
    dateFilterManager: DateFilterManager
  ): Promise<void> {
    try {
      if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const period = dateFilterManager.getCurrentPeriodDates();
      const startDate = window.dhakaDateToUTCISO 
        ? window.dhakaDateToUTCISO(period.start) 
        : period.start.toISOString();
      const endDate = window.dhakaDateToUTCISO 
        ? window.dhakaDateToUTCISO(period.end) 
        : period.end.toISOString();

      // Get assignments for current user
      const { data: assignments, error: assignError } = await window.supabaseClient
        .from('assignments')
        .select('*, scorecards(id, name, table_name)')
        .or(`auditor_email.eq.${state.currentUserEmail},employee_email.eq.${state.currentUserEmail}`)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: false });

      if (assignError) {
        console.error('Error loading assignments:', assignError);
        throw assignError;
      }

      const audits: Audit[] = [];

      // For each assignment, get the corresponding audit if it exists
      if (assignments) {
        for (const assignment of assignments) {
          const scorecard = assignment.scorecards as Scorecard | null;
          if (!scorecard || !scorecard.table_name) continue;

          try {
            // Try to find the audit for this assignment
            const { data: auditData, error: auditError } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('*')
              .eq('interaction_id', assignment.interaction_id || '')
              .maybeSingle();

            if (auditError && auditError.code !== 'PGRST116') {
              console.warn(`Error loading audit for assignment ${assignment.id}:`, auditError);
            }

            const audit: Audit = {
              id: auditData?.id || assignment.id,
              employee_email: assignment.employee_email,
              employee_name: assignment.employee_name,
              auditor_email: assignment.auditor_email,
              auditor_name: assignment.auditor_name,
              status: auditData?.status || assignment.status,
              passing_status: auditData?.passing_status || auditData?.passingStatus,
              average_score: auditData?.average_score || auditData?.averageScore,
              total_errors_count: auditData?.total_errors_count || auditData?.totalErrorsCount,
              interaction_id: assignment.interaction_id,
              channel: assignment.channel,
              submitted_at: auditData?.submitted_at || auditData?.created_at,
              created_at: assignment.created_at,
              _scorecard_id: scorecard.id,
              _scorecard_name: scorecard.name,
              _scorecard_table: scorecard.table_name,
              _isAssignment: !auditData
            };

            audits.push(audit);
          } catch (error) {
            console.warn(`Error processing assignment ${assignment.id}:`, error);
            continue;
          }
        }
      }

      // Sort audits
      audits.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      state.assignedAudits = audits;

      // Update UI with assigned audits
      this.renderAssignedAudits(audits, state.isAgent);
    } catch (error) {
      console.error('Error in loadAssignedAudits:', error);
      throw error;
    }
  }

  /**
   * Load notifications for the current user
   */
  static async loadNotifications(state: HomeState = homeState): Promise<void> {
    try {
      if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
      }

      // Get current user
      const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: notifications, error } = await window.supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        throw error;
      }

      state.notifications = (notifications || []) as Notification[];
      state.unreadNotificationCount = state.notifications.filter(
        n => n.status === 'unread' || !n.status
      ).length;

      // Update UI with notifications
      this.renderNotifications(state.notifications, state.unreadNotificationCount);
    } catch (error) {
      console.error('Error in loadNotifications:', error);
      throw error;
    }
  }

  /**
   * Load upcoming events
   */
  static async loadUpcomingEvents(): Promise<Event[]> {
    try {
      if (!window.supabaseClient) {
        throw new Error('Supabase client not available');
      }

      const now = window.getDhakaNow ? window.getDhakaNow() : new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 30); // Next 30 days

      const { data: events, error } = await window.supabaseClient
        .from('events')
        .select('*')
        .gte('date', now.toISOString().split('T')[0])
        .lte('date', futureDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error loading events:', error);
        throw error;
      }

      return (events || []) as Event[];
    } catch (error) {
      console.error('Error in loadUpcomingEvents:', error);
      return [];
    }
  }

  /**
   * Populate filter options (channels, agents, etc.)
   */
  static async populateFilters(state: HomeState = homeState): Promise<FiltersData> {
    try {
      const filters: FiltersData = {
        channels: [],
        agents: []
      };

      // Get unique channels from assignments
      if (state.allAssignments.length > 0) {
        const channels = new Set<string>();
        state.allAssignments.forEach(assignment => {
          if (assignment.channel) {
            channels.add(assignment.channel);
          }
        });
        filters.channels = Array.from(channels).sort();
      }

      // Get agents from users
      if (state.allUsers.length > 0) {
        const agents = state.allUsers
          .filter(user => user.role !== 'Employee')
          .map(user => user.email || '')
          .filter(email => email !== '')
          .sort();
        filters.agents = agents;
      }

      // Update UI with filter options
      this.renderFilters(filters);

      return filters;
    } catch (error) {
      console.error('Error in populateFilters:', error);
      throw error;
    }
  }

  /**
   * Render recent updates to the UI
   */
  private static renderRecentUpdates(updates: Update[]): void {
    const container = document.getElementById('updates-feed-container');
    if (!container) return;

    // This would typically call a UI renderer component
    // For now, we'll just log that updates are ready
    console.log('Recent updates loaded:', updates.length);
  }

  /**
   * Render stats to the UI
   */
  private static renderStats(stats: StatsData, isAgent: boolean): void {
    // Update stats cards in the UI
    const totalAssignedEl = document.getElementById('totalAssigned');
    const completedEl = document.getElementById('completed');
    const inProgressEl = document.getElementById('inProgress');
    const pendingEl = document.getElementById('pending');
    const remainingEl = document.getElementById('remaining');
    const percentageEl = document.getElementById('percentage');
    const avgDurationEl = document.getElementById('avgDuration');
    const avgQualityScoreEl = document.getElementById('avgQualityScore');
    const passingCountEl = document.getElementById('passingCount');
    const notPassingCountEl = document.getElementById('notPassingCount');

    if (totalAssignedEl) totalAssignedEl.textContent = stats.totalAssigned.toString();
    if (completedEl) completedEl.textContent = stats.completed.toString();
    if (inProgressEl) inProgressEl.textContent = stats.inProgress.toString();
    if (pendingEl) pendingEl.textContent = stats.pending.toString();
    if (remainingEl) remainingEl.textContent = stats.remaining.toString();
    if (percentageEl) percentageEl.textContent = `${stats.percentage}%`;
    if (avgDurationEl) avgDurationEl.textContent = stats.avgDurationText;
    if (avgQualityScoreEl) avgQualityScoreEl.textContent = stats.avgQualityScoreText;
    if (passingCountEl) passingCountEl.textContent = stats.passingCount.toString();
    if (notPassingCountEl) notPassingCountEl.textContent = stats.notPassingCount.toString();
  }

  /**
   * Render assigned audits to the UI
   */
  private static renderAssignedAudits(audits: Audit[], isAgent: boolean): void {
    const container = document.getElementById('assigned-audits-container');
    if (!container) return;

    // This would typically call a UI renderer component
    // For now, we'll just log that audits are ready
    console.log('Assigned audits loaded:', audits.length);
  }

  /**
   * Render notifications to the UI
   */
  private static renderNotifications(notifications: Notification[], unreadCount: number): void {
    // Update notification badge if it exists
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      badge.textContent = unreadCount > 0 ? unreadCount.toString() : '';
      badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
  }

  /**
   * Render user profile to the UI
   * Retries if elements are not found (component might not be loaded yet)
   */
  private static renderUserProfile(userInfo: User, retryCount: number = 0): void {
    const maxRetries = 10;
    const retryDelay = 100; // 100ms

    // Update dashboard avatar
    const dashboardAvatar = document.getElementById('dashboardAvatar');
    const dashboardUserName = document.getElementById('dashboardUserName');
    const dashboardUserRole = document.getElementById('dashboardUserRole');
    const dashboardTodayDate = document.getElementById('dashboardTodayDate');

    // If elements not found and we haven't exceeded retries, wait and try again
    if ((!dashboardAvatar || !dashboardUserName || !dashboardUserRole) && retryCount < maxRetries) {
      setTimeout(() => {
        this.renderUserProfile(userInfo, retryCount + 1);
      }, retryDelay);
      return;
    }

    // Update dashboard avatar
    if (dashboardAvatar) {
      const avatarUrl: string | null | undefined = 
        (userInfo.avatar as string | undefined) || 
        (userInfo.picture as string | undefined) || 
        (userInfo.avatar_url as string | undefined) || 
        null;
      if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = userInfo.name || 'User';
        img.className = 'w-full h-full rounded-full object-cover';
        img.onerror = () => {
          // Fallback to initials if image fails to load
          if (userInfo.name) {
            const initials = userInfo.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
            dashboardAvatar.innerHTML = `<span class="text-sm font-bold text-white">${initials}</span>`;
          } else {
            dashboardAvatar.innerHTML = `<span class="text-sm font-bold text-white">U</span>`;
          }
        };
        dashboardAvatar.innerHTML = '';
        dashboardAvatar.appendChild(img);
      } else if (userInfo.name) {
        const initials = userInfo.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
        dashboardAvatar.innerHTML = `<span class="text-sm font-bold text-white">${initials}</span>`;
      } else {
        dashboardAvatar.innerHTML = `<span class="text-sm font-bold text-white">U</span>`;
      }
    }

    // Update dashboard user name
    if (dashboardUserName) {
      dashboardUserName.textContent = userInfo.name || userInfo.email || 'Unknown User';
    }

    // Update dashboard user role
    if (dashboardUserRole) {
      dashboardUserRole.textContent = userInfo.role || 'User';
    }

    // Update today's date
    if (dashboardTodayDate) {
      const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
      dashboardTodayDate.textContent = today.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  }

  /**
   * Render filter options to the UI
   */
  private static renderFilters(filters: FiltersData): void {
    // Update channel filter dropdown
    const channelSelect = document.getElementById('channelFilter') as HTMLSelectElement | null;
    if (channelSelect) {
      const currentValue = channelSelect.value;
      channelSelect.innerHTML = '<option value="">All Channels</option>';
      filters.channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel;
        option.textContent = channel;
        if (option.value === currentValue) {
          option.selected = true;
        }
        channelSelect.appendChild(option);
      });
    }

    // Update agent filter dropdown
    const agentSelect = document.getElementById('agentFilter') as HTMLSelectElement | null;
    if (agentSelect) {
      const currentValue = agentSelect.value;
      agentSelect.innerHTML = '<option value="">All Agents</option>';
      filters.agents.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent;
        option.textContent = agent;
        if (option.value === currentValue) {
          option.selected = true;
        }
        agentSelect.appendChild(option);
      });
    }
  }
}

