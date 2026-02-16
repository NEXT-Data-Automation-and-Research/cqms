/**
 * Performance Analytics Service
 * Orchestrates data loading and access (Super Admin vs own)
 */

import { PerformanceAnalyticsRepository } from '../infrastructure/performance-analytics-repository.js';
import type { PerformanceFilters, PerformanceAnalyticsData, ErrorBucket } from '../domain/types.js';

export class PerformanceAnalyticsService {
  private repo = new PerformanceAnalyticsRepository();

  async loadAnalytics(
    userEmail: string | null,
    filters: PerformanceFilters
  ): Promise<PerformanceAnalyticsData> {
    return this.repo.getAnalytics(userEmail, filters);
  }

  /** Parameter-wise error counts for a single agent (for agent modal). */
  async getParameterErrorBreakdownForAgent(
    filters: PerformanceFilters,
    employeeEmail: string
  ): Promise<ErrorBucket[]> {
    return this.repo.fetchParameterErrorBreakdownForAgent(filters, employeeEmail);
  }
}
