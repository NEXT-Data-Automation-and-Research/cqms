/**
 * Audit Form Orchestrator
 * Main controller that ties all components together
 */

import { AuditTimer, type AuditTimerConfig } from './audit-timer.js';
import { FormHeaderComponent, type FormHeaderConfig } from './form-header-component.js';
import { AIAuditIndicatorComponent, type AIAuditIndicatorConfig } from './ai-audit-indicator-component.js';
import { TranscriptSection, type TranscriptSectionConfig } from './transcript-section.js';
import { ErrorDetailsSection, type ErrorDetailsSectionConfig } from './error-details-section.js';
import { FormActions, type FormActionsConfig } from './form-actions.js';
import { SplitterComponent } from './splitter-component.js';

export interface AuditFormOrchestratorConfig {
  timer?: AuditTimerConfig;
  header?: FormHeaderConfig;
  aiIndicator?: AIAuditIndicatorConfig;
  transcript?: TranscriptSectionConfig;
  errorDetails?: ErrorDetailsSectionConfig;
  formActions?: FormActionsConfig;
  onFormSubmit?: (formData: FormData) => void | Promise<void>;
  onFormCancel?: () => void;
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

  constructor(config: AuditFormOrchestratorConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize and render all components
   * Works with existing HTML structure - enhances rather than replaces
   */
  async initialize(formElement: HTMLFormElement): Promise<void> {
    this.formElement = formElement;

    // Initialize Timer - use existing timer element if it exists
    const existingTimer = document.getElementById('auditTimer');
    if (existingTimer) {
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

    // Setup form submission handler
    if (this.formElement) {
      this.formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Setup splitter if it exists
    this.setupSplitter();
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
