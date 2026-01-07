/**
 * Action Handlers Module
 * Handles filter, date, and sort actions for the dashboard
 */

import { DateFilterManager } from '../date-filter-manager.js';
import { homeState } from '../state.js';
import { AuditRenderer } from './audit-renderer.js';
import { UpdatesLoader } from './updates-loader.js';
import { UpdatesRenderer } from './updates-renderer.js';
import { StatsCalculator } from './stats-calculator.js';
import { StatsRenderer } from './stats-renderer.js';
import { AuditLoader } from './audit-loader.js';
import { NotificationManager } from './notification-manager.js';

export class ActionHandlers {
  constructor(
    private dateFilterManager: DateFilterManager,
    private updatesLoader: UpdatesLoader,
    private updatesRenderer: UpdatesRenderer,
    private statsCalculator: StatsCalculator,
    private statsRenderer: StatsRenderer,
    private auditLoader: AuditLoader,
    private auditRenderer: AuditRenderer,
    private notificationManager: NotificationManager
  ) {}

  applyFilters(): void {
    const channelSelect = document.getElementById('filterChannel') as HTMLSelectElement | null;
    const statusSelect = document.getElementById('filterStatus') as HTMLSelectElement | null;
    const agentSelect = document.getElementById('filterAgent') as HTMLSelectElement | null;
    
    homeState.currentFilters.channel = channelSelect ? channelSelect.value : '';
    homeState.currentFilters.status = statusSelect ? statusSelect.value : '';
    homeState.currentFilters.agent = agentSelect ? agentSelect.value : '';
    
    this.refreshDashboard();
  }

  applyDateFilter(): void {
    this.dateFilterManager.applyDateFilter(() => {
      this.refreshDashboard();
    });
  }

  clearDateFilter(): void {
    this.dateFilterManager.clearDateFilter(() => {
      this.refreshDashboard();
    });
  }

  sortAssignedAudits(): void {
    const select = document.getElementById('auditSortBy') as HTMLSelectElement | null;
    if (select) {
      homeState.sortBy = select.value;
      this.auditRenderer.render(homeState.assignedAudits, homeState.allUsers);
    }
  }

  toggleSortMenu(): void {
    const menu = document.getElementById('sortMenu');
    if (menu) menu.classList.toggle('hidden');
  }

  private async refreshDashboard(): Promise<void> {
    const period = this.dateFilterManager.getCurrentPeriodDates();
    await Promise.all([
      this.loadRecentUpdates(period),
      this.updateStats(period),
      this.loadAssignedAudits(period),
      this.notificationManager.load()
    ]);
  }

  private async loadRecentUpdates(period: any): Promise<void> {
    const updates = await this.updatesLoader.loadRecentUpdates(period, homeState.allUsers);
    this.updatesRenderer.render(updates);
  }

  private async updateStats(period: any): Promise<void> {
    const stats = await this.statsCalculator.calculate(period);
    this.statsRenderer.render(stats);
  }

  private async loadAssignedAudits(period: any): Promise<void> {
    await this.auditLoader.loadAssignedAudits(period, homeState.currentFilters);
    this.auditRenderer.render(homeState.assignedAudits, homeState.allUsers);
  }
}

