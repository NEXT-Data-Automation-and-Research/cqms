/**
 * Notification Manager Module
 * Handles loading and rendering notifications
 */

import type { Notification, Audit, Scorecard, User } from '../types.js';
import { homeState } from '../state.js';
import { formatTimestamp, escapeHtml, viewAudit, viewAuditDetails } from '../utils.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logError, logWarn } from '../../../../utils/logging-helper.js';

export class NotificationManager {
  async load(): Promise<void> {
    try {
      if (!homeState.currentUserEmail) return;
      await this.fetchAndCache();
    } catch (error) {
      logError('Error loading notifications:', error);
      this.showError();
    }
  }

  private async fetchAndCache(): Promise<void> {
    const notificationFilterField = homeState.isAgent ? 'employee_email' : 'auditor_email';
    const { data: scorecards, error: scError } = await window.supabaseClient
      .from('scorecards')
      .select('table_name')
      .eq('is_active', true);
    
    let assignments: Audit[] = [];
    if (!scError && scorecards) {
      const assignmentPromises = scorecards.map(async (scorecard: Scorecard) => {
        try {
          const { data: audits, error } = await window.supabaseClient
            .from(scorecard.table_name)
            .select('id, employee_email, employee_name, auditor_email, interaction_id, created_at, submitted_at, status, passing_status, _scorecard_id, _scorecard_name, _scorecard_table')
            .eq(notificationFilterField, homeState.currentUserEmail)
            .order('submitted_at', { ascending: false })
            .limit(20);
          
          if (error) return [];
          return audits?.map((audit: Audit) => ({
            ...audit,
            status: 'completed',
            created_at: audit.created_at,
            completed_at: audit.submitted_at
          })) || [];
        } catch (err) {
          logWarn(`Error loading from ${scorecard.table_name}:`, err);
          return [];
        }
      });
      const assignmentResults = await Promise.all(assignmentPromises);
      assignments = assignmentResults.flat();
    }

    const reversals = await this.loadReversals(scorecards || []);
    const notifications = this.formatNotifications(assignments, reversals);
    
    homeState.notifications = notifications.slice(0, 20);
    this.updateUnreadCount();
    this.render();
    this.updateBadge();
  }

  private async loadReversals(scorecards: Scorecard[]): Promise<Audit[]> {
    const reversals: Audit[] = [];
    const reversalFilterField = homeState.isAgent ? 'employee_email' : 'auditor_email';
    const normalizedEmail = homeState.currentUserEmail.toLowerCase().trim();
    
    for (const scorecard of scorecards) {
      try {
        const { data: auditReversals, error } = await window.supabaseClient
          .from(scorecard.table_name)
          .select('id, employee_name, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, acknowledgement_status, interaction_id, submitted_at')
          .not('reversal_requested_at', 'is', null)
          .order('reversal_requested_at', { ascending: false })
          .limit(200);
        
        if (error) continue;
        
        let filtered = (auditReversals || []).filter((rev: Audit) => {
          const email = rev[reversalFilterField];
          return email && email.toLowerCase().trim() === normalizedEmail;
        });
        
        if (homeState.isAgent) {
          filtered = filtered.filter((rev: Audit) => {
            const ackStatus = rev.acknowledgement_status || rev.acknowledgementStatus || '';
            const isAcknowledged = ackStatus.toLowerCase().includes('acknowledged');
            const isPending = rev.reversal_approved === null;
            const isApproved = rev.reversal_approved === true || rev.reversal_approved === 'true' || rev.reversal_approved === 1;
            const isRejected = rev.reversal_approved === false || rev.reversal_approved === 'false' || rev.reversal_approved === 0;
            return !isAcknowledged && (isPending || isApproved || isRejected);
          });
        } else {
          filtered = filtered.filter((rev: Audit) => rev.reversal_approved === null);
        }
        
        filtered.sort((a: Audit, b: Audit) => {
          const aResp = a.reversal_responded_at ? new Date(a.reversal_responded_at).getTime() : 0;
          const bResp = b.reversal_responded_at ? new Date(b.reversal_responded_at).getTime() : 0;
          if (aResp !== bResp) return bResp - aResp;
          const aReq = new Date(a.reversal_requested_at || 0).getTime();
          const bReq = new Date(b.reversal_requested_at || 0).getTime();
          return bReq - aReq;
        });
        
        filtered.forEach((rev: Audit) => {
          const ackStatus = rev.acknowledgement_status || rev.acknowledgementStatus;
          const isAcknowledged = ackStatus && ackStatus.toLowerCase().includes('acknowledged');
          let status: string | null = null;
          
          if (ackStatus === 'Acknowledged') {
            status = 'Acknowledged';
          } else if (rev.reversal_responded_at) {
            const approved = rev.reversal_approved;
            if (approved === true || approved === 'true' || approved === 1) {
              status = 'Approved';
            } else if (approved === false || approved === 'false' || approved === 0) {
              status = 'Rejected';
            } else {
              status = 'Pending';
            }
          } else if (rev.reversal_requested_at && !rev.reversal_responded_at) {
            status = 'Pending';
          }
          
          if (status === 'Pending') {
            reversals.push({ ...rev, type: 'reversal', reversal_status: status, scorecard_table: scorecard.table_name });
          }
          
          if (status && (status === 'Approved' || status === 'Rejected') && !isAcknowledged) {
            const statusText = status === 'Approved' ? 'approved' : 'rejected';
            reversals.push({
              ...rev,
              type: 'reversal_status_update',
              reversal_status: status,
              status_text: statusText,
              timestamp: rev.reversal_responded_at || rev.reversal_requested_at,
              scorecard_table: scorecard.table_name
            });
          }
        });
      } catch (err) {
        logWarn(`Error loading reversals from ${scorecard.table_name}:`, err);
      }
    }
    
    return reversals;
  }

