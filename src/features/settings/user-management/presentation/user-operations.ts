/**
 * User Operations Handler
 * Handles create and update user operations
 */

import { ModalManager } from './modal-manager.js';
import { UserManagementService } from '../application/user-management-service.js';
import { userManagementState } from './state.js';
import { logError } from '../../../../utils/logging-helper.js';
import { escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getUserFriendlyErrorMessage } from '../../../../utils/error-sanitizer.js';
import type { UpdateUserData, UserRole } from '../domain/types.js';

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

export class UserOperationsHandler {
  constructor(
    private service: UserManagementService,
    private modalManager: ModalManager,
    private loadInitialData: () => Promise<void>
  ) {}

  /**
   * Save user changes (edit)
   */
  async saveUserChanges(): Promise<void> {
    const email = (document.getElementById('editUserId') as HTMLInputElement)?.value;
    if (!email) {
      alert('User email not found');
      return;
    }

    const intercomAdminId = (document.getElementById('editUserIntercomAdmin') as HTMLSelectElement)?.value;
    const state = userManagementState.getState();
    const selectedAdmin = state.intercomAdmins.find(a => a.id.toString() === intercomAdminId);

    const departmentValue = (document.getElementById('editUserDepartment') as HTMLSelectElement)?.value;
    const channelValue = (document.getElementById('editUserChannel') as HTMLSelectElement)?.value;
    const teamValue = (document.getElementById('editUserTeam') as HTMLInputElement)?.value;
    const teamSupervisorValue = (document.getElementById('editUserTeamSupervisor') as HTMLSelectElement)?.value;
    const qualityMentorValue = (document.getElementById('editUserQualitySupervisor') as HTMLSelectElement)?.value;
    const designationValue = (document.getElementById('editUserDesignation') as HTMLSelectElement)?.value;
    const employeeIdValue = (document.getElementById('editUserEmployeeId') as HTMLInputElement)?.value;
    const countryValue = (document.getElementById('editUserCountry') as HTMLSelectElement)?.value;

    // Convert channel ID to name (database stores channel names, not IDs)
    let channelName: string | null = null;
    if (channelValue) {
      const channel = state.channels.find(c => c.id === channelValue);
      channelName = channel ? channel.name : channelValue; // Fallback to value if not found
    }

    // Validate form before submission
    const { validateForm } = await import('../../../../utils/form-validation.js');
    const validation = validateForm('editUserForm');
    
    if (!validation.isValid) {
      // Show specific error messages
      if (validation.errors.length > 0) {
        const errorMessages = validation.errors.join('\n');
        alert(`Please fix the following errors:\n\n${errorMessages}`);
      }
      
      // Validation errors are already shown on individual fields
      // Scroll to first error field
      const firstErrorField = document.querySelector('input[style*="border-color: rgb(239, 68, 68)"], select[style*="border-color: rgb(239, 68, 68)"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      return;
    }

    const updateData: UpdateUserData = {
      name: (document.getElementById('editUserName') as HTMLInputElement)?.value,
      role: (document.getElementById('editUserRole') as HTMLSelectElement)?.value as UserRole,
      department: departmentValue ? departmentValue : null,
      channel: channelName,
      team: teamValue ? teamValue : null,
      team_supervisor: teamSupervisorValue ? teamSupervisorValue : null,
      quality_mentor: qualityMentorValue ? qualityMentorValue : null,
      designation: designationValue ? designationValue : null,
      employee_id: employeeIdValue ? employeeIdValue : null,
      country: (document.getElementById('editUserCountry') as HTMLSelectElement)?.value || null,
      is_active: (document.getElementById('editUserStatus') as HTMLSelectElement)?.value === 'true',
      intercom_admin_id: intercomAdminId && selectedAdmin ? intercomAdminId : null,
      intercom_admin_alias: intercomAdminId && selectedAdmin ? selectedAdmin.name : null
    };

    try {
      await this.service.updateUser(email, updateData);
      this.modalManager.closeEditModal();
      await this.loadInitialData();

      if (window.confirmationDialog) {
        await window.confirmationDialog.show({
          title: 'User Updated Successfully',
          message: `User updated successfully!\n\nName: ${escapeHtml(updateData.name)}\nEmail: ${escapeHtml(email)}\nRole: ${escapeHtml(updateData.role)}\n\nChanges have been saved.`,
          confirmText: 'OK',
          cancelText: 'Close',
          type: 'success'
        });
      }
    } catch (error) {
      logError('[UserOperationsHandler] Error updating user:', error);
      const errorMessage = getUserFriendlyErrorMessage(error, 'update user');
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

  /**
   * Create new user
   */
  async createNewUser(): Promise<void> {
    const intercomAdminId = (document.getElementById('createUserIntercomAdmin') as HTMLSelectElement)?.value;
    const state = userManagementState.getState();
    const selectedAdmin = state.intercomAdmins.find(a => a.id.toString() === intercomAdminId);

    // Convert channel ID to name (database stores channel names, not IDs)
    const channelValue = (document.getElementById('createUserChannel') as HTMLSelectElement)?.value;
    let channelName: string | undefined = undefined;
    if (channelValue) {
      const channel = state.channels.find(c => c.id === channelValue);
      channelName = channel ? channel.name : channelValue; // Fallback to value if not found
    }

    // Collect form data, converting empty strings to undefined
    const getName = () => {
      const el = document.getElementById('createUserName') as HTMLInputElement;
      return el?.value.trim() || '';
    };
    const getEmail = () => {
      const el = document.getElementById('createUserEmail') as HTMLInputElement;
      return el?.value.trim().toLowerCase() || '';
    };
    const getValue = (id: string): string | undefined => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
      const value = el?.value?.trim();
      return value && value !== '' ? value : undefined;
    };

    // Validate form before submission
    const { validateForm } = await import('../../../../utils/form-validation.js');
    const validation = validateForm('createUserForm');
    
    if (!validation.isValid) {
      // Show specific error messages
      if (validation.errors.length > 0) {
        const errorMessages = validation.errors.join('\n');
        alert(`Please fix the following errors:\n\n${errorMessages}`);
      }
      
      // Validation errors are already shown on individual fields
      // Scroll to first error field
      const firstErrorField = document.querySelector('input[style*="border-color: rgb(239, 68, 68)"], select[style*="border-color: rgb(239, 68, 68)"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      return;
    }

    const createData = {
      name: getName(),
      email: getEmail(),
      role: (document.getElementById('createUserRole') as HTMLSelectElement)?.value as any,
      department: getValue('createUserDepartment'),
      channel: channelName,
      team: getValue('createUserTeam'),
      team_supervisor: getValue('createUserTeamSupervisor'),
      quality_mentor: getValue('createUserQualitySupervisor'),
      designation: getValue('createUserDesignation'),
      employee_id: getValue('createUserEmployeeId'),
      country: getValue('createUserCountry'),
      is_active: (document.getElementById('createUserStatus') as HTMLSelectElement)?.value === 'true',
      intercom_admin_id: intercomAdminId && selectedAdmin ? intercomAdminId : undefined,
      intercom_admin_alias: intercomAdminId && selectedAdmin ? selectedAdmin.name || undefined : undefined
    };

    try {
      const newUser = await this.service.createUser(createData);
      this.modalManager.closeCreateModal();
      await this.loadInitialData();

      // Success: no password shown; auth is via OAuth (e.g. Google)
      if (window.confirmationDialog) {
        await window.confirmationDialog.show({
          title: 'User Created Successfully',
          message: `User created successfully.\n\nName: ${escapeHtml(createData.name)}\nEmail: ${escapeHtml(createData.email)}\nRole: ${escapeHtml(createData.role)}\n\nThey can sign in with their organization Google account.`,
          confirmText: 'OK',
          cancelText: 'Close',
          type: 'success'
        });
      } else {
        alert(`User created successfully.\n\nName: ${createData.name}\nEmail: ${createData.email}\nRole: ${createData.role}\n\nThey can sign in with their organization Google account.`);
      }
    } catch (error) {
      logError('[UserOperationsHandler] Error creating user:', error);
      const errorMessage = getUserFriendlyErrorMessage(error, 'create user');
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

