/**
 * Dropdown Populator
 * Handles population of dropdown menus in modals
 */

import type { User, Channel, IntercomAdmin } from '../domain/entities.js';
import { userManagementState } from './state.js';

export class DropdownPopulator {
  /**
   * Populate channel dropdown
   * Uses channel ID as value for proper referential integrity
   */
  populateChannelDropdown(selectId: string, channels: Channel[]): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '<option value="">Select Channel</option>';
    channels.forEach(channel => {
      const option = document.createElement('option');
      // Use channel ID as value, but display name
      // This ensures proper referential integrity
      option.value = channel.id;
      option.textContent = channel.name;
      select.appendChild(option);
    });
  }

  /**
   * Populate supervisor dropdowns
   */
  populateSupervisorDropdowns(teamSupervisorId: string, qualitySupervisorId: string, users: User[]): void {
    const teamSelect = document.getElementById(teamSupervisorId) as HTMLSelectElement;
    const qualitySelect = document.getElementById(qualitySupervisorId) as HTMLSelectElement;

    if (teamSelect) {
      teamSelect.innerHTML = '<option value="">Select Team Supervisor</option>';
    }
    if (qualitySelect) {
      qualitySelect.innerHTML = '<option value="">Select Quality Mentor</option>';
    }

    const sortedUsers = [...users].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    sortedUsers.forEach(user => {
      if (user.name && user.email) {
        const optionText = `${user.name}${user.designation ? ' - ' + user.designation : ''}`;
        
        if (teamSelect) {
          const option = document.createElement('option');
          option.value = user.email;
          option.textContent = optionText;
          teamSelect.appendChild(option);
        }
        
        if (qualitySelect) {
          const option = document.createElement('option');
          option.value = user.email;
          option.textContent = optionText;
          qualitySelect.appendChild(option);
        }
      }
    });
  }

  /**
   * Populate Intercom admin dropdown
   */
  populateIntercomAdminDropdown(selectId: string, admins: IntercomAdmin[]): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) return;

    select.innerHTML = '<option value="">Select Intercom Admin (Optional)</option>';
    admins.forEach(admin => {
      if (admin.id && admin.name) {
        const option = document.createElement('option');
        option.value = admin.id;
        option.textContent = `${admin.name}${admin.email ? ' (' + admin.email + ')' : ''}`;
        select.appendChild(option);
      }
    });
  }

  /**
   * Populate department dropdown
   */
  populateDepartmentDropdown(selectId: string): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) return;

    const departments = [
      'Admin, Compliance & Corporate Affairs',
      'Operations',
      "CEO's Office",
      'Client Experience',
      'Community & Partner Management',
      'Finance & Audit',
      'Payments & Treasury',
      'Marketing',
      'People & Culture',
      'Quality, Performance & Training',
      'Technology',
      'Trading & Risk Management',
      'FNmarkets',
      'Sri Lanka Operations',
      'Malaysia Operations'
    ];

    select.innerHTML = '<option value="">Select Department</option>';
    departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      select.appendChild(option);
    });
  }

  /**
   * Populate edit modal dropdowns
   */
  populateEditDropdowns(): void {
    const state = userManagementState.getState();
    this.populateChannelDropdown('editUserChannel', state.channels);
    this.populateSupervisorDropdowns('editUserTeamSupervisor', 'editUserQualitySupervisor', state.allUsers);
    this.populateIntercomAdminDropdown('editUserIntercomAdmin', state.intercomAdmins);
    this.populateDepartmentDropdown('editUserDepartment');
  }

  /**
   * Populate create modal dropdowns
   */
  populateCreateDropdowns(): void {
    const state = userManagementState.getState();
    this.populateChannelDropdown('createUserChannel', state.channels);
    this.populateSupervisorDropdowns('createUserTeamSupervisor', 'createUserQualitySupervisor', state.allUsers);
    this.populateIntercomAdminDropdown('createUserIntercomAdmin', state.intercomAdmins);
    this.populateDepartmentDropdown('createUserDepartment');
  }
}

