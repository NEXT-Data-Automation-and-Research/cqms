/**
 * Create Scorecard Modal
 * Handles creating new scorecards
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';
import { logError, logInfo } from '../../../../../utils/logging-helper.js';
import type { Scorecard, ScorecardParameter, Channel } from '../../domain/entities.js';
import { ParameterTable } from './components/parameter-table.js';
import { ChannelCheckboxes } from './components/channel-checkboxes.js';
import { collectParametersFromDOM, getScoringTypeHelpText, getParametersHeaderText } from './utils/form-helpers.js';
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
      
      // Initialize parameter table
      const parametersContainer = document.getElementById('createParametersContainer');
      if (!parametersContainer) {
        throw new Error('Parameters container element (createParametersContainer) not found in modal HTML');
      }
      this.parameterTable = new ParameterTable('createParametersContainer');
      this.parameterTable.setScoringType('deductive'); // Default
      
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
    const closeBtn = document.getElementById('createScorecardModalClose');
    const cancelBtn = document.getElementById('createScorecardCancelBtn');
    const submitBtn = document.getElementById('createScorecardSubmitBtn');
    const form = document.getElementById('createScorecardForm') as HTMLFormElement;

    const closeModal = () => this.close();

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Close on backdrop click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          closeModal();
        }
      });
    }

    if (submitBtn && form) {
      submitBtn.addEventListener('click', async () => {
        await this.handleSubmit();
      });
    }
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(): Promise<void> {
    const form = document.getElementById('createScorecardForm') as HTMLFormElement;
    if (!form) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Validate channels
    if (!this.channelCheckboxes || !this.channelCheckboxes.validate()) {
      alert('Please select at least one channel');
      return;
    }

    // Get parameters
    const parameters = this.parameterTable?.getParameters() || [];
    if (parameters.length === 0) {
      alert('Please add at least one parameter');
      return;
    }

    const name = (document.getElementById('createScorecardName') as HTMLInputElement)?.value.trim();
    const description = (document.getElementById('createScorecardDescription') as HTMLTextAreaElement)?.value.trim() || null;
    const tableName = (document.getElementById('createScorecardTableName') as HTMLInputElement)?.value.trim();
    const scoringType = (document.getElementById('createScorecardScoringType') as HTMLSelectElement)?.value;
    const passingThreshold = parseFloat((document.getElementById('createScorecardPassingThreshold') as HTMLInputElement)?.value || '0');
    const isActive = (document.getElementById('createScorecardIsActive') as HTMLInputElement)?.checked ?? true;

    const selectedChannels = this.channelCheckboxes.getSelectedChannels().join(', ');

    try {
      // Collect parameter data from form
      const collectedParameters = collectParametersFromDOM('createParametersContainer', ''); // scorecard_id will be set after creation

      const scorecardData: Partial<Scorecard> = {
        name,
        description,
        table_name: tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        scoring_type: scoringType,
        passing_threshold: passingThreshold,
        channels: selectedChannels,
        is_active: isActive
      };

      await this.controller.service.createScorecard(scorecardData, collectedParameters);
      
      logInfo('Scorecard created successfully');
      this.close();
      await this.controller.loadScorecards();
    } catch (error) {
      logError('Failed to create scorecard', error);
      alert('Failed to create scorecard: ' + (error as Error).message);
    }
  }
}

