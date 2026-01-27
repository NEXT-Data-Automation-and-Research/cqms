/**
 * Audit Form Orchestrator
 * Main controller that ties all components together
 * Supports create, edit, and view modes
 */

import { AuditTimer, type AuditTimerConfig } from './audit-timer.js';
import { FormHeaderComponent, type FormHeaderConfig } from './form-header-component.js';
import { AIAuditIndicatorComponent, type AIAuditIndicatorConfig } from './ai-audit-indicator-component.js';
import { TranscriptSection, type TranscriptSectionConfig } from './transcript-section.js';
import { ErrorDetailsSection, type ErrorDetailsSectionConfig } from './error-details-section.js';
import { FormActions, type FormActionsConfig } from './form-actions.js';
import { SplitterComponent } from './splitter-component.js';
import type { AuditFormMode } from '../../domain/types.js';
import { isEditableMode, getDefaultHeaderTitle, getHeaderGradient } from '../../domain/types.js';
import type { AuditFormData } from '../../domain/entities.js';

export interface AuditFormOrchestratorConfig {
  /** Form mode: 'create', 'edit', or 'view' */
  mode?: AuditFormMode;
  /** Audit data for edit/view modes */
  audit?: Partial<AuditFormData>;
  /** Audit ID for edit/view modes */
  auditId?: string;
  /** Scorecard ID */
  scorecardId?: string;
  /** Table name for the scorecard */
  tableName?: string;
  timer?: AuditTimerConfig;
  header?: FormHeaderConfig;
  aiIndicator?: AIAuditIndicatorConfig;
  transcript?: TranscriptSectionConfig;
  errorDetails?: ErrorDetailsSectionConfig;
  formActions?: FormActionsConfig;
  onFormSubmit?: (formData: FormData) => void | Promise<void>;
  onFormCancel?: () => void;
  /** Called when edit button is clicked in view mode */
  onEdit?: () => void;
  /** Called when acknowledge button is clicked in view mode */
  onAcknowledge?: () => void;
  /** Called when reversal request button is clicked in view mode */
  onRequestReversal?: () => void;
}

export class AuditFormOrchestrator {
  private timer: AuditTimer | null = null;
  private header: FormHeaderComponent | null = null;
  private aiIndicator: AIAuditIndicatorComponent | null = null;
  private transcript: TranscriptSection | null = null;
  private errorDetails: ErrorDetailsSection | null = null;
  private formActions: FormActions | null = null;
  private config: AuditFormOrchestratorConfig;
  private formElement: HTMLFormElement | null = null;
  private mode: AuditFormMode = 'create';

  constructor(config: AuditFormOrchestratorConfig = {}) {
    this.config = config;
    this.mode = config.mode || 'create';
  }

  /**
   * Get current mode
   */
  getMode(): AuditFormMode {
    return this.mode;
  }

  /**
   * Set mode and update UI accordingly
   */
  setMode(mode: AuditFormMode): void {
    this.mode = mode;
    this.updateModeUI();
  }

  /**
   * Check if current mode is editable
   */
  isEditable(): boolean {
    return isEditableMode(this.mode);
  }

  /**
   * Update UI based on current mode
   */
  private updateModeUI(): void {
    const isViewMode = this.mode === 'view';
    
    // Update form fields editability
    if (this.formElement) {
      const inputs = this.formElement.querySelectorAll('input, select, textarea');
      inputs.forEach((input) => {
        const el = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        // Don't disable hidden fields
        if (el.type === 'hidden') return;
        
        if (isViewMode) {
          el.setAttribute('readonly', 'true');
          if (el.tagName === 'SELECT') {
            el.setAttribute('disabled', 'true');
          }
        } else {
          el.removeAttribute('readonly');
          el.removeAttribute('disabled');
        }
      });
    }

    // Update header title
    if (this.header) {
      const title = this.config.header?.headerOptions?.title || getDefaultHeaderTitle(this.mode);
      this.header.updateTitle(title);
    }

    // Show/hide timer based on mode (timer only in create/edit modes)
    if (this.timer) {
      if (isViewMode) {
        this.timer.hide();
      } else {
        this.timer.show();
      }
    }

    // Update form actions visibility
    this.updateFormActionsForMode();
  }

