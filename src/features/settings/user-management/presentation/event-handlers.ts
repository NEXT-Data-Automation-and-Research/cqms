/**
 * Event Handlers
 * Sets up event listeners for user management
 */

import { FilterManager } from './filter-manager.js';
import { ModalManager } from './modal-manager.js';
import { BulkActionsManager } from './bulk-actions.js';
import { CSVHandler } from './csv-handler.js';
import { userManagementState } from './state.js';
import type { UserManagementMain } from './user-management-main.js';

export class EventHandlers {
  constructor(
    private filterManager: FilterManager,
    private modalManager: ModalManager,
    private bulkActionsManager: BulkActionsManager,
    private csvHandler: CSVHandler,
    private main: UserManagementMain
  ) {}

  private previousFilters: string = '';
  private previousAllUsersLength: number = 0;

  /**
   * Setup all event listeners
   */
  setupEventListeners(): void {
    // Filter listeners
    this.filterManager.setupFilterListeners();

    // Filter change handler - only react to filter or allUsers changes
    userManagementState.subscribe(() => {
      const state = userManagementState.getState();
      
      // Create a serialized version of filters for comparison
      const currentFilters = JSON.stringify(state.filters);
      const currentAllUsersLength = state.allUsers.length;
      
      // Only update filtered users if filters or allUsers changed
      // This prevents infinite loops when filteredUsers changes
      if (currentFilters !== this.previousFilters || 
          currentAllUsersLength !== this.previousAllUsersLength) {
        const filtered = this.filterManager.applyFilters(state.allUsers, state.filters);
        
        // Only update if the filtered result actually changed
        const currentFilteredLength = state.filteredUsers.length;
        if (filtered.length !== currentFilteredLength || 
            JSON.stringify(filtered.map(u => u.email)) !== JSON.stringify(state.filteredUsers.map(u => u.email))) {
          userManagementState.setFilteredUsers(filtered);
        }
        
        this.previousFilters = currentFilters;
        this.previousAllUsersLength = currentAllUsersLength;
      }
    });

    // Modal handlers
    this.modalManager.setupModalHandlers();

    // Refresh button
    const refreshBtn = document.querySelector('.btn-primary[onclick="refreshUsers()"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.main.refreshUsers());
    }

    // Create user button (new modern design)
    const createBtn = document.querySelector('.btn-create-modern');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        await this.modalManager.openCreateModal();
      });
    }
    
    // Legacy create button (if exists)
    const legacyCreateBtn = document.querySelector('.btn-create[onclick="openCreateUserModal()"]');
    if (legacyCreateBtn) {
      legacyCreateBtn.addEventListener('click', async () => {
        await this.modalManager.openCreateModal();
      });
    }

    // Actions dropdown button - use toggleDropdown function
    const actionsDropdownBtn = document.getElementById('actionsDropdownButton');
    if (actionsDropdownBtn) {
      actionsDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if ((window as any).toggleDropdown) {
          (window as any).toggleDropdown('actionsDropdown');
        } else {
          // Fallback implementation
          const dropdown = document.getElementById('actionsDropdown');
          if (dropdown) {
            const isShowing = dropdown.classList.contains('show');
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
              if (menu.id !== 'actionsDropdown') menu.classList.remove('show');
            });
            if (isShowing) {
              dropdown.classList.remove('show');
              actionsDropdownBtn.setAttribute('aria-expanded', 'false');
            } else {
              dropdown.classList.add('show');
              actionsDropdownBtn.setAttribute('aria-expanded', 'true');
            }
          }
        }
      });
    }
    
    // Filter dropdown button - use toggleDropdown function
    const filterDropdownBtn = document.getElementById('filterDropdownButton');
    if (filterDropdownBtn) {
      filterDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if ((window as any).toggleDropdown) {
          (window as any).toggleDropdown('filterDropdown');
        } else {
          // Fallback implementation
          const dropdown = document.getElementById('filterDropdown');
          if (dropdown) {
            const isShowing = dropdown.classList.contains('show');
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
              if (menu.id !== 'filterDropdown') menu.classList.remove('show');
            });
            if (isShowing) {
              dropdown.classList.remove('show');
              filterDropdownBtn.setAttribute('aria-expanded', 'false');
            } else {
              dropdown.classList.add('show');
              filterDropdownBtn.setAttribute('aria-expanded', 'true');
            }
          }
        }
      });
    }

    // Bulk upload button (legacy)
    const bulkUploadBtn = document.querySelector('.btn-secondary[onclick="openBulkUploadModal()"]');
    if (bulkUploadBtn) {
      bulkUploadBtn.addEventListener('click', () => this.main.openBulkUploadModal());
    }

    // User row click handler - open edit modal (updated for new design)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Don't navigate if clicking on checkbox, dropdown, or their children
      if (target.closest('.user-checkbox') || 
          target.closest('.action-dropdown-wrapper') ||
          target.closest('.dropdown-menu') ||
          target.closest('input') ||
          (target.closest('button') && !target.closest('.user-row'))) {
        return;
      }
      
      // Find the user row
      const userRow = target.closest('.user-row') as HTMLElement;
      if (userRow) {
        const email = userRow.getAttribute('data-email');
        if (email) {
          // Open edit modal instead of navigating
          const state = userManagementState.getState();
          const user = state.allUsers.find(u => u.email === email);
          if (user) {
            this.modalManager.openEditModal(user);
          }
        }
      }
    });

    // Action dropdown items (delegated)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const dropdownItem = target.closest('.action-dropdown-item');
      if (dropdownItem) {
        e.stopPropagation();
        const email = dropdownItem.getAttribute('data-email');
        if (email) {
          const state = userManagementState.getState();
          const user = state.allUsers.find(u => u.email === email);
          if (user) {
            this.modalManager.openEditModal(user);
          }
        }
        // Close dropdown
        const dropdown = dropdownItem.closest('.action-dropdown-menu');
        if (dropdown) {
          dropdown.classList.remove('show');
          const button = document.querySelector(`[data-dropdown-toggle="${dropdown.id}"]`);
          if (button) button.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Legacy edit buttons (delegated) - for backward compatibility
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const editBtn = target.closest('.btn-edit');
      if (editBtn) {
        e.stopPropagation();
        const email = editBtn.getAttribute('data-email');
        if (email) {
          const state = userManagementState.getState();
          const user = state.allUsers.find(u => u.email === email);
          if (user) {
            this.modalManager.openEditModal(user);
          }
        }
      }
    });

    // Bulk apply button
    const bulkApplyBtn = document.getElementById('bulkApplyButton') || document.querySelector('.btn-bulk-apply');
    if (bulkApplyBtn) {
      bulkApplyBtn.addEventListener('click', () => this.main.applyBulkEdit());
    }

    // CSV download button
    const csvDownloadBtn = document.querySelector('button[onclick="downloadSampleCSV()"]');
    if (csvDownloadBtn) {
      csvDownloadBtn.addEventListener('click', () => this.csvHandler.downloadSampleCSV());
    }

    // CSV upload button
    const csvUploadBtn = document.querySelector('button[onclick="processBulkUpload()"]');
    if (csvUploadBtn) {
      csvUploadBtn.addEventListener('click', () => this.main.processBulkUpload());
    }

    // Populate bulk edit dropdowns
    this.bulkActionsManager.populateBulkEditDropdowns();
  }
}

