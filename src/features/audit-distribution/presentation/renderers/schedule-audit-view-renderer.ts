/**
 * Schedule Audit View Renderer
 * Handles rendering of the schedule audit view with scheduling functionality
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { AssignmentTabRenderer } from './assignment-tab-renderer.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';

export interface ScheduleAuditViewRendererConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
}

export class ScheduleAuditViewRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService;
  private assignmentTabRenderer: AssignmentTabRenderer | null = null;

  constructor(config: ScheduleAuditViewRendererConfig) {
    this.stateManager = config.stateManager;
    this.service = config.service;
  }

  render(container: HTMLElement): void {
    try {
      const state = this.stateManager.getState();
      logInfo('[ScheduleAuditView] Rendering', { hasState: !!state });
      
      safeSetHTML(container, this.getViewHTML());

      // Initialize asynchronously to load data
      this.initializeScheduleView().then(() => {
        logInfo('[ScheduleAuditView] Initialization complete');
      }).catch((error) => {
        logError('[ScheduleAuditView] Error during initialization:', error);
      });
      
      logInfo('[ScheduleAuditView] Rendering complete');
    } catch (error) {
      logError('[ScheduleAuditView] Error rendering:', error);
      safeSetHTML(container, this.getErrorHTML(error));
    }
  }

  private getViewHTML(): string {
    return `
      <div class="px-4 py-4 max-w-7xl mx-auto w-full">
        <!-- Schedule Configuration Section -->
        <div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Schedule Configuration</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <!-- Schedule Date (Required) -->
            <div>
              <label class="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                <span class="text-red-500 text-xs">*</span>
                <span>Schedule Date</span>
              </label>
              <input
                type="date"
                id="scheduleDateInput"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-gray-900"
                min="${new Date().toISOString().split('T')[0]}"
                required
              />
            </div>
            
            <!-- Recurring Schedule -->
            <div>
              <label class="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                <span>Recurring Schedule</span>
              </label>
              <select
                id="recurringScheduleSelect"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-gray-900"
              >
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          
          <!-- Recurring Options (hidden by default) -->
          <div id="recurringOptionsContainer" class="hidden mb-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-semibold text-gray-900 mb-2 block">End Date (Optional)</label>
                <input
                  type="date"
                  id="recurringEndDateInput"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-gray-900"
                  min="${new Date().toISOString().split('T')[0]}"
                />
              </div>
              <div>
                <label class="text-xs font-semibold text-gray-900 mb-2 block">Number of Occurrences</label>
                <input
                  type="number"
                  id="recurringOccurrencesInput"
                  min="1"
                  max="365"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-gray-900"
                  placeholder="Leave empty for no limit"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="flex gap-4 min-h-[500px] max-h-[calc(100vh-300px)]">
          <!-- Employee List - Left Side -->
          <div class="flex flex-col flex-1 min-w-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="px-4 pt-4 pb-3 border-b border-gray-200 flex-shrink-0">
              <div class="flex items-center justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <h2 class="text-lg font-bold text-gray-900 m-0 mb-0.5">People</h2>
                  <p class="text-xs text-gray-600 m-0 font-medium">Select team members for scheduled audit assignment</p>
                </div>
                <!-- Filter Bar -->
                <div id="filterBarContainer" class="flex-shrink-0 max-w-[300px]"></div>
              </div>
            </div>
            <div class="px-4 py-3 flex-1 min-h-0 flex flex-col overflow-hidden">
              <!-- Selection Actions -->
              <div id="selectionActionsContainer" class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 flex-shrink-0"></div>
              <div id="employeeListContent" class="flex-1 min-h-0 overflow-y-auto overflow-x-visible"></div>
              <div id="paginationBottomContainer" class="flex-shrink-0 mt-3 pt-3 border-t border-gray-200"></div>
            </div>
          </div>
          
          <!-- Auditor Selection Pane - Right Side -->
          <div id="auditorModalContainer" class="flex-shrink-0 w-0 transition-all duration-300 overflow-hidden"></div>
        </div>

        <!-- Scheduled Audits List -->
        <div class="mt-4 bg-white rounded-xl border border-gray-200">
          <div class="px-4 pt-4 pb-3 border-b border-gray-200">
            <h2 class="text-lg font-bold text-gray-900 m-0">Scheduled Audits</h2>
            <p class="text-xs text-gray-600 m-0 mt-1">View and manage your scheduled audit assignments</p>
          </div>
          <div id="scheduledAuditsContent" class="p-4">
            <!-- Scheduled audits will be loaded here -->
            <div class="text-center py-8 text-gray-500 text-sm">
              No scheduled audits yet. Create a schedule above to get started.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getErrorHTML(error: unknown): string {
    return `
      <div class="p-8 text-center">
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto">
          <h3 class="text-red-400 font-semibold mb-2">Error Rendering Schedule Audit View</h3>
          <p class="text-red-300 text-sm">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
        </div>
      </div>
    `;
  }

  private async initializeScheduleView(): Promise<void> {
    // Load assignments to show scheduled audits
    try {
      await this.service.loadAssignments();
    } catch (error) {
      logError('[ScheduleAuditView] Error loading assignments:', error);
    }

    // Initialize the assignment tab renderer (reuse for employee/auditor selection)
    this.assignmentTabRenderer = new AssignmentTabRenderer({
      stateManager: this.stateManager,
      service: this.service,
      onEmployeeListUpdate: () => {
        // Refresh scheduled audits when employees are updated
        this.updateScheduledAudits();
      },
      onAssignmentComplete: () => {
        // Refresh scheduled audits when new assignments are created
        this.updateScheduledAudits();
      }
    });
    this.assignmentTabRenderer.render();

    // Set up schedule date change handler
    const scheduleDateInput = document.getElementById('scheduleDateInput') as HTMLInputElement;
    if (scheduleDateInput) {
      scheduleDateInput.addEventListener('change', (e) => {
        const dateValue = (e.target as HTMLInputElement).value;
        if (dateValue) {
          const date = new Date(dateValue);
          this.stateManager.setScheduledDate(date);
          // Update the assignment tab renderer's scheduled date
          if (this.assignmentTabRenderer) {
            // The assignment tab renderer will pick up the state change
            this.assignmentTabRenderer.refresh();
          }
        }
      });
    }

    // Set up recurring schedule change handler
    const recurringSelect = document.getElementById('recurringScheduleSelect') as HTMLSelectElement;
    const recurringOptionsContainer = document.getElementById('recurringOptionsContainer');
    
    if (recurringSelect && recurringOptionsContainer) {
      recurringSelect.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        if (value === 'none') {
          recurringOptionsContainer.classList.add('hidden');
        } else {
          recurringOptionsContainer.classList.remove('hidden');
        }
      });
    }

    // Load scheduled audits
    this.updateScheduledAudits();
  }

  private async updateScheduledAudits(): Promise<void> {
    const container = document.getElementById('scheduledAuditsContent');
    if (!container) return;

    try {
      const state = this.stateManager.getState();
      // Filter assignments that have a scheduled_date in the future
      const scheduledAssignments = state.assignments.filter(assignment => {
        if (!assignment.scheduled_date) return false;
        const scheduledDate = new Date(assignment.scheduled_date);
        return scheduledDate >= new Date();
      });

      if (scheduledAssignments.length === 0) {
        safeSetHTML(container, `
          <div class="text-center py-8 text-gray-500 text-sm">
            No scheduled audits yet. Create a schedule above to get started.
          </div>
        `);
        return;
      }

      // Group by scheduled date
      const groupedByDate = new Map<string, typeof scheduledAssignments>();
      scheduledAssignments.forEach(assignment => {
        const dateKey = assignment.scheduled_date || 'Unknown';
        if (!groupedByDate.has(dateKey)) {
          groupedByDate.set(dateKey, []);
        }
        groupedByDate.get(dateKey)!.push(assignment);
      });

      const sortedDates = Array.from(groupedByDate.keys()).sort();

      const html = `
        <div class="space-y-4">
          ${sortedDates.map(dateKey => {
            const assignments = groupedByDate.get(dateKey)!;
            const date = new Date(dateKey);
            const formattedDate = date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });

            return `
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-sm font-semibold text-gray-900">${escapeHtml(formattedDate)}</h3>
                  <span class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    ${assignments.length} assignment${assignments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div class="space-y-2">
                  ${assignments.map(assignment => {
                    const employee = state.employees.find(e => e.email === assignment.employee_email);
                    const auditor = state.auditors.find(a => a.email === assignment.auditor_email);
                    
                    return `
                      <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                        <div class="flex items-center gap-3">
                          <span class="font-medium text-gray-900">${escapeHtml(employee?.name || assignment.employee_email)}</span>
                          <span class="text-gray-400">→</span>
                          <span class="text-gray-700">${escapeHtml(auditor?.name || assignment.auditor_email)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-gray-600">${assignment.status || 'Pending'}</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      safeSetHTML(container, html);
    } catch (error) {
      logError('[ScheduleAuditView] Error loading scheduled audits:', error);
      safeSetHTML(container, `
        <div class="text-center py-8 text-red-500 text-sm">
          Error loading scheduled audits. Please try again.
        </div>
      `);
    }
  }

  refresh(): void {
    this.assignmentTabRenderer?.refresh();
    this.updateScheduledAudits();
  }
}
