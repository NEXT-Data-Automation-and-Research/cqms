/**
 * Assigned Audit Starter Controller
 * Handles starting an audit from an assigned audit assignment
 * Migrated from audit-form.html startAssignedAudit()
 */

import { logInfo, logError } from '../../../../utils/logging-helper.js';
import { DatabaseFactory } from '../../../../infrastructure/database-factory.js';
import { getDropdownLoader } from '../utils/dropdown-loader.js';
import { ScorecardController } from './scorecard-controller.js';
import { AuditFormService } from '../../application/audit-form-service.js';
import { AuditFormRepository } from '../../infrastructure/audit-form-repository.js';

export class AssignedAuditStarter {
  /**
   * Start an assigned audit
   */
  async startAssignedAudit(
    assignmentId: string,
    employeeEmail: string,
    scorecardId: string
  ): Promise<void> {
    try {
      const db = DatabaseFactory.createClient();
      
      // Update assignment status to 'in_progress'
      const { error: updateError } = await db
        .from('audit_assignments')
        .update({ status: 'in_progress' })
        .eq('id', assignmentId)
        .execute();
      
      if (updateError) throw updateError;
      
      // Set assignment mode
      if (typeof window !== 'undefined') {
        (window as any).isEditingPendingAudit = false;
        (window as any).currentEditingAuditId = null;
        (window as any).currentAssignmentId = assignmentId;
      }
      
      // Hide the assigned audits section
      const pendingAuditsSection = document.getElementById('pendingAuditsSection');
      if (pendingAuditsSection) {
        pendingAuditsSection.style.display = 'none';
      }
      
      // Show the full screen audit form modal
      const auditFormModal = document.getElementById('auditFormModal');
      if (auditFormModal) {
        auditFormModal.style.display = 'flex';
      }
      
      // Auto-select the scorecard from assignment
      const scorecardSelect = document.getElementById('scorecardSelect') as HTMLSelectElement;
      
      if (scorecardSelect && scorecardId) {
        // Load scorecards using window function (backward compatibility)
        if (typeof window !== 'undefined' && (window as any).loadScorecards) {
          await (window as any).loadScorecards();
        }
        // Then select the assigned scorecard
        scorecardSelect.value = scorecardId;
        // Load the scorecard parameters
        if (typeof window !== 'undefined' && (window as any).loadScorecardParameters) {
          await (window as any).loadScorecardParameters(scorecardId);
        }
      } else if (scorecardSelect) {
        // If no scorecard ID provided, auto-select first available
        if (typeof window !== 'undefined' && (window as any).loadScorecards) {
          await (window as any).loadScorecards();
        }
      }
      
      // Pre-fill employee information
      const dropdownLoader = getDropdownLoader();
      await dropdownLoader.loadEmployees();
      
      const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
      if (employeeSelect && employeeEmail) {
        for (let i = 0; i < employeeSelect.options.length; i++) {
          if ((employeeSelect.options[i] as any).dataset.email === employeeEmail) {
            employeeSelect.selectedIndex = i;
            // Trigger change event to populate other fields
            employeeSelect.dispatchEvent(new Event('change'));
            break;
          }
        }
      }
      
      // Scroll to top to show scorecard selector
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Show and start the timer
      const auditTimer = document.getElementById('auditTimer');
      if (auditTimer) {
        auditTimer.style.display = 'flex';
        // Attach event listeners when timer is shown
        if (typeof window !== 'undefined' && (window as any).attachTimerEventListeners) {
          (window as any).attachTimerEventListeners();
        }
      }
      
      // Reset and start the timer
      if (typeof window !== 'undefined') {
        if ((window as any).resetTimer && (window as any).startTimer) {
          (window as any).resetTimer();
          (window as any).startTimer();
        }
      }
      
      // Show notification
      this.showNotification('Audit started! Scorecard & employee info pre-filled.');
      
      // Reload pending audits to update the UI
      if (typeof window !== 'undefined' && (window as any).loadPendingAudits) {
        await (window as any).loadPendingAudits();
      }
      
    } catch (error) {
      logError('Error starting assigned audit:', error);
      await this.showDialog({
        title: 'Error',
        message: `Failed to start audit: ${(error as Error).message}`,
        confirmText: 'OK',
        type: 'error'
      });
    }
  }

  /**
   * Show notification
   */
  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 2.4258rem;
      right: 0.6064rem;
      background: linear-gradient(135deg, #1A733E, #15582E);
      color: white;
      padding: 0.6469rem 0.9704rem;
      border-radius: 0.3234rem;
      box-shadow: 0 0.1213rem 0.3639rem rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-size: 0.5659rem;
      font-weight: 600;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Show dialog
   */
  private async showDialog(options: {
    title: string;
    message: string;
    confirmText: string;
    type: string;
  }): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).confirmationDialog) {
      await (window as any).confirmationDialog.show(options);
    } else {
      alert(`${options.title}: ${options.message}`);
    }
  }
}

// Singleton instance
let assignedAuditStarterInstance: AssignedAuditStarter | null = null;

/**
 * Get assigned audit starter instance
 */
export function getAssignedAuditStarter(): AssignedAuditStarter {
  if (!assignedAuditStarterInstance) {
    assignedAuditStarterInstance = new AssignedAuditStarter();
  }
  return assignedAuditStarterInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).startAssignedAudit = async (
    assignmentId: string,
    employeeEmail: string,
    scorecardId: string
  ) => {
    await getAssignedAuditStarter().startAssignedAudit(assignmentId, employeeEmail, scorecardId);
  };
}

