/**
 * Bulk Actions Manager
 * Handles bulk user operations
 */

import type { BulkEditData } from '../domain/types.js';
import { userManagementState } from './state.js';
import { escapeHtml, setTextContent } from '../../../../utils/html-sanitizer.js';

export class BulkActionsManager {
  /**
   * Update bulk actions bar visibility
   */
  updateBulkActionsBar(): void {
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCount = userManagementState.getState().selectedUsers.size;

    if (bulkActionsBar) {
      if (selectedCount > 0) {
        bulkActionsBar.classList.add('active');
        setTextContent(document.getElementById('bulkSelectedCount'), 
          `${selectedCount} user${selectedCount !== 1 ? 's' : ''} selected`);
      } else {
        bulkActionsBar.classList.remove('active');
      }
    }
  }

  /**
   * Populate bulk edit dropdowns
   */
  populateBulkEditDropdowns(): void {
    const state = userManagementState.getState();
    
    // Populate Team dropdown
    const teamSelect = document.getElementById('bulkEditTeam') as HTMLSelectElement;
    if (teamSelect) {
      const uniqueTeams = [...new Set(state.allUsers.map(u => u.team).filter(Boolean))].sort();
      teamSelect.innerHTML = '<option value="">Change Team...</option>';
      uniqueTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team as string;
        option.textContent = team as string;
        teamSelect.appendChild(option);
      });
    }

    // Populate Department dropdown
    const departmentSelect = document.getElementById('bulkEditDepartment') as HTMLSelectElement;
    if (departmentSelect) {
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
      departmentSelect.innerHTML = '<option value="">Change Department...</option>';
      departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departmentSelect.appendChild(option);
      });
    }

    // Populate Channel dropdown
    const channelSelect = document.getElementById('bulkEditChannel') as HTMLSelectElement;
    if (channelSelect) {
      channelSelect.innerHTML = '<option value="">Change Channel...</option>';
      state.channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.name;
        option.textContent = channel.name;
        channelSelect.appendChild(option);
      });
    }

    // Populate Team Supervisor dropdown
    const teamSupervisorSelect = document.getElementById('bulkEditTeamSupervisor') as HTMLSelectElement;
    if (teamSupervisorSelect) {
      const sortedUsers = [...state.allUsers].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      teamSupervisorSelect.innerHTML = '<option value="">Change Team Supervisor...</option>';
      sortedUsers.forEach(user => {
        if (user.name && user.email) {
          const option = document.createElement('option');
          option.value = user.email;
          option.textContent = `${user.name}${user.designation ? ' - ' + user.designation : ''}`;
          teamSupervisorSelect.appendChild(option);
        }
      });
    }

    // Populate Quality Mentor dropdown
    const qualitySupervisorSelect = document.getElementById('bulkEditQualitySupervisor') as HTMLSelectElement;
    if (qualitySupervisorSelect) {
      const sortedUsers = [...state.allUsers].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      qualitySupervisorSelect.innerHTML = '<option value="">Change Quality Mentor...</option>';
      sortedUsers.forEach(user => {
        if (user.name && user.email) {
          const option = document.createElement('option');
          option.value = user.email;
          option.textContent = `${user.name}${user.designation ? ' - ' + user.designation : ''}`;
          qualitySupervisorSelect.appendChild(option);
        }
      });
    }
  }

  /**
   * Get bulk edit data from form
   */
  getBulkEditData(): BulkEditData {
    return {
      team: (document.getElementById('bulkEditTeam') as HTMLSelectElement)?.value || undefined,
      department: (document.getElementById('bulkEditDepartment') as HTMLSelectElement)?.value || undefined,
      channel: (document.getElementById('bulkEditChannel') as HTMLSelectElement)?.value || undefined,
      teamSupervisor: (document.getElementById('bulkEditTeamSupervisor') as HTMLSelectElement)?.value || undefined,
      qualitySupervisor: (document.getElementById('bulkEditQualitySupervisor') as HTMLSelectElement)?.value || undefined,
      role: (document.getElementById('bulkEditRole') as HTMLSelectElement)?.value || undefined
    };
  }

  /**
   * Reset bulk edit form
   */
  resetBulkEditForm(): void {
    (document.getElementById('bulkEditTeam') as HTMLSelectElement).value = '';
    (document.getElementById('bulkEditDepartment') as HTMLSelectElement).value = '';
    (document.getElementById('bulkEditChannel') as HTMLSelectElement).value = '';
    (document.getElementById('bulkEditTeamSupervisor') as HTMLSelectElement).value = '';
    (document.getElementById('bulkEditQualitySupervisor') as HTMLSelectElement).value = '';
    (document.getElementById('bulkEditRole') as HTMLSelectElement).value = '';
  }
}

