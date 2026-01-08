/**
 * Modal Manager
 * Manages edit and create user modals
 */

import type { User, IntercomAdmin } from '../domain/entities.js';
import { userManagementState } from './state.js';
import { DropdownPopulator } from './dropdown-populator.js';
import { logError } from '../../../../utils/logging-helper.js';

export class ModalManager {
  private dropdownPopulator: DropdownPopulator;

  constructor() {
    this.dropdownPopulator = new DropdownPopulator();
  }

  /**
   * Open edit user modal
   */
  openEditModal(user: User): void {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;

    // Populate form fields
    (document.getElementById('editUserId') as HTMLInputElement).value = user.email;
    (document.getElementById('editUserName') as HTMLInputElement).value = user.name || '';
    (document.getElementById('editUserRole') as HTMLSelectElement).value = user.role || '';
    (document.getElementById('editUserDepartment') as HTMLSelectElement).value = user.department || '';
    
    // Populate dropdowns first so we can set the channel value correctly
    this.dropdownPopulator.populateEditDropdowns();
    
    // Set channel value - handle both ID and name for backward compatibility
    const channelSelect = document.getElementById('editUserChannel') as HTMLSelectElement;
    if (channelSelect && user.channel) {
      const state = userManagementState.getState();
      // Try to find channel by ID first, then by name (for backward compatibility)
      const channel = state.channels.find(c => c.id === user.channel) || 
                     state.channels.find(c => c.name === user.channel);
      if (channel) {
        channelSelect.value = channel.id; // Use ID for new data
      } else {
        channelSelect.value = user.channel; // Fallback to stored value
      }
    }
    
    (document.getElementById('editUserTeam') as HTMLInputElement).value = user.team || '';
    (document.getElementById('editUserTeamSupervisor') as HTMLSelectElement).value = user.team_supervisor || '';
    (document.getElementById('editUserQualitySupervisor') as HTMLSelectElement).value = user.quality_mentor || '';
    (document.getElementById('editUserDesignation') as HTMLInputElement).value = user.designation || '';
    (document.getElementById('editUserEmployeeId') as HTMLInputElement).value = user.employee_id || '';
    (document.getElementById('editUserStatus') as HTMLSelectElement).value = user.is_active ? 'true' : 'false';
    (document.getElementById('editUserIntercomAdmin') as HTMLSelectElement).value = user.intercom_admin_id || '';

    modal.style.display = 'flex';
    
    // Attach event listeners programmatically (CSP-safe, no inline handlers)
    const saveButton = modal.querySelector('#editUserSaveBtn') as HTMLButtonElement;
    const cancelButton = modal.querySelector('#editUserCancelBtn') as HTMLButtonElement;
    const closeButton = modal.querySelector('#editUserModalClose') as HTMLButtonElement;
    
    if (saveButton) {
      // Remove any existing listeners by cloning the button
      const newSaveButton = saveButton.cloneNode(true) as HTMLButtonElement;
      saveButton.parentNode?.replaceChild(newSaveButton, saveButton);
      
      newSaveButton.addEventListener('click', async () => {
        if ((window as any).saveUserChanges) {
          await (window as any).saveUserChanges();
        }
      });
    }
    
    if (cancelButton) {
      // Remove any existing listeners by cloning the button
      const newCancelButton = cancelButton.cloneNode(true) as HTMLButtonElement;
      cancelButton.parentNode?.replaceChild(newCancelButton, cancelButton);
      
      newCancelButton.addEventListener('click', () => {
        this.closeEditModal();
      });
    }
    
    if (closeButton) {
      // Remove any existing listeners by cloning the button
      const newCloseButton = closeButton.cloneNode(true) as HTMLButtonElement;
      closeButton.parentNode?.replaceChild(newCloseButton, closeButton);
      
      newCloseButton.addEventListener('click', () => {
        this.closeEditModal();
      });
    }
  }

  /**
   * Close edit modal
   */
  closeEditModal(): void {
    const modal = document.getElementById('editUserModal');
    if (modal) {
      modal.style.display = 'none';
      (document.getElementById('editUserForm') as HTMLFormElement)?.reset();
    }
  }

