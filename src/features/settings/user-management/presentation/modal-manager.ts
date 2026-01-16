/**
 * Modal Manager
 * Manages edit and create user modals
 */

import type { User, IntercomAdmin } from '../domain/entities.js';
import { userManagementState } from './state.js';
import { DropdownPopulator } from './dropdown-populator.js';
import { logError } from '../../../../utils/logging-helper.js';
import { setupFormValidation } from '../../../../utils/form-validation.js';
import { makeAllDropdownsSearchable } from './searchable-dropdown.js';

export class ModalManager {
  private dropdownPopulator: DropdownPopulator;

  constructor() {
    this.dropdownPopulator = new DropdownPopulator();
  }

  /**
   * Populate form fields with user data (shared for create and edit)
   */
  private populateFormFields(user: User | null, prefix: 'create' | 'edit'): void {
    // Populate dropdowns FIRST for both create and edit modals
    // This ensures all dropdowns are available before setting values
    if (prefix === 'edit') {
      this.dropdownPopulator.populateEditDropdowns();
    } else {
      this.dropdownPopulator.populateCreateDropdowns();
    }

    if (!user) {
      // For create, reset all fields
      const form = document.getElementById(`${prefix}UserForm`) as HTMLFormElement;
      if (form) {
        form.reset();
      }
      const statusSelect = document.getElementById(`${prefix}UserStatus`) as HTMLSelectElement;
      if (statusSelect) {
        statusSelect.value = 'true';
      }
      return;
    }

    // Populate form fields
    const nameInput = document.getElementById(`${prefix}UserName`) as HTMLInputElement;
    if (nameInput) nameInput.value = user.name || '';

    const emailInput = document.getElementById(`${prefix}UserEmail`) as HTMLInputElement;
    if (emailInput) {
      emailInput.value = user.email || '';
      if (prefix === 'edit') {
        emailInput.readOnly = true;
      }
    }

    const roleSelect = document.getElementById(`${prefix}UserRole`) as HTMLSelectElement;
    if (roleSelect) roleSelect.value = user.role || '';

    const departmentSelect = document.getElementById(`${prefix}UserDepartment`) as HTMLSelectElement;
    if (departmentSelect) departmentSelect.value = user.department || '';

    // Set channel value - handle both ID and name for backward compatibility
    const channelSelect = document.getElementById(`${prefix}UserChannel`) as HTMLSelectElement;
    if (channelSelect && user.channel) {
      const state = userManagementState.getState();
      const channel = state.channels.find(c => c.id === user.channel) || 
                     state.channels.find(c => c.name === user.channel);
      if (channel) {
        channelSelect.value = channel.id;
      } else {
        channelSelect.value = user.channel;
      }
    }

    const teamInput = document.getElementById(`${prefix}UserTeam`) as HTMLInputElement;
    if (teamInput) teamInput.value = user.team || '';

    const teamSupervisorSelect = document.getElementById(`${prefix}UserTeamSupervisor`) as HTMLSelectElement;
    if (teamSupervisorSelect) teamSupervisorSelect.value = user.team_supervisor || '';

    const qualitySupervisorSelect = document.getElementById(`${prefix}UserQualitySupervisor`) as HTMLSelectElement;
    if (qualitySupervisorSelect) qualitySupervisorSelect.value = user.quality_mentor || '';

    // Populate designation (now a dropdown)
    const designationSelect = document.getElementById(`${prefix}UserDesignation`) as HTMLSelectElement;
    if (designationSelect) designationSelect.value = user.designation || '';

    const employeeIdInput = document.getElementById(`${prefix}UserEmployeeId`) as HTMLInputElement;
    if (employeeIdInput) employeeIdInput.value = user.employee_id || '';

    // Populate country (now a dropdown)
    const countrySelect = document.getElementById(`${prefix}UserCountry`) as HTMLSelectElement;
    if (countrySelect) countrySelect.value = user.country || '';

    const statusSelect = document.getElementById(`${prefix}UserStatus`) as HTMLSelectElement;
    if (statusSelect) statusSelect.value = user.is_active ? 'true' : 'false';

    const intercomAdminSelect = document.getElementById(`${prefix}UserIntercomAdmin`) as HTMLSelectElement;
    if (intercomAdminSelect) intercomAdminSelect.value = user.intercom_admin_id || '';

    // For edit modal, set hidden user ID
    if (prefix === 'edit') {
      const userIdInput = document.getElementById('editUserId') as HTMLInputElement;
      if (userIdInput) userIdInput.value = user.email;
    }
  }

