/**
 * Performance Analytics Service
 * Orchestrates data loading and access (Super Admin vs own)
 */

import { PerformanceAnalyticsRepository } from '../infrastructure/performance-analytics-repository.js';
import type { PerformanceFilters, PerformanceAnalyticsData } from '../domain/types.js';

export class PerformanceAnalyticsService {
  private repo = new PerformanceAnalyticsRepository();

  async loadAnalytics(
    userEmail: string | null,
    filters: PerformanceFilters
  ): Promise<PerformanceAnalyticsData> {
    return this.repo.getAnalytics(userEmail, filters);
  }
}
