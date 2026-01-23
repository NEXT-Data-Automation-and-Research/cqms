/**
 * Statistics Tab Renderer
 * Handles rendering and updates for the statistics tab
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';

export interface StatisticsTabRendererConfig {
  stateManager: AuditDistributionStateManager;
}

export class StatisticsTabRenderer {
  private stateManager: AuditDistributionStateManager;

  constructor(config: StatisticsTabRendererConfig) {
    this.stateManager = config.stateManager;
  }

  render(): void {
    this.renderStatistics();
  }

  private renderStatistics(): void {
    const container = document.getElementById('statisticsContent');
    if (!container) return;

    const state = this.stateManager.getState();
    const assignments = state.assignments;

    // Calculate statistics
    const totalAssigned = assignments.filter(a => a.status !== 'cancelled').length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const pending = assignments.filter(a => a.status === 'pending').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress').length;
    const cancelled = assignments.filter(a => a.status === 'cancelled').length;
    
    // Calculate progress percentage
    const progressPercentage = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    // Group by employee
    const employeeStats = new Map<string, { name: string; assigned: number; completed: number; pending: number; inProgress: number }>();
    
    assignments.forEach(assignment => {
      if (assignment.status === 'cancelled') return;
      
      const email = assignment.employee_email;
      if (!employeeStats.has(email)) {
        employeeStats.set(email, {
          name: assignment.employee_name || email,
          assigned: 0,
          completed: 0,
          pending: 0,
          inProgress: 0
        });
      }
      
      const stats = employeeStats.get(email)!;
      stats.assigned++;
      
      if (assignment.status === 'completed') {
        stats.completed++;
      } else if (assignment.status === 'pending') {
        stats.pending++;
      } else if (assignment.status === 'in_progress') {
        stats.inProgress++;
      }
    });

    // Convert to array and sort by assigned count (descending)
    const employeeStatsArray = Array.from(employeeStats.entries())
      .map(([email, stats]) => ({ email, ...stats }))
      .sort((a, b) => b.assigned - a.assigned);

    const html = `
      <div class="flex flex-col gap-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Assigned -->
          <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-600">Total Assigned</h3>
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <p class="text-3xl font-bold text-gray-900">${totalAssigned}</p>
            <p class="text-xs text-gray-500 mt-1">Active audits</p>
          </div>

          <!-- Completed -->
          <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-600">Completed</h3>
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p class="text-3xl font-bold text-green-600">${completed}</p>
            <p class="text-xs text-gray-500 mt-1">${progressPercentage}% completion rate</p>
          </div>

          <!-- In Progress -->
          <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-600">In Progress</h3>
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p class="text-3xl font-bold text-blue-600">${inProgress}</p>
            <p class="text-xs text-gray-500 mt-1">Currently being audited</p>
          </div>

          <!-- Pending -->
          <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-600">Pending</h3>
              <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p class="text-3xl font-bold text-yellow-600">${pending}</p>
            <p class="text-xs text-gray-500 mt-1">Awaiting start</p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Overall Progress</h3>
            <span class="text-sm font-medium text-gray-600">${completed} / ${totalAssigned} completed</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              class="bg-gradient-to-r from-primary to-primary-dark h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style="width: ${progressPercentage}%"
            >
              ${progressPercentage > 10 ? `<span class="text-xs font-semibold text-white">${progressPercentage}%</span>` : ''}
            </div>
          </div>
          ${progressPercentage <= 10 ? `<p class="text-xs text-gray-600 mt-2 text-right">${progressPercentage}%</p>` : ''}
        </div>

        <!-- Employee Statistics Table -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">Audit Distribution by Employee</h3>
            <p class="text-sm text-gray-600 mt-1">Breakdown of assigned audits per employee</p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employee</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Completed</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">In Progress</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Pending</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${employeeStatsArray.length > 0 ? employeeStatsArray.map(({ email, name, assigned, completed, inProgress, pending }) => {
                  const empProgress = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
                  return `
                    <tr class="hover:bg-gray-50 transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${escapeHtml(name)}</div>
                        <div class="text-xs text-gray-500">${escapeHtml(email)}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class="text-sm font-semibold text-gray-900">${assigned}</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class="text-sm font-semibold text-green-600">${completed}</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class="text-sm font-semibold text-blue-600">${inProgress}</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <span class="text-sm font-semibold text-yellow-600">${pending}</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                          <div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              class="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all"
                              style="width: ${empProgress}%"
                            ></div>
                          </div>
                          <span class="text-xs font-medium text-gray-600 w-12 text-right">${empProgress}%</span>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center">
                      <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p class="text-sm font-medium text-gray-900 mb-1">No audit assignments found</p>
                        <p class="text-xs text-gray-500">Assign audits to employees to see statistics here</p>
                      </div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    safeSetHTML(container, html);
  }

  refresh(): void {
    this.render();
  }
}