  /**
   * Setup modal event listeners (shared for create and edit)
   */
  private setupModalEventListeners(
    modal: HTMLElement,
    prefix: 'create' | 'edit',
    onSave: () => Promise<void>,
    onClose: () => void
  ): void {
    const saveButtonId = prefix === 'create' ? 'createUserSubmitBtn' : 'editUserSaveBtn';
    const cancelButtonId = prefix === 'create' ? 'createUserCancelBtn' : 'editUserCancelBtn';
    const closeButtonId = prefix === 'create' ? 'createUserModalClose' : 'editUserModalClose';

    const saveButton = modal.querySelector(`#${saveButtonId}`) as HTMLButtonElement;
    const cancelButton = modal.querySelector(`#${cancelButtonId}`) as HTMLButtonElement;
    const closeButton = modal.querySelector(`#${closeButtonId}`) as HTMLButtonElement;

    if (saveButton) {
      const newSaveButton = saveButton.cloneNode(true) as HTMLButtonElement;
      saveButton.parentNode?.replaceChild(newSaveButton, saveButton);
      newSaveButton.addEventListener('click', async () => {
        await onSave();
      });
    }

    if (cancelButton) {
      const newCancelButton = cancelButton.cloneNode(true) as HTMLButtonElement;
      cancelButton.parentNode?.replaceChild(newCancelButton, cancelButton);
      newCancelButton.addEventListener('click', () => {
        onClose();
      });
    }

    if (closeButton) {
      const newCloseButton = closeButton.cloneNode(true) as HTMLButtonElement;
      closeButton.parentNode?.replaceChild(newCloseButton, closeButton);
      newCloseButton.addEventListener('click', () => {
        onClose();
      });
    }

    // Setup email auto-detection for create modal
    if (prefix === 'create') {
      const emailInput = document.getElementById('createUserEmail') as HTMLInputElement;
      if (emailInput) {
        const newEmailInput = emailInput.cloneNode(true) as HTMLInputElement;
        emailInput.parentNode?.replaceChild(newEmailInput, emailInput);
        newEmailInput.addEventListener('blur', () => {
          this.autoDetectIntercomAdmin(newEmailInput.value, 'createUserIntercomAdmin');
        });
      }
    }
  }

  /**
   * Open edit user modal
   */
  openEditModal(user: User): void {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;

    // Populate form fields
    this.populateFormFields(user, 'edit');

    modal.style.display = 'flex';

    // Setup form validation
    setupFormValidation('editUserForm');

    // Make all dropdowns searchable after dropdowns are populated
    // Use a longer delay to ensure async data (channels, users, etc.) is loaded
    setTimeout(() => {
      makeAllDropdownsSearchable('editUserForm');
    }, 500);

    // Setup event listeners
    this.setupModalEventListeners(
      modal,
      'edit',
      async () => {
        if ((window as any).saveUserChanges) {
          await (window as any).saveUserChanges();
        }
      },
      () => this.closeEditModal()
    );
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

    // Reset and populate form fields
    this.populateFormFields(null, 'create');

    modal.style.display = 'flex';

    // Setup form validation
    setupFormValidation('createUserForm');

    // Make all dropdowns searchable after dropdowns are populated
    // Use a longer delay to ensure async data (channels, users, etc.) is loaded
    setTimeout(() => {
      makeAllDropdownsSearchable('createUserForm');
    }, 500);

    // Setup event listeners
    this.setupModalEventListeners(
      modal,
      'create',
      async () => {
        if ((window as any).createNewUser) {
          await (window as any).createNewUser();
        } else {
          alert('Create user handler not ready. Please wait a moment and try again.');
        }
      },
      () => this.closeCreateModal()
    );
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

