/**
 * Create Scorecard Modal
 * Handles creating new scorecards
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';
import { logError, logInfo } from '../../../../../utils/logging-helper.js';
import type { Scorecard, ScorecardParameter, Channel } from '../../domain/entities.js';
import { ParameterTable } from './components/parameter-table.js';
import { ChannelCheckboxes } from './components/channel-checkboxes.js';
import { getScoringTypeHelpText, getParametersHeaderText } from './utils/form-helpers.js';
import { renderCreateModalHTML } from './utils/create-modal-renderer.js';

export class CreateScorecardModal {
  private modal: HTMLElement | null;
  private controller: any;
  private parameterTable: ParameterTable | null = null;
  private channelCheckboxes: ChannelCheckboxes | null = null;

  constructor(controller: any) {
    this.controller = controller;
    this.modal = document.getElementById('scorecardModal');
  }

  /**
   * Open create modal
   */
  open(): void {
    console.log('[CreateModal] open() called', { hasModal: !!this.modal, hasController: !!this.controller });
    
    if (!this.modal) {
      logError('Create scorecard modal element not found');
      console.error('[CreateModal] Modal element #scorecardModal not found');
      return;
    }

    if (!this.controller) {
      logError('ScorecardController not available');
      console.error('[CreateModal] Controller not available');
      return;
    }

    try {
      this.render();
      this.modal.classList.add('active');
      console.log('[CreateModal] Modal opened, classList:', this.modal.classList.toString());
      this.attachEventListeners();
    } catch (error) {
      logError('Failed to open create modal', error);
      console.error('[CreateModal] Error opening modal:', error);
    }
  }

  /**
   * Close modal
   */
  close(): void {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  /**
   * Render modal content
   */
  private render(): void {
    if (!this.modal) return;

    try {
      const channels = this.controller.getAvailableChannels();
      
      safeSetHTML(this.modal, renderCreateModalHTML());
      
      // Verify form exists after rendering
      const form = document.getElementById('createScorecardForm') as HTMLFormElement;
      if (!form) {
        console.error('[CreateModal] Form not found after rendering!', {
          modalHTML: this.modal.innerHTML.substring(0, 500),
          modalChildren: this.modal.children.length
        });
        throw new Error('Form element (createScorecardForm) not found in rendered HTML');
      }
      console.log('[CreateModal] Form found after rendering:', form.id);
      
      // Initialize parameter table
      const parametersContainer = document.getElementById('createParametersContainer');
      if (!parametersContainer) {
        throw new Error('Parameters container element (createParametersContainer) not found in modal HTML');
      }
      this.parameterTable = new ParameterTable('createParametersContainer');
      this.parameterTable.setScoringType('deductive'); // Default
      // Add initial parameter row so user can start filling it out
      this.parameterTable.addParameter();
      
      // Initialize channel checkboxes
      const channelsContainer = document.getElementById('createChannelsContainer');
      if (!channelsContainer) {
        throw new Error('Channels container element (createChannelsContainer) not found in modal HTML');
      }
      this.channelCheckboxes = new ChannelCheckboxes('createChannelsContainer');
      this.channelCheckboxes.setChannels(channels);
      
      // Setup scoring type handler
      this.setupScoringTypeHandler();
      
      // Setup parameter add button
      const addBtn = document.getElementById('createParameterAddOneBtn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          if (this.parameterTable) {
            this.parameterTable.addParameter();
          }
        });
      }
    } catch (error) {
      logError('Failed to render create modal', {
        message: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      throw error;
    }
  }

  /**
   * Setup scoring type change handler
   */
  private setupScoringTypeHandler(): void {
    const scoringTypeSelect = document.getElementById('createScorecardScoringType') as HTMLSelectElement;
    if (!scoringTypeSelect) return;

    scoringTypeSelect.addEventListener('change', () => {
      const scoringType = scoringTypeSelect.value;
      const helpText = document.getElementById('createScoringTypeHelp');
      const parametersHeader = document.getElementById('createParametersHeader');
      
      if (helpText) {
        helpText.innerHTML = getScoringTypeHelpText(scoringType);
      }
      
      if (parametersHeader) {
        parametersHeader.textContent = getParametersHeaderText(scoringType);
      }
      
      if (this.parameterTable) {
        this.parameterTable.setScoringType(scoringType);
      }
    });
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    console.log('[CreateModal] Attaching event listeners...');
    
    const closeBtn = document.getElementById('createScorecardModalClose');
    const cancelBtn = document.getElementById('createScorecardCancelBtn');
    const submitBtn = document.getElementById('createScorecardSubmitBtn');
    const form = document.getElementById('createScorecardForm') as HTMLFormElement;

    console.log('[CreateModal] Elements found:', {
      closeBtn: !!closeBtn,
      cancelBtn: !!cancelBtn,
      submitBtn: !!submitBtn,
      form: !!form
    });

    const closeModal = () => this.close();

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
      console.log('[CreateModal] Close button listener attached');
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeModal);
      console.log('[CreateModal] Cancel button listener attached');
    }

    // Close on backdrop click (but not when clicking inside modal-content)
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Only close if clicking directly on the modal backdrop, not on modal-content or its children
        if (target === this.modal) {
          closeModal();
        }
      });
    }

    // Prevent form default submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[CreateModal] Form submit prevented, calling handleSubmit');
        this.handleSubmit();
      });
      console.log('[CreateModal] Form submit listener attached');
    }

    // Attach click handler to submit button
    if (submitBtn) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[CreateModal] Submit button clicked!');
        await this.handleSubmit();
      });
      console.log('[CreateModal] Submit button listener attached');
    } else {
      console.error('[CreateModal] Submit button not found!');
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(): Promise<void> {
    console.log('[CreateModal] handleSubmit() called');
    
    // Try multiple ways to find the form
    let form = document.getElementById('createScorecardForm') as HTMLFormElement;
    
    // If not found, try searching within modal
    if (!form && this.modal) {
      form = this.modal.querySelector('#createScorecardForm') as HTMLFormElement;
    }
    
    // If still not found, try searching within modal-content
    if (!form && this.modal) {
      const modalContent = this.modal.querySelector('.modal-content');
      if (modalContent) {
        form = modalContent.querySelector('#createScorecardForm') as HTMLFormElement;
      }
    }
    
    if (!form) {
      console.error('[CreateModal] Form not found!', {
        modalExists: !!this.modal,
        modalHTML: this.modal?.innerHTML?.substring(0, 200),
        allForms: document.querySelectorAll('form').length,
        formById: !!document.getElementById('createScorecardForm')
      });
      alert('Form not found. Please try closing and reopening the modal.');
      return;
    }
    
    console.log('[CreateModal] Form found:', form.id);

    console.log('[CreateModal] Validating form...');
    
    // Validate HTML5 form validity
    if (!form.checkValidity()) {
      console.warn('[CreateModal] Form validation failed');
      form.reportValidity();
      return;
    }

    // Manual validation for required fields
    const name = (document.getElementById('createScorecardName') as HTMLInputElement)?.value.trim();
    const tableName = (document.getElementById('createScorecardTableName') as HTMLInputElement)?.value.trim();
    const scoringType = (document.getElementById('createScorecardScoringType') as HTMLSelectElement)?.value;
    const passingThreshold = (document.getElementById('createScorecardPassingThreshold') as HTMLInputElement)?.value.trim();

    const validationErrors: string[] = [];

    if (!name || name.length === 0) {
      validationErrors.push('Scorecard Name is required');
    }

    if (!tableName || tableName.length === 0) {
      validationErrors.push('Table Name is required');
    } else if (!/^[a-z0-9_]+$/.test(tableName)) {
      validationErrors.push('Table Name must contain only lowercase letters, numbers, and underscores');
    }

    if (!scoringType || scoringType === '') {
      validationErrors.push('Scoring Type is required');
    }

    if (!passingThreshold || passingThreshold === '') {
      validationErrors.push('Passing Threshold is required');
    } else {
      const threshold = parseFloat(passingThreshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        validationErrors.push('Passing Threshold must be a number between 0 and 100');
      }
    }

    if (validationErrors.length > 0) {
      console.warn('[CreateModal] Validation errors:', validationErrors);
      alert('Please fix the following errors:\n\n' + validationErrors.join('\n'));
      return;
    }

    // Validate channels
    if (!this.channelCheckboxes) {
      console.error('[CreateModal] Channel checkboxes not initialized');
      alert('Channels not initialized. Please refresh the page.');
      return;
    }

    if (!this.channelCheckboxes.validate()) {
      console.warn('[CreateModal] No channels selected');
      alert('Please select at least one channel');
      return;
    }

    const description = (document.getElementById('createScorecardDescription') as HTMLTextAreaElement)?.value.trim() || null;
    // passingThreshold already validated above, parse it now
    const passingThresholdNum = parseFloat(passingThreshold);
    const isActive = (document.getElementById('createScorecardIsActive') as HTMLInputElement)?.checked ?? true;

    const selectedChannels = this.channelCheckboxes.getSelectedChannels().join(', ');

    // Get parameters from parameter table (it maintains state through event listeners)
    if (!this.parameterTable) {
      console.error('[CreateModal] Parameter table not initialized');
      alert('Parameters not initialized. Please refresh the page.');
      return;
    }

    const parameters = this.parameterTable.getParameters();
    console.log('[CreateModal] Parameters:', parameters);
    
    if (parameters.length === 0) {
      console.warn('[CreateModal] No parameters added');
      alert('Please add at least one parameter');
      return;
    }

    // Validate that all parameters have required fields filled
    const invalidParams: Array<{ index: number; errors: string[] }> = [];
    parameters.forEach((p, index) => {
      const errors: string[] = [];
      if (!p.error_name?.trim()) {
        errors.push('Name');
      }
      if (!p.error_category) {
        errors.push('Category');
      }
      if (!p.field_type) {
        errors.push('Field Type');
      }
      if (!p.field_id?.trim()) {
        errors.push('Field ID');
      }
      if (errors.length > 0) {
        invalidParams.push({ index: index + 1, errors });
      }
    });

    if (invalidParams.length > 0) {
      console.warn('[CreateModal] Invalid parameters:', invalidParams);
      const errorMessages = invalidParams.map(
        ip => `Parameter ${ip.index}: Missing ${ip.errors.join(', ')}`
      );
      alert('Please fill in all required fields for all parameters:\n\n' + errorMessages.join('\n'));
      return;
    }

    // Verify service is available
    if (!this.controller?.service) {
      logError('ScorecardService not available');
      alert('Scorecard service not initialized. Please refresh the page.');
      return;
    }

    // Get submit button reference BEFORE async operations (for error handling)
    const submitBtn = document.getElementById('createScorecardSubmitBtn') as HTMLButtonElement;
    const originalHTML = submitBtn?.innerHTML || 'Create Scorecard';

    try {
      // Use parameters from parameter table (scorecard_id will be set after creation)
      const collectedParameters = parameters.map(p => ({
        ...p,
        scorecard_id: '' // Will be set after scorecard creation
      }));

      const scorecardData: Partial<Scorecard> = {
        name,
        description,
        table_name: tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        scoring_type: scoringType,
        passing_threshold: passingThresholdNum,
        channels: selectedChannels,
        is_active: isActive
      };

      // Show loading state (disable submit button with visual feedback)
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <svg class="spinner" style="width: 1rem; height: 1rem; animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke-linecap="round"/>
            </svg>
            Creating...
          </span>
        `;
      }

      logInfo('Creating scorecard', { 
        name, 
        tableName: scorecardData.table_name,
        scoringType,
        parameterCount: collectedParameters.length 
      });

      await this.controller.service.createScorecard(scorecardData, collectedParameters);
      
      logInfo('Scorecard created successfully');
      this.close();
      await this.controller.loadScorecards();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logError('Failed to create scorecard', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        scorecardName: name,
        tableName: tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        scoringType,
        parameterCount: parameters.length
      });
      
      console.error('[CreateModal] Full error details:', error);
      console.error('[CreateModal] Scorecard data that failed:', {
        name,
        tableName: tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        scoringType,
        passingThreshold,
        channels: selectedChannels,
        parameterCount: parameters.length
      });
      
      alert('Failed to create scorecard: ' + errorMessage);
      
      // Re-enable submit button on error
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.innerHTML = originalHTML;
      }
    }
  }
}

