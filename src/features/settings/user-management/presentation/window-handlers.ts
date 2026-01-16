/**
 * Window Handlers
 * Exports functions to window object for HTML onclick handlers
 */

import { UserManagementMain } from './user-management-main.js';
import { ModalManager } from './modal-manager.js';
import { CSVHandler } from './csv-handler.js';
import { getUserFriendlyErrorMessage } from '../../../../utils/error-sanitizer.js';
import { userManagementState } from './state.js';

let mainInstance: UserManagementMain | null = null;
let modalManagerInstance: ModalManager | null = null;

function getMainInstance(): UserManagementMain {
  if (!mainInstance) {
    mainInstance = new UserManagementMain();
  }
  return mainInstance;
}

function getModalManager(): ModalManager {
  if (!modalManagerInstance) {
    modalManagerInstance = new ModalManager();
  }
  return modalManagerInstance;
}

export function setupWindowHandlers(main: UserManagementMain): void {
  mainInstance = main;
  
  // Expose instances for global access
  (window as any).userManagementMain = main;
  (window as any).modalManager = getModalManager();
  (window as any).userManagementState = userManagementState;

  (window as any).refreshUsers = () => {
    getMainInstance().refreshUsers();
  };

  (window as any).openCreateUserModal = async () => {
    const modalManager = new ModalManager();
    await modalManager.openCreateModal();
  };

  (window as any).openBulkUploadModal = () => {
    getMainInstance().openBulkUploadModal();
  };

  (window as any).downloadSampleCSV = () => {
    const csvHandler = new CSVHandler();
    csvHandler.downloadSampleCSV();
  };

  (window as any).processBulkUpload = () => {
    getMainInstance().processBulkUpload();
  };

  (window as any).applyBulkEdit = () => {
    getMainInstance().applyBulkEdit();
  };

  (window as any).saveUserChanges = () => {
    getMainInstance().saveUserChanges();
  };

  (window as any).createNewUser = () => {
    try {
      getMainInstance().createNewUser();
    } catch (error) {
      const errorMessage = getUserFriendlyErrorMessage(error, 'create user');
      alert(errorMessage);
    }
  };

  (window as any).closeEditModal = () => {
    const modalManager = new ModalManager();
    modalManager.closeEditModal();
  };

  (window as any).closeCreateModal = () => {
    const modalManager = new ModalManager();
    modalManager.closeCreateModal();
  };

  (window as any).closeBulkUploadModal = () => {
    getMainInstance().closeBulkUploadModal();
  };

  (window as any).openEditModal = (email: string) => {
    const state = userManagementState.getState();
    const user = state.allUsers.find(u => u.email === email);
    if (user) {
      getModalManager().openEditModal(user);
    }
  };
}

