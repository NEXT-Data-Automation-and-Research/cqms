/**
 * Bulk Edit Handler
 * Handles bulk user edit operations
 */

import { UserManagementService } from '../application/user-management-service.js';
import { BulkActionsManager } from './bulk-actions.js';
import { userManagementState } from './state.js';
import { logError } from '../../../../utils/logging-helper.js';
import { getUserFriendlyErrorMessage } from '../../../../utils/error-sanitizer.js';

declare global {
  interface Window {
    confirmationDialog?: {
      show: (options: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        type?: 'success' | 'error' | 'warning' | 'info';
      }) => Promise<boolean>;
    };
  }
}

export class BulkEditHandler {
  constructor(
    private service: UserManagementService,
    private bulkActionsManager: BulkActionsManager,
    private loadInitialData: () => Promise<void>
  ) {}

  /**
   * Apply bulk edit
   */
  async applyBulkEdit(): Promise<void> {
    const state = userManagementState.getState();
    const selectedEmails = Array.from(state.selectedUsers);

    if (selectedEmails.length === 0) {
      alert('Please select at least one user to edit.');
      return;
    }

    const bulkData = this.bulkActionsManager.getBulkEditData();
    const hasChanges = Object.values(bulkData).some(v => v !== undefined);

    if (!hasChanges) {
      alert('Please select at least one field to update.');
      return;
    }

    // Show confirmation dialog
    if (window.confirmationDialog) {
      let message = `Are you sure you want to update ${selectedEmails.length} user${selectedEmails.length !== 1 ? 's' : ''}?\n\n`;
      message += 'Changes to be applied:\n';
      if (bulkData.team) message += `• Team: ${bulkData.team}\n`;
      if (bulkData.department) message += `• Department: ${bulkData.department}\n`;
      if (bulkData.channel) message += `• Channel: ${bulkData.channel}\n`;
      if (bulkData.teamSupervisor) {
        const supervisor = state.allUsers.find(u => u.email === bulkData.teamSupervisor);
        message += `• Team Supervisor: ${supervisor ? supervisor.name : bulkData.teamSupervisor}\n`;
      }
      if (bulkData.qualitySupervisor) {
        const supervisor = state.allUsers.find(u => u.email === bulkData.qualitySupervisor);
        message += `• Quality Mentor: ${supervisor ? supervisor.name : bulkData.qualitySupervisor}\n`;
      }
      if (bulkData.role) message += `• Role: ${bulkData.role}\n`;

      const confirmed = await window.confirmationDialog.show({
        title: 'Confirm Bulk Update',
        message: message,
        confirmText: 'Apply Changes',
        cancelText: 'Cancel',
        type: 'warning'
      });

      if (!confirmed) return;
    }

    try {
      await this.service.bulkUpdateUsers(selectedEmails, bulkData);
      userManagementState.clearSelections();
      this.bulkActionsManager.resetBulkEditForm();
      await this.loadInitialData();

      if (window.confirmationDialog) {
        await window.confirmationDialog.show({
          title: 'Bulk Update Successful',
          message: `Successfully updated ${selectedEmails.length} user${selectedEmails.length !== 1 ? 's' : ''}.`,
          confirmText: 'OK',
          cancelText: 'Close',
          type: 'success'
        });
      }
    } catch (error) {
      logError('[BulkEditHandler] Error applying bulk edit:', error);
      const errorMessage = getUserFriendlyErrorMessage(error, 'apply bulk edit');
      if (window.confirmationDialog) {
        await window.confirmationDialog.show({
          title: 'Error',
          message: errorMessage,
          confirmText: 'OK',
          cancelText: 'Close',
          type: 'error'
        });
      } else {
        alert(errorMessage);
      }
    }
  }
}

