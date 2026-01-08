/**
 * Table Renderer
 * Renders user table with proper XSS protection
 */

import type { User } from '../domain/entities.js';
import { escapeHtml, safeSetTableBodyHTML, setTextContent } from '../../../../utils/html-sanitizer.js';
import { userManagementState } from './state.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';

export class TableRenderer {
  /**
   * Render users table
   */
  render(users: User[]): void {
    logInfo('[TableRenderer] render called:', { usersCount: users.length });
    const tbody = document.querySelector('#usersTableContent tbody');
    const container = document.getElementById('usersTableContent');

    if (!container) {
      logError('[TableRenderer] Container #usersTableContent not found');
      return;
    }

    if (users.length === 0) {
      logInfo('[TableRenderer] No users to render, showing empty message');
      container.innerHTML = '<div class="loading">No users found</div>';
      return;
    }

    logInfo('[TableRenderer] Rendering', { usersCount: users.length });

    // Create table structure if it doesn't exist
    if (!tbody) {
      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 3%;">
                <input type="checkbox" id="selectAllUsers" style="cursor: pointer; accent-color: #1A733E;">
              </th>
              <th>ID</th>
              <th>Name & Email</th>
              <th>Department</th>
              <th>Channel</th>
              <th>Team</th>
              <th>Designation</th>
              <th>Team<br>Supervisor</th>
              <th>Quality<br>Mentor</th>
              <th>Intercom<br>Admin</th>
              <th>Role</th>
              <th>Country</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `;
      container.innerHTML = tableHTML;

      // Setup select all checkbox
      const selectAllCheckbox = document.getElementById('selectAllUsers') as HTMLInputElement;
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
          const checked = (e.target as HTMLInputElement).checked;
          if (checked) {
            userManagementState.selectAllFilteredUsers();
          } else {
            userManagementState.deselectAllFilteredUsers();
          }
          this.updateCheckboxes();
        });
      }
    }

    // Render rows
    const rowsHTML = users.map(user => this.createUserRow(user)).join('');
    const tbodyElement = container.querySelector('tbody');
    if (tbodyElement) {
      safeSetTableBodyHTML(tbodyElement, rowsHTML);
    }

    // Update users count in table header
    const usersCountEl = document.getElementById('usersCount');
    if (usersCountEl) {
      setTextContent(usersCountEl, `${users.length} User${users.length !== 1 ? 's' : ''}`);
    }

    // Update checkboxes state
    this.updateCheckboxes();
    
    // Setup avatar image error handlers
    this.setupAvatarErrorHandlers();
  }

  /**
   * Setup error handlers for avatar images
   * Falls back to initials if image fails to load
   */
  private setupAvatarErrorHandlers(): void {
    const avatarImages = document.querySelectorAll('.user-avatar-img') as NodeListOf<HTMLImageElement>;
    avatarImages.forEach(img => {
      const email = img.getAttribute('data-email');
      if (!email) return;
      
      img.addEventListener('error', () => {
        // Hide image and show initials
        img.style.display = 'none';
        const initialsEl = document.querySelector(`.user-avatar-initials[data-email="${email}"]`) as HTMLElement;
        if (initialsEl) {
          initialsEl.style.display = 'flex';
        }
      });
      
      img.addEventListener('load', () => {
        // Ensure initials are hidden when image loads successfully
        const initialsEl = document.querySelector(`.user-avatar-initials[data-email="${email}"]`) as HTMLElement;
        if (initialsEl) {
          initialsEl.style.display = 'none';
        }
      });
    });
  }

  /**
   * Create a user row HTML
   */
  private createUserRow(user: User): string {
    const state = userManagementState.getState();
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    const roleClass = user.role ? user.role.toLowerCase().replace(' ', '-') : '';
    const statusClass = user.is_active ? 'status-active' : 'status-inactive';
    const statusText = user.is_active ? 'Active' : 'Inactive';
    
    // Get supervisor names
    const teamSupervisorName = user.team_supervisor 
      ? (state.allUsers.find(u => u.email === user.team_supervisor)?.name || user.team_supervisor)
      : '-';
    const qualitySupervisorName = user.quality_mentor 
      ? (state.allUsers.find(u => u.email === user.quality_mentor)?.name || user.quality_mentor)
      : '-';
    
    const isSelected = state.selectedUsers.has(user.email);
    
    // Escape all user data
    const safeEmail = escapeHtml(user.email || '');
    const safeName = escapeHtml(user.name || 'Unknown');
    const safeEmployeeId = escapeHtml(user.employee_id?.toString() || '-');
    const safeDepartment = escapeHtml(user.department || '-');
    const safeChannel = escapeHtml(user.channel || '-');
    const safeTeam = escapeHtml(user.team || '-');
    const safeDesignation = escapeHtml(user.designation || '-');
    const safeTeamSupervisor = escapeHtml(teamSupervisorName);
    const safeQualitySupervisor = escapeHtml(qualitySupervisorName);
    const safeIntercomAdmin = escapeHtml(user.intercom_admin_alias || '-');
    const safeRole = escapeHtml(user.role || '-');
    const safeCountry = escapeHtml(user.country || '-');
    
    // Check if avatar URL is available
    const avatarUrl = user.avatar_url && 
                     user.avatar_url.trim() !== '' && 
                     user.avatar_url !== 'null' && 
                     user.avatar_url !== 'undefined' 
                     ? escapeHtml(user.avatar_url) 
                     : null;
    
    // Create avatar HTML - use image if available, otherwise initials
    const avatarHTML = avatarUrl
      ? `<img src="${avatarUrl}" alt="${safeName}" class="user-avatar-img" data-email="${safeEmail}" referrerPolicy="no-referrer" />`
      : '';
    const initialsHTML = `<div class="user-avatar-initials" data-email="${safeEmail}" ${avatarUrl ? 'style="display: none;"' : ''}>${escapeHtml(initials)}</div>`;
    
    return `
      <tr class="user-row" data-email="${safeEmail}" style="cursor: pointer;">
        <td style="text-align: center;">
          <input type="checkbox" class="user-checkbox" data-email="${safeEmail}" 
                 ${isSelected ? 'checked' : ''}
                 style="cursor: pointer; accent-color: #1A733E;">
        </td>
        <td style="font-weight: 600; color: #6b7280;">${safeEmployeeId}</td>
        <td>
          <div class="user-info">
            <div class="user-name-row">
              <div class="user-avatar">
                ${avatarHTML}
                ${initialsHTML}
              </div>
              <span>${safeName}</span>
            </div>
            <div class="user-email-row">
              <span>${safeEmail}</span>
            </div>
          </div>
        </td>
        <td>${safeDepartment}</td>
        <td>${safeChannel}</td>
        <td>${safeTeam}</td>
        <td>${safeDesignation}</td>
        <td style="color: #4b5563;">${safeTeamSupervisor}</td>
        <td style="color: #4b5563;">${safeQualitySupervisor}</td>
        <td style="color: #1e40af; font-weight: 500;">${safeIntercomAdmin}</td>
        <td><span class="role-badge role-${escapeHtml(roleClass)}">${safeRole}</span></td>
        <td>${safeCountry}</td>
        <td><span class="${statusClass}">${escapeHtml(statusText)}</span></td>
        <td>
          <button class="btn-edit" data-email="${safeEmail}" title="Edit User">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Update checkboxes state
   */
  updateCheckboxes(): void {
    const state = userManagementState.getState();
    const checkboxes = document.querySelectorAll('.user-checkbox') as NodeListOf<HTMLInputElement>;
    
    checkboxes.forEach(checkbox => {
      const email = checkbox.getAttribute('data-email');
      if (email) {
        checkbox.checked = state.selectedUsers.has(email);
        
        // Remove existing listeners and add new one
        const newCheckbox = checkbox.cloneNode(true) as HTMLInputElement;
        checkbox.parentNode?.replaceChild(newCheckbox, checkbox);
        
        newCheckbox.addEventListener('change', (e) => {
          e.stopPropagation(); // Prevent row click navigation
          userManagementState.toggleUserSelection(email, newCheckbox.checked);
          this.updateSelectAllCheckbox();
        });
        
        newCheckbox.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent row click navigation
        });
      }
    });

    this.updateSelectAllCheckbox();
  }

  /**
   * Update select all checkbox
   */
  private updateSelectAllCheckbox(): void {
    const state = userManagementState.getState();
    const selectAllCheckbox = document.getElementById('selectAllUsers') as HTMLInputElement;
    if (selectAllCheckbox && state.filteredUsers.length > 0) {
      const filteredEmails = new Set(state.filteredUsers.map(u => u.email).filter(Boolean));
      let selectedCount = 0;
      filteredEmails.forEach(email => {
        if (state.selectedUsers.has(email)) {
          selectedCount++;
        }
      });
      selectAllCheckbox.checked = selectedCount === state.filteredUsers.length;
    }
  }
}

