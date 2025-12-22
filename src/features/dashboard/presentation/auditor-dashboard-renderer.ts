/**
 * Presentation Layer - Auditor Dashboard Renderer
 * Handles all UI rendering operations
 */

import type { AuditorDashboardState } from '../application/auditor-dashboard-state.js';
import type { TeamStats, StandupViewData, Scorecard } from '../domain/entities.js';

export class AuditorDashboardRenderer {
  constructor(private state: AuditorDashboardState) {}

  /**
   * Initialize UI elements
   */
  initializeUI(): void {
    // Initialize tab slider
    this.initializeTabSlider();
  }

  /**
   * Initialize tab slider
   */
  private initializeTabSlider(): void {
    const slider = document.querySelector('.tab-slider');
    const tabBar = document.querySelector('.tab-navigation');

    if (slider && tabBar) {
      (slider as HTMLElement).style.transition = 'none';
      const containerPadding = 5;
      const tabWidth = ((tabBar as HTMLElement).offsetWidth - (containerPadding * 2)) / 2;
      (slider as HTMLElement).style.left = `${containerPadding}px`;
      (slider as HTMLElement).style.width = `${tabWidth}px`;

      requestAnimationFrame(() => {
        (slider as HTMLElement).style.transition = 'all 0.3s ease';
      });
    }
  }

  /**
   * Render team stats
   */
  renderTeamStats(stats: TeamStats): void {
    this.updateStatCards(stats);
    this.renderTeamStatsTable(stats);
  }

  /**
   * Update stat cards with team stats
   */
  private updateStatCards(stats: TeamStats): void {
    // Assigned card
    const stat1Label = document.getElementById('stat1Label');
    const stat1Count = document.getElementById('stat1Count');
    const stat1Avg = document.getElementById('stat1Avg');
    const stat1Max = document.getElementById('stat1Max');
    const stat1Min = document.getElementById('stat1Min');

    if (stat1Label) stat1Label.textContent = 'ASSIGNED';
    if (stat1Count) stat1Count.textContent = stats.totalAssigned.toString();
    if (stat1Avg) {
      const avg = stats.auditorStats.length > 0
        ? Math.round((stats.auditorStats.reduce((sum, a) => sum + a.assigned, 0) / stats.auditorStats.length) * 10) / 10
        : 0;
      stat1Avg.textContent = `Avg: ${avg}`;
    }
    if (stat1Max) {
      const max = stats.auditorStats.length > 0
        ? Math.max(...stats.auditorStats.map(a => a.assigned))
        : 0;
      stat1Max.textContent = `Max: ${max}`;
    }
    if (stat1Min) {
      const min = stats.auditorStats.length > 0
        ? Math.min(...stats.auditorStats.filter(a => a.assigned > 0).map(a => a.assigned))
        : 0;
      stat1Min.textContent = `Min: ${min}`;
    }

    // Completed card
    const completedCount = document.getElementById('completedCount');
    const backlogCountText = document.getElementById('backlogCountText');
    const targetAchieved = document.getElementById('targetAchieved');
    const completedProgressBar = document.getElementById('completedProgressBar');

    if (completedCount) completedCount.textContent = stats.completed.toString();
    if (backlogCountText) {
      const parts = [];
      if (stats.totalBacklogCount > 0) {
        parts.push(`+${stats.totalBacklogCount} Backlog`);
      }
      if (stats.totalEarlyCount > 0) {
        parts.push(`+${stats.totalEarlyCount} Early`);
      }
      backlogCountText.textContent = parts.join(', ');
      backlogCountText.style.display = parts.length > 0 ? 'block' : 'none';
    }
    if (targetAchieved) targetAchieved.textContent = `${stats.percentage}% Target Achieved`;
    if (completedProgressBar) {
      const progressBarFill = completedProgressBar.querySelector('.progress-bar-fill');
      if (progressBarFill && stats.totalAssigned > 0) {
        const progressPercentage = Math.min(100, Math.round((stats.completed / stats.totalAssigned) * 100));
        (progressBarFill as HTMLElement).style.width = `${progressPercentage}%`;
        (progressBarFill as HTMLElement).style.background = this.getProgressBarColor(progressPercentage);
        completedProgressBar.style.display = 'block';
      } else {
        completedProgressBar.style.display = 'none';
      }
    }

    // Remaining card
    const remainingCount = document.getElementById('remainingCount');
    if (remainingCount) remainingCount.textContent = stats.remaining.toString();

    // Reversals card
    const stat5Label = document.getElementById('stat5Label');
    const stat5Count = document.getElementById('stat5Count');
    const stat5Card = document.getElementById('stat5Card');

    if (stat5Label) stat5Label.textContent = 'REVERSALS';
    if (stat5Count) stat5Count.textContent = stats.teamReversalCount.toString();
    if (stat5Card) {
      stat5Card.style.backgroundColor = stats.teamReversalCount > 0 ? '#dc2626' : 'var(--dark-forest)';
    }

    // Avg Duration card
    const stat6Label = document.getElementById('stat6Label');
    const stat6Count = document.getElementById('stat6Count');
    const stat6Subtitle = document.getElementById('stat6Subtitle');

    if (stat6Label) stat6Label.textContent = 'AVG DURATION';
    if (stat6Count) stat6Count.textContent = stats.avgDurationText;
    if (stat6Subtitle) stat6Subtitle.textContent = stats.avgDurationSubtitle;

    // Passing Rate card
    const stat7Label = document.getElementById('stat7Label');
    const stat7Count = document.getElementById('stat7Count');
    const stat7PassingCount = document.getElementById('stat7PassingCount');
    const stat7NotPassingCount = document.getElementById('stat7NotPassingCount');

    if (stat7Label) stat7Label.textContent = 'PASSING RATE';
    if (stat7Count) stat7Count.textContent = `${stats.teamPassingRate}%`;
    if (stat7PassingCount) {
      const span = stat7PassingCount.querySelector('span');
      if (span) span.textContent = `${stats.teamPassingCount} Passed`;
    }
    if (stat7NotPassingCount) {
      const span = stat7NotPassingCount.querySelector('span');
      if (span) span.textContent = `${stats.teamNotPassingCount} Not Passed`;
    }
  }

