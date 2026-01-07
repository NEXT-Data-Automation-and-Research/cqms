/**
 * Schedule Audit View Component
 * Placeholder view for scheduled audit functionality
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export class ScheduleAuditView {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="px-4 py-6 max-w-7xl mx-auto w-full">
        <div class="flex flex-col items-center justify-center min-h-[60vh]">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">Schedule Audit</h2>
            <p class="text-sm text-gray-600 mb-6">
              This feature is coming soon. You'll be able to schedule audits in advance and manage recurring audit assignments.
            </p>
            <div class="flex flex-col gap-2 text-xs text-gray-500">
              <p>• Schedule audits for specific dates</p>
              <p>• Set up recurring audit schedules</p>
              <p>• Manage scheduled audit assignments</p>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  update(): void {
    // Placeholder - no updates needed for now
  }
}