  /**
   * Open create user modal
   */
  async openCreateModal(): Promise<void> {
    // Wait for templates to load if not already loaded
    if (!(window as any).templatesLoaded) {
      await new Promise<void>((resolve) => {
        const checkTemplates = () => {
          if ((window as any).templatesLoaded) {
            resolve();
          } else {
            setTimeout(checkTemplates, 100);
          }
        };
        window.addEventListener('templatesLoaded', () => resolve(), { once: true });
        checkTemplates();
      });
    }
    
    const modal = document.getElementById('createUserModal');
    if (!modal) {
      logError('[ModalManager] Create user modal not found');
      alert('Create user modal is not loaded yet. Please wait a moment and try again.');
      return;
    }

    // Reset form
    const form = document.getElementById('createUserForm') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    const statusSelect = document.getElementById('createUserStatus') as HTMLSelectElement;
    if (statusSelect) {
      statusSelect.value = 'true';
    }

    // Populate dropdowns
    this.dropdownPopulator.populateCreateDropdowns();

    // Setup email auto-detection listener (remove old one first to avoid duplicates)
    const emailInput = document.getElementById('createUserEmail') as HTMLInputElement;
    if (emailInput) {
      // Clone to remove all event listeners
      const newEmailInput = emailInput.cloneNode(true) as HTMLInputElement;
      emailInput.parentNode?.replaceChild(newEmailInput, emailInput);
      
      newEmailInput.addEventListener('blur', () => {
        this.autoDetectIntercomAdmin(newEmailInput.value, 'createUserIntercomAdmin');
      });
    }

    modal.style.display = 'flex';
    
    // Attach event listeners programmatically (CSP-safe, no inline handlers)
    const createButton = modal.querySelector('#createUserSubmitBtn') as HTMLButtonElement;
    const cancelButton = modal.querySelector('#createUserCancelBtn') as HTMLButtonElement;
    const closeButton = modal.querySelector('#createUserModalClose') as HTMLButtonElement;
    
    if (createButton) {
      // Remove any existing listeners by cloning the button
      const newCreateButton = createButton.cloneNode(true) as HTMLButtonElement;
      createButton.parentNode?.replaceChild(newCreateButton, createButton);
      
      newCreateButton.addEventListener('click', async () => {
        if ((window as any).createNewUser) {
          await (window as any).createNewUser();
        } else {
          alert('Create user handler not ready. Please wait a moment and try again.');
        }
      });
    }
    
    if (cancelButton) {
      // Remove any existing listeners by cloning the button
      const newCancelButton = cancelButton.cloneNode(true) as HTMLButtonElement;
      cancelButton.parentNode?.replaceChild(newCancelButton, cancelButton);
      
      newCancelButton.addEventListener('click', () => {
        this.closeCreateModal();
      });
    }
    
    if (closeButton) {
      // Remove any existing listeners by cloning the button
      const newCloseButton = closeButton.cloneNode(true) as HTMLButtonElement;
      closeButton.parentNode?.replaceChild(newCloseButton, closeButton);
      
      newCloseButton.addEventListener('click', () => {
        this.closeCreateModal();
      });
    }
  }

  /**
   * Close create modal
   */
  closeCreateModal(): void {
    const modal = document.getElementById('createUserModal');
    if (modal) {
      modal.style.display = 'none';
      (document.getElementById('createUserForm') as HTMLFormElement)?.reset();
    }
  }


  /**
   * Auto-detect Intercom admin by email
   */
  autoDetectIntercomAdmin(email: string, selectId: string): void {
    if (!email) return;

    const normalizedEmail = email.toLowerCase().trim();
    const state = userManagementState.getState();
    const admin = state.intercomAdmins.find((a: IntercomAdmin) => a.email && a.email.toLowerCase() === normalizedEmail);

    const select = document.getElementById(selectId) as HTMLSelectElement;
    if (select && admin) {
      select.value = admin.id.toString();
    }
  }

  /**
   * Setup modal close handlers
   */
  setupModalHandlers(): void {
    // Close modals when clicking outside
    document.addEventListener('click', (event) => {
      const editModal = document.getElementById('editUserModal');
      const createModal = document.getElementById('createUserModal');
      
      if (event.target === editModal) {
        this.closeEditModal();
      }
      if (event.target === createModal) {
        this.closeCreateModal();
      }
    });

    // Close buttons
    const editCloseBtn = document.querySelector('#editUserModal .modal-close');
    const createCloseBtn = document.querySelector('#createUserModal .modal-close');
    
    editCloseBtn?.addEventListener('click', () => this.closeEditModal());
    createCloseBtn?.addEventListener('click', () => this.closeCreateModal());
  }
}