  /**
   * Render team stats table
   */
  private renderTeamStatsTable(stats: TeamStats): void {
    const tableBody = document.getElementById('performanceTableBody');
    if (!tableBody) return;

    if (stats.auditorStats.length === 0) {
      tableBody.innerHTML = `
        <div class="loading-indicator">
          No auditors found with assignments in the selected date range.
        </div>
      `;
      return;
    }

    tableBody.innerHTML = stats.auditorStats.map(auditor => {
      const backlogTooltip = auditor.backlogCovered > 0 && auditor.backlogDates.length > 0
        ? `${auditor.backlogCovered} backlog covered from ${auditor.backlogDates.join(', ')}`
        : '';
      const earlyTooltip = auditor.earlyCovered > 0 && auditor.earlyDates.length > 0
        ? `${auditor.earlyCovered} early completed for ${auditor.earlyDates.join(', ')}`
        : '';

      const isOnline = this.state.onlineAuditors.has(auditor.email);

      return `
        <div class="performance-table-row ${auditor.isCurrentUser ? 'current-user' : ''}" data-auditor-email="${this.escapeHtml(auditor.email)}">
          <div class="performance-table-cell" data-label="Name">
            ${this.escapeHtml(auditor.name)}${auditor.isCurrentUser ? ' <span style="color: var(--primary-color); font-size: var(--font-xs);">(You)</span>' : ''}
            ${isOnline ? '<span class="online-indicator" title="Online"></span>' : ''}
          </div>
          <div class="performance-table-cell" data-label="Assigned" style="text-align: center;">${auditor.assigned}</div>
          <div class="performance-table-cell" data-label="Completed" style="text-align: center;">
            <div style="display: inline-flex; align-items: baseline; gap: 0.25rem; flex-wrap: wrap; justify-content: center;">
              <span>${auditor.completed}</span>
              ${auditor.earlyCovered > 0 ? `<span style="font-size: var(--font-xs); color: var(--success-color); font-weight: 600; cursor: help;" title="${this.escapeHtml(earlyTooltip)}">+${auditor.earlyCovered} Early</span>` : ''}
              ${auditor.backlogCovered > 0 ? `<span style="font-size: var(--font-xs); color: var(--warning-color); font-weight: 600; cursor: help;" title="${this.escapeHtml(backlogTooltip)}">+${auditor.backlogCovered} Backlog</span>` : ''}
            </div>
          </div>
          <div class="performance-table-cell" data-label="Remaining" style="text-align: center;">${auditor.remaining}</div>
          <div class="performance-table-cell" data-label="Avg Duration" style="text-align: center;">${auditor.avgDuration}</div>
          <div class="performance-table-cell" data-label="Progress" style="text-align: center;">
            <div style="display: flex; align-items: center; gap: 0.75rem; justify-content: center;">
              <span style="font-size: var(--font-xs); font-weight: 600; color: var(--text-color); min-width: 1.875rem;">${auditor.percentage}%</span>
              <div style="flex: 1; height: 0.5625rem; background-color: var(--dark-forest); border-radius: var(--radius-sm); overflow: hidden; position: relative; max-width: 5rem;">
                <div style="height: 100%; background: ${this.getProgressBarColor(auditor.percentage)}; border-radius: var(--radius-sm); transition: width 0.3s ease; width: ${auditor.percentage}%;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render standup view
   */
  renderStandupView(data: StandupViewData): void {
    this.updateStandupStatCards(data);
    this.renderStandupTable(data);
  }

  /**
   * Update stat cards for standup view
   */
  private updateStandupStatCards(data: StandupViewData): void {
    const stat1Count = document.getElementById('stat1Count');
    const completedCount = document.getElementById('completedCount');
    const remainingCount = document.getElementById('remainingCount');
    const targetAchieved = document.getElementById('targetAchieved');
    const completedProgressBar = document.getElementById('completedProgressBar');

    if (stat1Count) stat1Count.textContent = data.totalAssigned.toString();
    if (completedCount) completedCount.textContent = data.completed.toString();
    if (remainingCount) {
      const remaining = data.totalAssigned - data.completed;
      remainingCount.textContent = remaining.toString();
    }
    if (targetAchieved) targetAchieved.textContent = `${data.percentage}% Target Achieved`;
    if (completedProgressBar) {
      const progressBarFill = completedProgressBar.querySelector('.progress-bar-fill');
      if (progressBarFill && data.totalAssigned > 0) {
        (progressBarFill as HTMLElement).style.width = `${data.coveragePercent}%`;
        (progressBarFill as HTMLElement).style.background = this.getProgressBarColor(data.coveragePercent);
        completedProgressBar.style.display = 'block';
      } else {
        completedProgressBar.style.display = 'none';
      }
    }
  }

  /**
   * Render standup table
   */
  private renderStandupTable(data: StandupViewData): void {
    const tableBody = document.getElementById('performanceTableBody');
    if (!tableBody) return;

    if (!data.channelStats || Object.keys(data.channelStats).length === 0) {
      tableBody.innerHTML = '<div class="loading-indicator">No channel data available</div>';
      return;
    }

    const sortedChannels = Object.keys(data.channelStats).sort();
    tableBody.innerHTML = sortedChannels.map(channel => {
      const stats = data.channelStats[channel];
      return `
        <div class="performance-table-row">
          <div class="performance-table-cell" data-label="Channel">${this.escapeHtml(channel)}</div>
          <div class="performance-table-cell" data-label="Assigned">${stats.assigned || 0}</div>
          <div class="performance-table-cell" data-label="Completed">${stats.completed || 0}</div>
          <div class="performance-table-cell" data-label="Remaining">${stats.remaining || 0}</div>
          <div class="performance-table-cell" data-label="Progress">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: var(--font-xs); font-weight: 600; color: var(--text-color); min-width: 1.875rem;">${stats.percentage || 0}%</span>
              <div style="flex: 1; height: 0.5625rem; background-color: var(--dark-forest); border-radius: var(--radius-sm); overflow: hidden; position: relative;">
                <div style="height: 100%; background: ${this.getProgressBarColor(stats.percentage || 0)}; border-radius: var(--radius-sm); transition: width 0.3s ease; width: ${stats.percentage || 0}%;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Populate scorecard filter
   */
  populateScorecardFilter(scorecards: Scorecard[]): void {
    const scorecardFilter = document.getElementById('scorecardFilter');
    if (!scorecardFilter) return;

    const existingValue = (scorecardFilter as HTMLSelectElement).value;
    scorecardFilter.innerHTML = '<option value="">All Scorecards</option>';

    scorecards.forEach(scorecard => {
      const option = document.createElement('option');
      option.value = scorecard.id;
      option.textContent = scorecard.name;
      scorecardFilter.appendChild(option);
    });

    if (existingValue) {
      (scorecardFilter as HTMLSelectElement).value = existingValue;
    }
  }

  /**
   * Show loading state
   */
  showLoadingState(): void {
    const tableBody = document.getElementById('performanceTableBody');
    if (tableBody && !tableBody.querySelector('.loading-indicator')) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading-indicator';
      loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <div style="margin-top: var(--spacing-md); font-size: var(--font-xs);">Loading...</div>
      `;
      tableBody.innerHTML = '';
      tableBody.appendChild(loadingDiv);
    }

    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      (card as HTMLElement).style.opacity = '0.6';
    });
  }

  /**
   * Hide loading state
   */
  hideLoadingState(): void {
    const tableBody = document.getElementById('performanceTableBody');
    if (tableBody) {
      const loadingIndicator = tableBody.querySelector('.loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
    }

    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      (card as HTMLElement).style.opacity = '1';
    });
  }

  /**
   * Update online status indicators
   */
  updateOnlineStatusIndicators(): void {
    const tableBody = document.getElementById('performanceTableBody');
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('[data-auditor-email]');
    rows.forEach(row => {
      const auditorEmail = (row as HTMLElement).dataset.auditorEmail;
      const nameCell = row.querySelector('[data-label="Name"]');

      if (nameCell && auditorEmail) {
        if (this.state.onlineAuditors.has(auditorEmail)) {
          let indicator = nameCell.querySelector('.online-indicator');
          if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'online-indicator';
            indicator.setAttribute('title', 'Online');
            nameCell.appendChild(indicator);
          }
        } else {
          const indicator = nameCell.querySelector('.online-indicator');
          if (indicator) {
            indicator.remove();
          }
        }
      }
    });
  }

  /**
   * Get progress bar color based on percentage
   */
  private getProgressBarColor(percentage: number): string {
    if (percentage <= 33) {
      return 'linear-gradient(90deg, var(--error-color, #ef4444), #f87171)';
    } else if (percentage <= 66) {
      return 'linear-gradient(90deg, var(--warning-color, #f59e0b), #fbbf24)';
    } else {
      return 'linear-gradient(90deg, var(--success-color, #10b981), #34d399)';
    }
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

