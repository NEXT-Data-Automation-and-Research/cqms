/**
 * Table Renderer
 * Renders user table with proper XSS protection
 */

import type { User } from '../domain/entities.js';
import { escapeHtml, safeSetHTML, safeSetTableBodyHTML, setTextContent } from '../../../../utils/html-sanitizer.js';
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

    // B3 FIX: Check for error state first
    const state = userManagementState.getState();
    if (state.error) {
      logInfo('[TableRenderer] Error state detected, showing error message');
      const errorHTML = `
        <div class="error-state" style="text-align: center; padding: 2rem; max-width: 600px; margin: 0 auto;">
          <div style="margin-bottom: 1.5rem;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444; margin: 0 auto;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem;">Error Loading Users</h3>
          <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">${escapeHtml(state.error)}</p>
          <button id="retryUsersBtn" 
                  style="padding: 0.75rem 1.5rem; background-color: #1A733E; color: white; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s;">
            Retry
          </button>
        </div>
      `;
      safeSetHTML(container, errorHTML);
      // Attach event listener after rendering
      const retryBtn = document.getElementById('retryUsersBtn');
      if (retryBtn && (window as any).refreshUsers) {
        retryBtn.addEventListener('click', () => {
          (window as any).refreshUsers();
        });
      }
      return;
    }

    // H4 FIX: Distinguish empty state from error/loading
    if (users.length === 0) {
      logInfo('[TableRenderer] No users to render, showing empty message');
      const isEmpty = !state.error && !state.isLoading;
      
      if (isEmpty) {
        const emptyHTML = `
          <div style="text-align: center; padding: 3rem; max-width: 500px; margin: 0 auto;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #9ca3af; margin: 0 auto 1.5rem;">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h3 style="font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">No Users Yet</h3>
            <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">Get started by creating your first user.</p>
            <button id="createUserEmptyBtn" class="btn-create"
                    style="padding: 0.75rem 1.5rem; background-color: #1A733E; color: white; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer;">
              Create User
            </button>
          </div>
        `;
        safeSetHTML(container, emptyHTML);
        // Attach event listener after rendering
        const createBtn = document.getElementById('createUserEmptyBtn');
        if (createBtn && (window as any).openCreateUserModal) {
          createBtn.addEventListener('click', () => {
            (window as any).openCreateUserModal();
          });
        }
      } else {
        safeSetHTML(container, '<div class="loading">No users found</div>');
      }
      return;
    }

    logInfo('[TableRenderer] Rendering', { usersCount: users.length });

    // Create modern table structure if it doesn't exist
    if (!tbody) {
      const tableHTML = `
        <table class="users-table-modern">
          <thead>
            <tr>
              <th scope="col" style="text-align: center; width: 3%; padding: 0.5rem 0.75rem;">
                <input type="checkbox" id="selectAllUsers" style="cursor: pointer; accent-color: #1A733E; width: 0.875rem; height: 0.875rem;" aria-label="Select all users">
              </th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">ID</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Name & Email</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Department</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Channel</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Team</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Designation</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Team Supervisor</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Quality Mentor</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Intercom Admin</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Role</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Country</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">Status</th>
              <th scope="col" style="padding: 0.5rem 0.75rem;">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      `;
      safeSetHTML(container, tableHTML);

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

    // Update users count (if element exists)
    const usersCountEl = document.getElementById('usersCount');
    if (usersCountEl) {
      setTextContent(usersCountEl, `${users.length} User${users.length !== 1 ? 's' : ''}`);
    }

    // Update checkboxes state
    this.updateCheckboxes();
    
    // Setup avatar image error handlers
    this.setupAvatarErrorHandlers();
    
    // Setup row click handlers and dropdowns
    this.setupRowInteractions();
    
    // Render pagination
    this.renderPagination(users.length);
  }
  
  /**
   * Setup row click handlers and dropdown interactions
   */
  private setupRowInteractions(): void {
    const rows = document.querySelectorAll('.user-row');
    rows.forEach(row => {
      const email = row.getAttribute('data-email');
      if (!email) return;
      
      // Row click handler (opens edit modal)
      row.addEventListener('click', (e) => {
        // Don't trigger if clicking checkbox or dropdown
        if ((e.target as HTMLElement).closest('.user-checkbox') || 
            (e.target as HTMLElement).closest('.action-dropdown-wrapper')) {
          return;
        }
        if ((window as any).editUser) {
          (window as any).editUser(email);
        }
      });
      
      // Keyboard navigation
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Edit user ${email}`);
      row.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          if ((window as any).editUser) {
            (window as any).editUser(email);
          }
        }
      });
    });
  }
  
  /**
   * Render pagination
   */
  private renderPagination(totalItems: number): void {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    const itemsPerPage = 10; // Default items per page
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const currentPage = 1; // Will be managed by state in future
    
    if (totalPages <= 1) {
      safeSetHTML(container, `
        <span class="pagination-info">
          Showing <strong>1</strong> to <strong>${escapeHtml(totalItems.toString())}</strong> of <strong>${escapeHtml(totalItems.toString())}</strong>
        </span>
      `);
      return;
    }
    
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    // Generate page numbers
    const pageNumbers: string[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i.toString());
      }
    } else {
      // Show first, last, and pages around current
      pageNumbers.push('1');
      if (currentPage > 3) pageNumbers.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i.toString());
      }
      
      if (currentPage < totalPages - 2) pageNumbers.push('...');
      pageNumbers.push(totalPages.toString());
    }
    
    const pageButtons = pageNumbers.map((page, index) => {
      if (page === '...') {
        return `<a href="#" class="pagination-button" data-action="noop">...</a>`;
      }
      const pageNum = parseInt(page);
      const isActive = pageNum === currentPage;
      return `
        <a href="#" 
           class="pagination-button ${isActive ? 'active' : ''}" 
           data-action="goto-page"
           data-page="${pageNum}"
           ${isActive ? 'aria-current="page"' : ''}>
          ${escapeHtml(page)}
        </a>
      `;
    }).join('');
    
    const paginationHTML = `
      <span class="pagination-info">
        Showing <strong>${escapeHtml(startItem.toString())}</strong> to <strong>${escapeHtml(endItem.toString())}</strong> of <strong>${escapeHtml(totalItems.toString())}</strong>
      </span>
      <ul class="pagination-controls">
        <li>
          <a href="#" 
             class="pagination-button ${currentPage === 1 ? 'disabled' : ''}" 
             data-action="prev-page"
             data-page="${currentPage - 1}"
             aria-label="Previous page">
            <span class="sr-only">Previous</span>
            <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </a>
        </li>
        ${pageButtons}
        <li>
          <a href="#" 
             class="pagination-button ${currentPage === totalPages ? 'disabled' : ''}" 
             data-action="next-page"
             data-page="${currentPage + 1}"
             aria-label="Next page">
            <span class="sr-only">Next</span>
            <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </a>
        </li>
      </ul>
    `;
    safeSetHTML(container, paginationHTML);
    
    // Attach event listeners after rendering (replacing onclick handlers)
    container.querySelectorAll('[data-action="prev-page"]').forEach(btn => {
      if (currentPage > 1) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const page = parseInt(btn.getAttribute('data-page') || '1');
          if ((window as any).goToPage) {
            (window as any).goToPage(page);
          }
        });
      }
    });
    
    container.querySelectorAll('[data-action="next-page"]').forEach(btn => {
      if (currentPage < totalPages) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const page = parseInt(btn.getAttribute('data-page') || '1');
          if ((window as any).goToPage) {
            (window as any).goToPage(page);
          }
        });
      }
    });
    
    container.querySelectorAll('[data-action="goto-page"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(btn.getAttribute('data-page') || '1');
        if ((window as any).goToPage) {
          (window as any).goToPage(page);
        }
      });
    });
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
    
    // M5 FIX: Add keyboard navigation support
    // Generate unique IDs for dropdown (use a simpler approach)
    const emailSlug = safeEmail.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const dropdownId = `user-${emailSlug}-dropdown`;
    const dropdownButtonId = `${dropdownId}-button`;
    
    return `
      <tr class="user-row border-b dark:border-gray-700" 
          data-email="${safeEmail}">
        <td style="text-align: center; padding: 0.5rem 0.75rem;">
          <input type="checkbox" class="user-checkbox" data-email="${safeEmail}" 
                 ${isSelected ? 'checked' : ''}
                 style="cursor: pointer; accent-color: #1A733E; width: 0.875rem; height: 0.875rem;"
                 aria-label="Select user ${safeName}"
                 onclick="event.stopPropagation();">
        </td>
        <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white" style="padding: 0.5rem 0.75rem;">${safeEmployeeId}</th>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;">
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
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;">${safeDepartment}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;">${safeChannel}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;">${safeTeam}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;">${safeDesignation}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem; color: #4b5563;">${safeTeamSupervisor}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem; color: #4b5563;">${safeQualitySupervisor}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem; color: #1e40af; font-weight: 500;">${safeIntercomAdmin}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;"><span class="role-badge role-${escapeHtml(roleClass)}">${safeRole}</span></td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;">${safeCountry}</td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;"><span class="${statusClass}">${escapeHtml(statusText)}</span></td>
        <td class="px-4 py-3" style="padding: 0.5rem 0.75rem;">
          <div class="action-dropdown-wrapper">
            <button id="${dropdownButtonId}" 
                    class="action-dropdown-button" 
                    type="button"
                    data-dropdown-toggle="${dropdownId}"
                    aria-label="Actions for user ${safeName}"
                    aria-expanded="false"
                    onclick="event.stopPropagation(); if(window.toggleDropdown) window.toggleDropdown('${dropdownId}');">
              <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
            <div id="${dropdownId}" 
                 class="action-dropdown-menu" 
                 aria-labelledby="${dropdownButtonId}">
              <ul class="action-dropdown-list">
                <li>
                  <a href="#" class="action-dropdown-item" data-email="${safeEmail}" onclick="event.preventDefault(); event.stopPropagation(); const email = this.getAttribute('data-email'); if(window.openEditModal && email) window.openEditModal(email); return false;">Edit</a>
                </li>
              </ul>
            </div>
          </div>
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

