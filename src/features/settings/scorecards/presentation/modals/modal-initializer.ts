/**
 * Modal Initializer
 * Initializes all scorecard modals
 */

import { logError } from '../../../../../utils/logging-helper.js';
import { CreateScorecardModal } from './create-modal.js';
import { EditScorecardModal } from './edit-modal.js';

// Store modal instances globally to prevent garbage collection
let createModalInstance: CreateScorecardModal | null = null;
let editModalInstance: EditScorecardModal | null = null;

/**
 * Initialize all modals
 */
export async function initModals(): Promise<void> {
  try {
    // Wait for controller to be initialized
    let controller = (window as any).scorecardController;
    if (!controller) {
      // Wait up to 5 seconds for controller
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        controller = (window as any).scorecardController;
        if (controller) break;
      }
    }
    
    if (!controller) {
      logError('ScorecardController not found after waiting. Modals will not work.');
      console.error('[ModalInitializer] ScorecardController not found');
      return;
    }
    
    console.log('[ModalInitializer] Controller found, initializing modals');

    // Initialize modal instances (store globally)
    createModalInstance = new CreateScorecardModal(controller);
    editModalInstance = new EditScorecardModal(controller);

    // Set up window.scorecardModals
    window.scorecardModals = {
      openViewModal: () => {
        console.warn('View modal not yet implemented');
      },
      openEditModal: (scorecard: any, parameters: any[]) => {
        if (editModalInstance) {
          editModalInstance.open(scorecard, parameters);
        } else {
          console.error('[ModalInitializer] Edit modal instance not available');
        }
      },
      openCreateModal: () => {
        console.log('[ModalInitializer] openCreateModal called', { hasInstance: !!createModalInstance });
        if (createModalInstance) {
          createModalInstance.open();
        } else {
          console.error('[ModalInitializer] Create modal instance not available');
          alert('Create modal not initialized. Please refresh the page.');
        }
      },
      openBulkImportModal: () => {
        console.warn('Bulk import modal not yet implemented');
      }
    };
    
    console.log('[ModalInitializer] Modals initialized successfully', { 
      hasCreateModal: !!createModalInstance,
      hasEditModal: !!editModalInstance,
      hasWindowModals: !!window.scorecardModals 
    });
  } catch (error) {
    logError('Failed to initialize modals', error);
    console.error('[ModalInitializer] Error:', error);
    throw error;
  }
}

// Type declaration is in scorecard-controller.ts to avoid conflicts