  /**
   * Update form actions based on mode
   */
  private updateFormActionsForMode(): void {
    const submitBtn = document.getElementById('submitAuditBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const editBtn = document.getElementById('editAuditBtn');
    const acknowledgeBtn = document.getElementById('acknowledgeBtn');
    const reversalBtn = document.getElementById('requestReversalBtn');

    const isViewMode = this.mode === 'view';
    const isCreateMode = this.mode === 'create';
    const isEditMode = this.mode === 'edit';

    // Submit button: visible in create/edit modes
    if (submitBtn) {
      submitBtn.style.display = (isCreateMode || isEditMode) ? '' : 'none';
      if (submitBtn.textContent) {
        submitBtn.textContent = isCreateMode ? 'Submit Audit' : 'Update Audit';
      }
    }

    // Cancel button: visible in create/edit modes
    if (cancelBtn) {
      cancelBtn.style.display = (isCreateMode || isEditMode) ? '' : 'none';
    }

    // Edit button: visible in view mode (visibility controlled by permissions elsewhere)
    if (editBtn) {
      editBtn.style.display = isViewMode ? '' : 'none';
    }

    // Acknowledge button: visible in view mode (visibility controlled by permissions elsewhere)
    if (acknowledgeBtn) {
      acknowledgeBtn.style.display = isViewMode ? '' : 'none';
    }

    // Reversal button: visible in view mode (visibility controlled by permissions elsewhere)
    if (reversalBtn) {
      reversalBtn.style.display = isViewMode ? '' : 'none';
    }
  }

  /**
   * Initialize and render all components
   * Works with existing HTML structure - enhances rather than replaces
   */
  async initialize(formElement: HTMLFormElement): Promise<void> {
    this.formElement = formElement;
    this.mode = this.config.mode || 'create';

    const isViewMode = this.mode === 'view';

    // Initialize Timer - use existing timer element if it exists (not in view mode)
    const existingTimer = document.getElementById('auditTimer');
    if (existingTimer && !isViewMode) {
      const timerContainer = document.createElement('div');
      timerContainer.id = 'auditTimerContainer';
      existingTimer.parentNode?.insertBefore(timerContainer, existingTimer);
      existingTimer.remove();
      
      this.timer = new AuditTimer({
        onClose: () => {
          this.timer?.hide();
        },
        ...this.config.timer
      });
      this.timer.render(timerContainer);
    } else if (existingTimer && isViewMode) {
      // Hide timer in view mode
      existingTimer.style.display = 'none';
    }

    // Initialize Header - enhance existing header
    const existingHeader = document.getElementById('auditFormHeader');
    if (existingHeader) {
      this.header = new FormHeaderComponent({
        onClose: () => {
          this.config.onFormCancel?.();
        },
        ...this.config.header
      });
      this.header.render(existingHeader);
    }

    // Initialize AI Indicator - enhance existing indicator
    const existingAIIndicator = document.getElementById('aiAuditIndicator');
    if (existingAIIndicator) {
      this.aiIndicator = new AIAuditIndicatorComponent({
        onClear: () => {
          // Handle AI audit clear - call existing function if available
          if (typeof (window as any).clearAIAuditData === 'function') {
            (window as any).clearAIAuditData();
          }
          this.aiIndicator?.hide();
        },
        ...this.config.aiIndicator
      });
      this.aiIndicator.render(existingAIIndicator);
    }

    // Initialize Transcript Section - enhance existing left column
    const existingLeftColumn = document.getElementById('leftColumn');
    if (existingLeftColumn) {
      this.transcript = new TranscriptSection({
        onInteractionIdChange: (id) => {
          // Trigger existing handlers if available
          const input = document.getElementById('interactionId') as HTMLInputElement;
          if (input) {
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        onViewChat: () => {
          // Trigger existing view chat handler if available
          const btn = document.getElementById('viewChatBtn') as HTMLButtonElement | null;
          if (btn && !btn.disabled) {
            btn.click();
          }
        },
        onCopyConversationId: () => {
          if (typeof (window as any).copyConversationId === 'function') {
            (window as any).copyConversationId();
          }
        },
        onCopyClientEmail: () => {
          if (typeof (window as any).copyClientEmail === 'function') {
            (window as any).copyClientEmail();
          }
        },
        ...this.config.transcript
      });
      // Don't replace, just enhance with event listeners
      this.transcript.initializeWithExistingDOM();
    }

    // Initialize Error Details Section - enhance existing right column
    const existingRightColumn = document.getElementById('rightColumn');
    if (existingRightColumn) {
      this.errorDetails = new ErrorDetailsSection({
        onScorecardChange: (scorecardId) => {
          // Trigger existing scorecard change handler
          const select = document.getElementById('scorecardSelect') as HTMLSelectElement;
          if (select) {
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        onChannelChange: (channel) => {
          // Trigger existing channel change handler
          const select = document.getElementById('channel') as HTMLSelectElement;
          if (select) {
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        ...this.config.errorDetails
      });
      // Don't replace, just enhance with event listeners
      this.errorDetails.initializeWithExistingDOM();
      
      // Ensure channels are loaded if they haven't been already
      await this.ensureChannelsLoaded();
    }

    // Initialize Form Actions - enhance existing form actions
    const existingFormActions = formElement.querySelector('[id="cancelBtn"], [id="submitAuditBtn"]')?.parentElement;
    if (existingFormActions) {
      this.formActions = new FormActions({
        onSubmit: () => {
          this.handleFormSubmit();
        },
        onCancel: () => {
          this.config.onFormCancel?.();
        },
        ...this.config.formActions
      });
      // Enhance existing actions rather than replacing
      this.formActions.initializeWithExistingDOM();
    }

    // Setup form submission handler (only in editable modes)
    if (this.formElement && !isViewMode) {
      this.formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Setup splitter if it exists
    this.setupSplitter();

    // Apply mode-specific UI updates
    this.updateModeUI();

    console.log(`[Orchestrator] Initialized in ${this.mode} mode`);
  }

  /**
   * Load audit data for edit/view modes
   */
  async loadAuditData(auditId: string, tableName: string, scorecardId?: string): Promise<boolean> {
    try {
      const { getAuditDataService } = await import('../../domain/services/audit-data-service.js');
      const service = getAuditDataService();
      
      const result = await service.loadAudit(auditId, tableName, scorecardId);
      
      if (result.error || !result.audit) {
        console.error('[Orchestrator] Failed to load audit:', result.error);
        return false;
      }

      // Store audit data in config for components to access
      this.config.audit = result.audit;
      
      // Populate form with audit data
      await this.populateForm(result.audit);
      
      return true;
    } catch (error) {
      console.error('[Orchestrator] Error loading audit data:', error);
      return false;
    }
  }

  /**
   * Populate form with audit data
   */
  async populateForm(audit: Partial<AuditFormData>): Promise<void> {
    if (!this.formElement) return;

    // Map of field IDs to audit properties
    const fieldMappings: Record<string, keyof AuditFormData> = {
      'employeeEmail': 'employeeEmail',
      'employeeName': 'employeeName',
      'employeeType': 'employeeType',
      'employeeDepartment': 'employeeDepartment',
      'countryOfEmployee': 'countryOfEmployee',
      'interactionId': 'interactionId',
      'interactionDate': 'interactionDate',
      'channel': 'channel',
      'clientEmail': 'clientEmail',
      'transcript': 'transcript',
      'averageScore': 'averageScore',
      'passingStatus': 'passingStatus',
      'recommendations': 'recommendations',
      'validationStatus': 'validationStatus',
    };

    for (const [fieldId, auditKey] of Object.entries(fieldMappings)) {
      const element = document.getElementById(fieldId) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (element && audit[auditKey] !== undefined && audit[auditKey] !== null) {
        element.value = String(audit[auditKey]);
      }
    }

    // Update header gradient based on passing status in view mode
    if (this.mode === 'view' && audit.passingStatus) {
      const header = document.getElementById('auditFormHeader');
      if (header) {
        header.style.background = getHeaderGradient(this.mode, audit.passingStatus);
      }
    }

    console.log('[Orchestrator] Form populated with audit data');
  }

  /**
   * Ensure channels are loaded
   */
  private async ensureChannelsLoaded(): Promise<void> {
    const channelSelect = document.getElementById('channel') as HTMLSelectElement;
    if (!channelSelect) {
      console.warn('[Orchestrator] Channel select element not found');
      return;
    }

    // Check if channels are already loaded (more than just the default "Select..." option)
    if (channelSelect.options.length <= 1) {
      console.log('[Orchestrator] Channels not loaded, loading now...');
      
      // Try multiple methods to load channels
      let channelsLoaded = false;
      
      // Method 1: Try window.loadChannels if available
      if (typeof (window as any).loadChannels === 'function') {
        try {
          await (window as any).loadChannels();
          channelsLoaded = true;
          console.log('[Orchestrator] Channels loaded via window.loadChannels');
        } catch (error) {
          console.warn('[Orchestrator] Failed to load channels via window.loadChannels:', error);
        }
      }
      
      // Method 2: Try importing loadChannels from dropdown-loader
      if (!channelsLoaded) {
        try {
          const { loadChannels } = await import('../utils/dropdown-loader.js');
          await loadChannels();
          channelsLoaded = true;
          console.log('[Orchestrator] Channels loaded via dropdown-loader import');
        } catch (error) {
          console.warn('[Orchestrator] Failed to load channels via import:', error);
        }
      }
      
      // Method 3: Try using DropdownLoader class directly
      if (!channelsLoaded) {
        try {
          const { getDropdownLoader } = await import('../utils/dropdown-loader.js');
          const loader = getDropdownLoader();
          await loader.loadChannels();
          channelsLoaded = true;
          console.log('[Orchestrator] Channels loaded via DropdownLoader instance');
        } catch (error) {
          console.warn('[Orchestrator] Failed to load channels via DropdownLoader:', error);
        }
      }
      
      if (!channelsLoaded) {
        console.error('[Orchestrator] All methods to load channels failed');
      }
    } else {
      console.log('[Orchestrator] Channels already loaded:', channelSelect.options.length, 'options');
    }
  }

  /**
   * Setup resizable splitter between columns
   */
  private setupSplitter(): void {
    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');
    const splitter = document.getElementById('splitter');
    
    if (leftColumn && rightColumn && splitter) {
      const splitterComponent = new SplitterComponent();
      splitterComponent.render(splitter, leftColumn, rightColumn);
    }
  }

  /**
   * Create a container element
   */
  private createContainer(id: string): HTMLElement {
    const container = document.createElement('div');
    container.id = id;
    return container;
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(): Promise<void> {
    if (!this.formElement) return;

    const formData = new FormData(this.formElement);
    
    // Add timer duration if available
    if (this.timer) {
      formData.set('auditDuration', this.timer.getElapsedTime().toString());
    }

    // Set loading state
    if (this.formActions) {
      this.formActions.setSubmitLoading(true);
    }

    try {
      if (this.config.onFormSubmit) {
        await this.config.onFormSubmit(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      // Reset loading state on error
      if (this.formActions) {
        this.formActions.setSubmitLoading(false);
      }
    }
  }

  /**
   * Get timer instance
   */
  getTimer(): AuditTimer | null {
    return this.timer;
  }

  /**
   * Get header instance
   */
  getHeader(): FormHeaderComponent | null {
    return this.header;
  }

  /**
   * Get AI indicator instance
   */
  getAIIndicator(): AIAuditIndicatorComponent | null {
    return this.aiIndicator;
  }

  /**
   * Get transcript section instance
   */
  getTranscript(): TranscriptSection | null {
    return this.transcript;
  }

  /**
   * Get error details section instance
   */
  getErrorDetails(): ErrorDetailsSection | null {
    return this.errorDetails;
  }

  /**
   * Get form actions instance
   */
  getFormActions(): FormActions | null {
    return this.formActions;
  }

  /**
   * Cleanup all components
   */
  destroy(): void {
    this.timer?.destroy();
    this.header?.destroy();
    this.aiIndicator?.destroy();
    this.transcript?.destroy();
    this.errorDetails?.destroy();
    this.formActions?.destroy();

    this.timer = null;
    this.header = null;
    this.aiIndicator = null;
    this.transcript = null;
    this.errorDetails = null;
    this.formActions = null;
  }
}
