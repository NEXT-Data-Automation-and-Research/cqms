/**
 * Statistics Renderer
 * Renders user statistics cards
 */

import type { UserStatistics } from '../domain/entities.js';
import { setTextContent } from '../../../../utils/html-sanitizer.js';

export class StatisticsRenderer {
  /**
   * Render all statistics
   */
  render(statistics: UserStatistics): void {
    this.renderStat('totalUsers', statistics.totalUsers.toString());
    this.renderStat('activeUsers', statistics.activeUsers.toString());
    this.renderStat('inactiveUsers', statistics.inactiveUsers.toString());
    this.renderStat('superAdmins', statistics.superAdmins.toString());
    this.renderStat('admins', statistics.admins.toString());
    this.renderStat('qualityAnalysts', statistics.qualityAnalysts.toString());
    this.renderStat('agents', statistics.employees.toString());
    this.renderStat('recentLogins', statistics.recentLogins.toString());
    this.renderStat('qptUsers', statistics.qptUsers.toString());
    this.renderStat('cexUsers', statistics.cexUsers.toString());

    // Update subtitles with percentages
    const totalUsers = statistics.totalUsers;
    if (totalUsers > 0) {
      const activePercentage = Math.round((statistics.activeUsers / totalUsers) * 100);
      const inactivePercentage = Math.round((statistics.inactiveUsers / totalUsers) * 100);
      const recentPercentage = Math.round((statistics.recentLogins / totalUsers) * 100);

      setTextContent(document.getElementById('activeUsersSubtitle'), `${activePercentage}% of total users`);
      setTextContent(document.getElementById('inactiveUsersSubtitle'), `${inactivePercentage}% of total users`);
      setTextContent(document.getElementById('recentLoginsSubtitle'), `${recentPercentage}% logged in recently`);
    }

    // Note: User count in table header is updated by TableRenderer, not here
  }

  /**
   * Render a single stat value
   */
  private renderStat(id: string, value: string): void {
    const element = document.getElementById(id);
    if (element) {
      setTextContent(element, value);
    }
  }
}

