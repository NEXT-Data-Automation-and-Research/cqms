/**
 * Edit Scorecard Modal
 * Handles editing existing scorecards
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';
import { logError, logInfo } from '../../../../../utils/logging-helper.js';
import type { Scorecard, ScorecardParameter, Channel } from '../../domain/entities.js';
import { ParameterTable } from './components/parameter-table.js';
import { ChannelCheckboxes } from './components/channel-checkboxes.js';
import { collectParametersFromDOM, getScoringTypeHelpText, getParametersHeaderText } from './utils/form-helpers.js';
import { renderEditModalHTML } from './utils/modal-renderer.js';
import { detectChanges, checkParametersChanged } from './utils/change-detection.js';

export class EditScorecardModal {
  private modal: HTMLElement | null;
  private controller: any;
  private currentScorecard: Scorecard | null = null;
  private parameterTable: ParameterTable | null = null;
  private channelCheckboxes: ChannelCheckboxes | null = null;
  private currentParameters: ScorecardParameter[] = [];

  constructor(controller: any) {
    this.controller = controller;
    this.modal = document.getElementById('scorecardModal');
  }

  /**
   * Open edit modal
   */
  open(scorecard: Scorecard, parameters: ScorecardParameter[]): void {
    try {
      if (!this.modal) {
        logError('Edit scorecard modal element not found');
        throw new Error('Edit scorecard modal element not found. Make sure the modal HTML is loaded.');
      }

      this.currentScorecard = scorecard;
      this.render(scorecard, parameters);
      this.modal.classList.add('active');
      this.attachEventListeners();
    } catch (error) {
      logError('Failed to open edit modal', {
        message: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      throw error; // Re-throw to let controller handle it
    }
  }

  /**
   * Close modal
   */
  close(): void {
    if (this.modal) {
      this.modal.classList.remove('active');
      this.currentScorecard = null;
    }
  }

  /**
   * Render modal content
   */
  private render(scorecard: Scorecard, parameters: ScorecardParameter[]): void {
    if (!this.modal) {
      throw new Error('Modal element not found');
    }

    try {
      this.currentParameters = parameters;
      const channels = this.controller.getAvailableChannels();
      const selectedChannelNames = scorecard.channels?.split(',').map(c => c.trim()).filter(Boolean) || [];

      safeSetHTML(this.modal, renderEditModalHTML(scorecard));
      
      // Initialize parameter table
      const parametersContainer = document.getElementById('editParametersContainer');
      if (!parametersContainer) {
        throw new Error('Parameters container element (editParametersContainer) not found in modal HTML');
      }
      this.parameterTable = new ParameterTable('editParametersContainer');
      this.parameterTable.setScoringType(scorecard.scoring_type || 'deductive');
      this.parameterTable.setParameters(parameters);
      
      // Initialize channel checkboxes
      const channelsContainer = document.getElementById('editChannelsContainer');
      if (!channelsContainer) {
        throw new Error('Channels container element (editChannelsContainer) not found in modal HTML');
      }
      this.channelCheckboxes = new ChannelCheckboxes('editChannelsContainer');
      this.channelCheckboxes.setChannels(channels);
      this.channelCheckboxes.setSelectedChannels(selectedChannelNames);
      
      // Handle scoring type changes
      this.setupScoringTypeHandler();
    } catch (error) {
      logError('Failed to render edit modal', {
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
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const closeBtn = document.getElementById('editScorecardModalClose');
    const cancelBtn = document.getElementById('editScorecardCancelBtn');
    const submitBtn = document.getElementById('editScorecardSubmitBtn');
    const form = document.getElementById('editScorecardForm') as HTMLFormElement;

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
    if (!this.currentScorecard) return;

    const form = document.getElementById('editScorecardForm') as HTMLFormElement;
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

    // Validate parameters exist
    const parameters = this.parameterTable?.getParameters() || [];
    if (parameters.length === 0) {
      alert('Please add at least one parameter');
      return;
    }

    const id = (document.getElementById('editScorecardId') as HTMLInputElement)?.value;
    const name = (document.getElementById('editScorecardName') as HTMLInputElement)?.value.trim();
    const description = (document.getElementById('editScorecardDescription') as HTMLTextAreaElement)?.value.trim() || null;
    const scoringType = (document.getElementById('editScorecardScoringType') as HTMLSelectElement)?.value;
    const passingThreshold = parseFloat((document.getElementById('editScorecardPassingThreshold') as HTMLInputElement)?.value || '0');
    const isActive = (document.getElementById('editScorecardIsActive') as HTMLInputElement)?.checked ?? true;

    const selectedChannels = this.channelCheckboxes.getSelectedChannels().join(', ');

    try {
      // Collect parameter data from form
      const updatedParameters = collectParametersFromDOM('editParametersContainer', id);

      const updates: Partial<Scorecard> = {
        name,
        description,
        scoring_type: scoringType,
        passing_threshold: passingThreshold,
        channels: selectedChannels,
        is_active: isActive
      };

      // Detect changes to determine if we need versioning
      const changes = detectChanges(this.currentScorecard, updates, updatedParameters);
      changes.parametersChanged = checkParametersChanged(this.currentParameters, updatedParameters);

      // Check if we need to create a new version
      const needsNewVersion = 
        changes.parametersChanged || 
        changes.scoringTypeChanged || 
        changes.channelsRemoved.length > 0;

      if (needsNewVersion) {
        // For now, we'll update parameters in place
        // TODO: Implement full versioning logic with new table creation
        // This requires RPC call to create_audit_table which needs MCP setup
        logInfo('Changes detected that would require versioning, updating in place for now');
      }

      // Update scorecard with parameters
      await this.controller.service.updateScorecardWithParameters(id, updates, updatedParameters);
      
      logInfo('Scorecard updated successfully');
      this.close();
      await this.controller.loadScorecards();
    } catch (error) {
      logError('Failed to update scorecard', error);
      alert('Failed to update scorecard: ' + (error as Error).message);
    }
  }

  /**
   * Setup scoring type change handler
   */
  private setupScoringTypeHandler(): void {
    const scoringTypeSelect = document.getElementById('editScorecardScoringType') as HTMLSelectElement;
    if (!scoringTypeSelect) return;

    scoringTypeSelect.addEventListener('change', () => {
      const scoringType = scoringTypeSelect.value;
      const helpText = document.getElementById('editScoringTypeHelp');
      const parametersHeader = document.getElementById('editParametersHeader');
      
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
}