  private formatNotifications(assignments: Audit[], reversals: Audit[]): Notification[] {
    const notifications: Notification[] = [];
    
    assignments.forEach(assignment => {
      if (homeState.isAgent && assignment.status !== 'completed') return;
      const employee = homeState.allUsers.find(u => u.email === assignment.employee_email);
      const employeeName = employee?.name || assignment.employee_name || assignment.employee_email?.split('@')[0] || 'Unknown';
      notifications.push({
        id: `assignment-${assignment.id}`,
        type: 'assignment',
        title: `Audit ${assignment.status === 'completed' ? 'completed' : assignment.status === 'in_progress' ? 'started' : 'assigned'}`,
        message: `${employeeName} - ${assignment.employee_name || 'Audit'}`,
        timestamp: assignment.scheduled_date ? new Date(assignment.scheduled_date + 'T00:00:00').toISOString() : assignment.created_at,
        status: assignment.status,
        assignmentId: assignment.id
      });
    });
    
    reversals.forEach((reversal: Audit) => {
      if (reversal.type === 'reversal_status_update') {
        const statusDisplay = reversal.reversal_status === 'Approved' ? 'Approved' : reversal.reversal_status === 'Rejected' ? 'Rejected' : 'Updated';
        const interactionId = reversal.interaction_id || '';
        notifications.push({
          id: `reversal-status-${reversal.id}`,
          type: 'reversal_status_update',
          title: `Reversal ${statusDisplay}`,
          message: homeState.isAgent 
            ? `Your reversal request has been ${reversal.status_text || 'updated'}`
            : `Reversal request${interactionId ? ` for ${interactionId}` : ''} has been ${reversal.status_text || 'updated'}`,
          timestamp: (reversal.timestamp || reversal.reversal_responded_at) as string | undefined,
          auditId: reversal.id as string | undefined,
          tableName: (reversal.scorecard_table as string | undefined),
          status: (reversal.reversal_status as string | undefined)
        });
      } else {
        notifications.push({
          id: `reversal-${reversal.id}`,
          type: 'reversal',
          title: 'Reversal Requested',
          message: `${reversal.employee_name || reversal.employee_email || 'Audit'} - Reversal requested`,
          timestamp: reversal.reversal_requested_at as string | undefined,
          auditId: reversal.id as string | undefined,
          tableName: (reversal.scorecard_table as string | undefined)
        });
      }
    });
    
    notifications.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    return notifications;
  }

  private updateUnreadCount(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = homeState.notifications.filter(n => n.timestamp && new Date(n.timestamp).getTime() >= sevenDaysAgo.getTime());
    
    if (homeState.isAgent) {
      const reversalUpdates = recent.filter(n => n.type === 'reversal_status_update');
      homeState.unreadNotificationCount = reversalUpdates.length > 0 ? reversalUpdates.length : recent.length;
    } else {
      homeState.unreadNotificationCount = recent.length;
    }
  }

