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
    
    // If this select has been made searchable, refresh its options
    if ((select as any).refreshSearchableOptions) {
      (select as any).refreshSearchableOptions();
    }
  }

  /**
   * Populate supervisor dropdowns
   * Team Lead shows all users, Quality Mentor shows all users
   */
  populateSupervisorDropdowns(teamSupervisorId: string, qualitySupervisorId: string, users: User[]): void {
    const teamSelect = document.getElementById(teamSupervisorId) as HTMLSelectElement;
    const qualitySelect = document.getElementById(qualitySupervisorId) as HTMLSelectElement;

    if (teamSelect) {
      teamSelect.innerHTML = '<option value="">Select Team Lead</option>';
    }
    if (qualitySelect) {
      qualitySelect.innerHTML = '<option value="">Select Quality Mentor</option>';
    }

    // Show all users (only require email as identifier)
    const sortedUsers = [...users]
      .filter(user => user.email) // Only require email, name is optional
      .sort((a, b) => {
        const nameA = (a.name || a.email || '').toLowerCase();
        const nameB = (b.name || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

    sortedUsers.forEach(user => {
      // Use email as fallback if name is missing
      const displayName = user.name || user.email || 'Unknown User';
      const optionText = `${displayName}${user.designation ? ' - ' + user.designation : ''}`;
      
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
    });
    
    // If these selects have been made searchable, refresh their options
    if (teamSelect && (teamSelect as any).refreshSearchableOptions) {
      (teamSelect as any).refreshSearchableOptions();
    }
    if (qualitySelect && (qualitySelect as any).refreshSearchableOptions) {
      (qualitySelect as any).refreshSearchableOptions();
    }
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
    
    // If this select has been made searchable, refresh its options
    if ((select as any).refreshSearchableOptions) {
      (select as any).refreshSearchableOptions();
    }
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
    
    // If this select has been made searchable, refresh its options
    if ((select as any).refreshSearchableOptions) {
      (select as any).refreshSearchableOptions();
    }
  }

  /**
   * Populate country dropdown
   */
  populateCountryDropdown(selectId: string): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) return;

    const countries = ['Bangladesh', 'Sri Lanka', 'Malaysia', 'Cyprus'];

    select.innerHTML = '<option value="">Select Country</option>';
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      select.appendChild(option);
    });
    
    // If this select has been made searchable, refresh its options
    if ((select as any).refreshSearchableOptions) {
      (select as any).refreshSearchableOptions();
    }
  }

  /**
   * Populate designation dropdown
   */
  populateDesignationDropdown(selectId: string): void {
    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (!select) return;

    const designations = [
      'Executive',
      'Senior Executive',
      'Manager I',
      'Manager II',
      'Manager III',
      'Associate Director',
      'Vice President'
    ];

    select.innerHTML = '<option value="">Select Designation</option>';
    designations.forEach(designation => {
      const option = document.createElement('option');
      option.value = designation;
      option.textContent = designation;
      select.appendChild(option);
    });
    
    // If this select has been made searchable, refresh its options
    if ((select as any).refreshSearchableOptions) {
      (select as any).refreshSearchableOptions();
    }
  }

  /**
   * Populate modal dropdowns (shared for create and edit)
   */
  populateModalDropdowns(prefix: 'create' | 'edit'): void {
    const state = userManagementState.getState();
    this.populateChannelDropdown(`${prefix}UserChannel`, state.channels);
    this.populateSupervisorDropdowns(
      `${prefix}UserTeamSupervisor`,
      `${prefix}UserQualitySupervisor`,
      state.allUsers
    );
    this.populateIntercomAdminDropdown(`${prefix}UserIntercomAdmin`, state.intercomAdmins);
    this.populateDepartmentDropdown(`${prefix}UserDepartment`);
    this.populateCountryDropdown(`${prefix}UserCountry`);
    this.populateDesignationDropdown(`${prefix}UserDesignation`);
  }

  /**
   * Populate edit modal dropdowns
   */
  populateEditDropdowns(): void {
    this.populateModalDropdowns('edit');
  }

  /**
   * Populate create modal dropdowns
   */
  populateCreateDropdowns(): void {
    this.populateModalDropdowns('create');
  }
}

