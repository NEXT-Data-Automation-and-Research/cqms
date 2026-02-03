/**
 * Navigation Helpers
 * Handles navigation between audit form pages
 * Migrated from audit-form.html
 */

import { logInfo, logError } from '../../../../utils/logging-helper.js';

export class NavigationHelpers {
  /**
   * Navigate to assignment
   */
  navigateToAssignment(assignmentId: string): void {
    try {
      logInfo(`Navigating to assignment: ${assignmentId}`);
      
      // Update URL with assignment ID
      const url = new URL(window.location.href);
      url.searchParams.set('assignment', assignmentId);
      window.history.pushState({}, '', url.toString());
      
      // Reload page to load assignment
      window.location.reload();
    } catch (error) {
      logError('Error navigating to assignment:', error);
      alert('Error loading assignment. Please try again.');
    }
  }

  /**
   * View completed audit
   */
  viewCompletedAudit(auditId: string, scorecardId: string, tableName: string): void {
    try {
      logInfo(`Viewing completed audit: ${auditId}`);
      
      if (!auditId || !scorecardId || !tableName) {
        alert('Missing required information to view audit.');
        return;
      }
      
      // Navigate to audit view page
      window.location.href = `/audit-view.html?id=${auditId}&scorecard=${scorecardId}&table=${tableName}`;
    } catch (error) {
      logError('Error viewing completed audit:', error);
      alert('Error loading audit view. Please try again.');
    }
  }

  /**
   * Close audit form
   */
  async closeAuditForm(): Promise<void> {
    try {
      // Save timer state before closing
      if (typeof (window as any).saveTimerState === 'function') {
        (window as any).saveTimerState();
      }
      
      // Pause timer
      if (typeof (window as any).pauseTimer === 'function') {
        (window as any).pauseTimer();
      }
      
      // Navigate back to Create Audit page (use absolute path so it works from any route)
      window.location.href = '/create-audit';
    } catch (error) {
      logError('Error closing audit form:', error);
    }
  }
}

// Singleton instance
let navigationHelpersInstance: NavigationHelpers | null = null;

/**
 * Get navigation helpers instance
 */
export function getNavigationHelpers(): NavigationHelpers {
  if (!navigationHelpersInstance) {
    navigationHelpersInstance = new NavigationHelpers();
  }
  return navigationHelpersInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).navigateToAssignment = (assignmentId: string) => {
    getNavigationHelpers().navigateToAssignment(assignmentId);
  };
  
  (window as any).viewCompletedAudit = (auditId: string, scorecardId: string, tableName: string) => {
    getNavigationHelpers().viewCompletedAudit(auditId, scorecardId, tableName);
  };
  
  (window as any).closeAuditForm = async () => {
    await getNavigationHelpers().closeAuditForm();
  };
}