  render(): void {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    if (homeState.notifications.length === 0) {
      list.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'px-4 py-8 text-center text-gray-500 text-xs';
      safeSetHTML(emptyDiv, `
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <p class="font-medium text-gray-700 mb-1">No notifications</p>
        <p class="text-gray-500">You're all caught up!</p>
      `);
      list.appendChild(emptyDiv);
      return;
    }
    
    list.textContent = '';
    homeState.notifications.forEach(notification => {
      const item = this.createNotificationItem(notification);
      list.appendChild(item);
    });
    
    this.setupEventListeners();
  }

  private createNotificationItem(notification: Notification): HTMLElement {
    const item = document.createElement('div');
    item.className = 'px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer';
    item.setAttribute('data-action', 'handle-notification');
    item.setAttribute('data-notification-id', escapeHtml(notification.id));
    
    const timestamp = formatTimestamp(notification.timestamp);
    const { iconColor, bgColor, iconPath } = this.getNotificationStyles(notification);
    
    safeSetHTML(item, `
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${escapeHtml(iconPath)}"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-gray-900 mb-0.5">${escapeHtml(notification.title || '')}</p>
          <p class="text-xs text-gray-600 mb-1">${escapeHtml(notification.message || '')}</p>
          <p class="text-[10px] text-gray-500">${escapeHtml(timestamp)}</p>
        </div>
      </div>
    `);
    
    return item;
  }

  private getNotificationStyles(notification: Notification): { iconColor: string; bgColor: string; iconPath: string } {
    if (notification.type === 'reversal_status_update') {
      if (notification.status === 'Approved') {
        return { iconColor: 'text-success', bgColor: 'bg-success/10', iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
      } else if (notification.status === 'Rejected') {
        return { iconColor: 'text-error', bgColor: 'bg-error/10', iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' };
      } else if (notification.status === 'Acknowledged') {
        return { iconColor: 'text-primary', bgColor: 'bg-primary/10', iconPath: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' };
      }
      return { iconColor: 'text-warning', bgColor: 'bg-warning/10', iconPath: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' };
    } else if (notification.type === 'reversal') {
      return { iconColor: 'text-warning', bgColor: 'bg-warning/10', iconPath: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' };
    } else if (notification.status === 'completed') {
      return { iconColor: 'text-primary', bgColor: 'bg-primary/10', iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
    } else if (notification.status === 'in_progress') {
      return { iconColor: 'text-primary', bgColor: 'bg-primary/10', iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' };
    }
    return { iconColor: 'text-primary', bgColor: 'bg-primary/10', iconPath: 'M12 6v6m0 0v6m0-6h6m-6 0H6' };
  }

  private setupEventListeners(): void {
    document.querySelectorAll('[data-action="handle-notification"]').forEach(element => {
      if (element.hasAttribute('data-listener-attached')) return;
      element.setAttribute('data-listener-attached', 'true');
      element.addEventListener('click', () => {
        const notificationId = element.getAttribute('data-notification-id');
        if (notificationId) this.handleClick(notificationId);
      });
    });
  }

  private handleClick(notificationId: string): void {
    const notification = homeState.notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    (window as any).hideNotifications?.();
    
    if (notification.type === 'assignment' && notification.assignmentId) {
      viewAudit(notification.assignmentId);
    } else if ((notification.type === 'reversal' || notification.type === 'reversal_status_update') && notification.auditId && notification.tableName) {
      window.location.href = `audit-view.html?id=${notification.auditId}&table=${notification.tableName}`;
    }
  }

  updateBadge(): void {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    if (homeState.unreadNotificationCount > 0) {
      badge.classList.remove('hidden');
      badge.textContent = homeState.unreadNotificationCount > 9 ? '9+' : String(homeState.unreadNotificationCount);
    } else {
      badge.classList.add('hidden');
      badge.textContent = '';
    }
  }

  show(): void {
    const modal = document.getElementById('notificationsModal');
    if (!modal) return;
    homeState.unreadNotificationCount = 0;
    this.updateBadge();
    this.load();
    modal.classList.remove('opacity-0', 'invisible');
    modal.classList.add('opacity-100', 'visible');
  }

  hide(): void {
    const modal = document.getElementById('notificationsModal');
    if (!modal) return;
    modal.classList.remove('opacity-100', 'visible');
    modal.classList.add('opacity-0', 'invisible');
  }

  private showError(): void {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    list.textContent = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'px-4 py-8 text-center text-red-500 text-xs';
    errorDiv.textContent = 'Error loading notifications';
    list.appendChild(errorDiv);
  }
}

