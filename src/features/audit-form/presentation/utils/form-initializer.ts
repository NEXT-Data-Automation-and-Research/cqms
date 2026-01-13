/**
 * Form Initializer
 * Handles form initialization and setup
 * Migrated from audit-form.html initializeForm()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { getDropdownLoader } from './dropdown-loader.js';
import { FormEventHandlers } from './form-event-handlers.js';
import { FormUISetup } from './form-ui-setup.js';

export class FormInitializer {
  /**
   * Initialize the audit form
   */
  async initialize(): Promise<void> {
    try {
      // Check page access
      if (!this.checkPageAccess()) {
        return;
      }

      // Check user role and hide/show buttons
      this.handleUserRoleVisibility();

      // Verify form element exists
      const auditForm = document.getElementById('auditForm');
      if (!auditForm) {
        await this.showFormError();
        return;
      }

      logInfo('Form element found, initializing...');

      // Load dropdowns
      await this.loadDropdowns();

      // Setup form event listeners
      const eventHandlers = new FormEventHandlers();
      eventHandlers.setupEventListeners();

      // Setup UI components
      const uiSetup = new FormUISetup();
      uiSetup.setupUI();
      uiSetup.initializeHeaderMetadata();

      logInfo('Form initialized successfully');
    } catch (error) {
      logError('Error initializing form:', error);
    }
  }

  /**
   * Check page access using centralized access control
   */
  private checkPageAccess(): boolean {
    if (typeof window !== 'undefined' && 
        (window as any).accessControl && 
        typeof (window as any).accessControl.enforcePageAccess === 'function') {
      return (window as any).accessControl.enforcePageAccess('audit-form.html');
    }
    return true; // Allow if access control not available
  }

  /**
   * Handle user role visibility
   */
  private handleUserRoleVisibility(): void {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      if (!userInfoStr) return;

      const userInfo = JSON.parse(userInfoStr);
      const userRole = userInfo.role || '';
      
      if (userRole === 'Employee') {
        const createManualAuditBtn = document.getElementById('createManualAuditBtn');
        if (createManualAuditBtn) {
          createManualAuditBtn.style.display = 'none';
        }
      }
    } catch (error) {
      logError('Error checking user role for button visibility:', error);
    }
  }

  /**
   * Show form error dialog
   */
  private async showFormError(): Promise<void> {
    logError('auditForm element not found!');
    if ((window as any).confirmationDialog && typeof (window as any).confirmationDialog.show === 'function') {
      await (window as any).confirmationDialog.show({
        title: 'Form Error',
        message: 'Error: Form element not found! Please refresh the page.',
        confirmText: 'Refresh',
        cancelText: 'OK',
        type: 'error'
      });
    }
  }

  /**
   * Load dropdowns with retry logic
   */
  private async loadDropdowns(): Promise<void> {
    const dropdownLoader = getDropdownLoader();
    
    // Load employees with retry logic
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      try {
        await dropdownLoader.loadEmployees();
        const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
        if (employeeSelect && employeeSelect.options.length > 1) {
          logInfo('Employees loaded successfully');
          break;
        }
      } catch (error) {
        logError(`Error loading employees (attempt ${attempts + 1}):`, error);
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Final check - if still not loaded, show error
    const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
    if (employeeSelect && employeeSelect.options.length <= 1) {
      logError('Failed to load employees after all attempts');
      safeSetHTML(employeeSelect, '<option value="">Failed to load employees. Please refresh the page.</option>');
    }

    // Load channels
    await dropdownLoader.loadChannels();

    // Fallback: Try loading again after delay
    setTimeout(async () => {
      const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
      if (employeeSelect && employeeSelect.options.length <= 1) {
        logInfo('Fallback: Attempting to load employees after delay...');
        try {
          await dropdownLoader.loadEmployees();
        } catch (error) {
          logError('Fallback loadEmployees error:', error);
        }
      }
    }, 3000);
  }
}

// Singleton instance
let formInitializerInstance: FormInitializer | null = null;

/**
 * Get form initializer instance
 */
export function getFormInitializer(): FormInitializer {
  if (!formInitializerInstance) {
    formInitializerInstance = new FormInitializer();
  }
  return formInitializerInstance;
}

