/**
 * Unified Audit Controller
 * Controls the unified audit page for create, edit, and view modes
 * Uses the shared component architecture from audit-form
 */

import { 
  AuditFormOrchestrator,
  RatingSection,
  ReversalSection,
  ActionButtons
} from '../../audit-form/presentation/components/index.js';
import { getAuditDataService } from '../../audit-form/domain/services/audit-data-service.js';
import { getPermissionService, type AuditPermissions } from '../../audit-form/domain/services/permission-service.js';
import type { AuditFormMode } from '../../audit-form/domain/types.js';
import { isEditableMode, getHeaderGradient } from '../../audit-form/domain/types.js';
import type { AuditFormData, Scorecard, ScorecardParameter } from '../../audit-form/domain/entities.js';

export interface UnifiedAuditConfig {
  /** Container element for the audit page */
  container: HTMLElement;
  /** Called when navigation is needed */
  onNavigate?: (url: string) => void;
}

export interface AuditPageState {
  mode: AuditFormMode;
  auditId: string | null;
  scorecardId: string | null;
  tableName: string | null;
  audit: Partial<AuditFormData> | null;
  scorecard: Scorecard | null;
  parameters: ScorecardParameter[];
  permissions: AuditPermissions | null;
}

export class UnifiedAuditController {
  private config: UnifiedAuditConfig;
  private state: AuditPageState;
  private orchestrator: AuditFormOrchestrator | null = null;
  private ratingSection: RatingSection | null = null;
  private reversalSection: ReversalSection | null = null;
  private actionButtons: ActionButtons | null = null;

  constructor(config: UnifiedAuditConfig) {
    this.config = config;
    this.state = {
      mode: 'create',
      auditId: null,
      scorecardId: null,
      tableName: null,
      audit: null,
      scorecard: null,
      parameters: [],
      permissions: null
    };
  }

  /**
   * Initialize the controller
   * Parses URL parameters to determine mode
   */
  async initialize(): Promise<void> {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const auditId = urlParams.get('id') || urlParams.get('edit');
    const scorecardId = urlParams.get('scorecard');
    const tableName = urlParams.get('table');
    const modeParam = urlParams.get('mode');

    // Determine mode
    let mode: AuditFormMode = 'create';
    if (urlParams.has('edit')) {
      mode = 'edit';
    } else if (auditId && !urlParams.has('mode')) {
      mode = 'view';
    } else if (modeParam === 'create' || modeParam === 'edit' || modeParam === 'view') {
      mode = modeParam;
    }

    this.state.mode = mode;
    this.state.auditId = auditId;
    this.state.scorecardId = scorecardId;
    this.state.tableName = tableName;

    console.log('[UnifiedAudit] Initializing in mode:', mode, { auditId, scorecardId, tableName });

    // Initialize services
    const auditService = getAuditDataService();
    const permissionService = getPermissionService();
    
    await auditService.initialize();
    await permissionService.initialize();

    // Load audit data if in edit/view mode
    if ((mode === 'edit' || mode === 'view') && auditId && tableName) {
      const result = await auditService.loadAudit(auditId, tableName, scorecardId || undefined);
      
      if (result.error || !result.audit) {
        console.error('[UnifiedAudit] Failed to load audit:', result.error);
        this.showError('Failed to load audit: ' + (result.error?.message || 'Unknown error'));
        return;
      }

      this.state.audit = result.audit;
      this.state.scorecard = result.scorecard;
      this.state.parameters = result.parameters;

      // Get permissions
      this.state.permissions = permissionService.getPermissions(result.audit);
    }

    // Render the page
    await this.render();
  }

  /**
   * Render the unified audit page
   */
  private async render(): Promise<void> {
    const { mode, audit, permissions } = this.state;
    const isViewMode = mode === 'view';

    // Initialize orchestrator
    this.orchestrator = new AuditFormOrchestrator({
      mode,
      audit: audit || undefined,
      auditId: this.state.auditId || undefined,
      scorecardId: this.state.scorecardId || undefined,
      tableName: this.state.tableName || undefined,
      onFormSubmit: (formData) => this.handleFormSubmit(formData),
      onFormCancel: () => this.handleCancel(),
      onEdit: () => this.handleEdit(),
      onAcknowledge: () => this.handleAcknowledge(),
      onRequestReversal: () => this.handleRequestReversal()
    });

    // Get form element
    const formElement = this.config.container.querySelector('#auditForm') as HTMLFormElement;
    if (formElement) {
      await this.orchestrator.initialize(formElement);
    }

    // Initialize view-mode specific components
    if (isViewMode) {
      this.initializeViewModeComponents();
    }

    // Initialize action buttons
    this.initializeActionButtons();

    // Update header based on mode and audit status
    this.updateHeaderAppearance();

    console.log('[UnifiedAudit] Render complete');
  }

  /**
   * Initialize view-mode specific components
   */
  private initializeViewModeComponents(): void {
    const { audit, permissions } = this.state;
    
    // Cast to Record to allow flexible property access (supports both camelCase and snake_case from DB)
    const auditRecord = audit as Record<string, any> | null;

    // Rating section (only if acknowledged)
    const ratingContainer = document.getElementById('ratingSection');
    if (ratingContainer && permissions?.canRate) {
      this.ratingSection = new RatingSection({
        enabled: permissions.canRate,
        currentRating: auditRecord?.audit_rating ?? auditRecord?.auditRating,
        currentFeedback: auditRecord?.audit_rating_feedback ?? auditRecord?.auditRatingFeedback,
        ratedAt: auditRecord?.audit_rated_at ?? auditRecord?.auditRatedAt,
        onRateSubmit: (rating, feedback) => this.handleRatingSubmit(rating, feedback)
      });
      this.ratingSection.initializeWithExistingDOM();
    }

    // Reversal section
    const reversalContainer = document.getElementById('reversalSection');
    if (reversalContainer) {
      this.reversalSection = new ReversalSection({
        canRequest: permissions?.canRequestReversal || false,
        canRespond: permissions?.canRespondToReversal || false,
        reversalData: auditRecord ? {
          requestedAt: auditRecord.reversal_requested_at ?? auditRecord.reversalRequestedAt,
          respondedAt: auditRecord.reversal_responded_at ?? auditRecord.reversalRespondedAt,
          status: auditRecord.reversal_status ?? auditRecord.reversalStatus,
          approved: auditRecord.reversal_approved ?? auditRecord.reversalApproved,
          type: auditRecord.reversal_type ?? auditRecord.reversalType,
          justification: auditRecord.reversal_justification_from_agent ?? auditRecord.reversalJustificationFromAgent,
          auditorResponse: auditRecord.response_from_auditor ?? auditRecord.responseFromAuditor,
          resolvedBy: auditRecord.reversal_resolved_by ?? auditRecord.reversalResolvedBy
        } : undefined,
        onRequestReversal: (justification, type) => this.handleReversalRequest(justification, type),
        onRespondToReversal: (approved, response) => this.handleReversalResponse(approved, response)
      });
      this.reversalSection.initializeWithExistingDOM();
    }
  }

  /**
   * Initialize action buttons
   */
  private initializeActionButtons(): void {
    const container = document.getElementById('actionButtonsContainer');
    if (container) {
      this.actionButtons = new ActionButtons({
        mode: this.state.mode,
        permissions: this.state.permissions || undefined,
        onCancel: () => this.handleCancel(),
        onSubmit: () => this.handleSubmit(),
        onEdit: () => this.handleEdit(),
        onAcknowledge: () => this.handleAcknowledge(),
        onRequestReversal: () => this.handleRequestReversal()
      });
      this.actionButtons.initializeWithExistingDOM();
    }
  }

  /**
   * Update header appearance based on mode and status
   */
  private updateHeaderAppearance(): void {
    const header = document.getElementById('auditFormHeader');
    if (!header) return;

    const { mode, audit } = this.state;
    // Cast to Record to allow flexible property access (supports both camelCase and snake_case from DB)
    const auditRecord = audit as Record<string, any> | null;
    const passingStatus = auditRecord?.passingStatus ?? auditRecord?.passing_status;
    
    header.style.background = getHeaderGradient(mode, passingStatus);

    // Update title
    const titleEl = header.querySelector('h2');
    if (titleEl) {
      switch (mode) {
        case 'create':
          titleEl.textContent = 'Create New Audit';
          break;
        case 'edit':
          titleEl.textContent = 'Edit Audit';
          break;
        case 'view':
          titleEl.textContent = 'Audit Details';
          break;
      }
    }
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(formData: FormData): Promise<void> {
    console.log('[UnifiedAudit] Form submitted');
    // The actual submission is handled by the existing form logic
    // This is a hook for any additional processing needed
  }

  /**
   * Handle submit button click
   */
  private async handleSubmit(): Promise<void> {
    const form = this.config.container.querySelector('#auditForm') as HTMLFormElement;
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }

  /**
   * Handle cancel button click
   */
  private handleCancel(): void {
    console.log('[UnifiedAudit] Cancel clicked');
    
    // Navigate back or to audit reports
    if (this.config.onNavigate) {
      this.config.onNavigate('/audit-reports.html');
    } else {
      window.history.back();
    }
  }

  /**
   * Handle edit button click (view mode)
   */
  private handleEdit(): void {
    console.log('[UnifiedAudit] Edit clicked');
    
    const { auditId, scorecardId, tableName } = this.state;
    
    if (auditId && scorecardId && tableName) {
      // Navigate to edit mode
      const editUrl = `/src/features/audit/presentation/unified-audit.html?mode=edit&id=${auditId}&scorecard=${scorecardId}&table=${tableName}`;
      
      if (this.config.onNavigate) {
        this.config.onNavigate(editUrl);
      } else {
        window.location.href = editUrl;
      }
    }
  }

  /**
   * Handle acknowledge button click
   */
  private async handleAcknowledge(): Promise<void> {
    console.log('[UnifiedAudit] Acknowledge clicked');
    
    // Call existing acknowledge function if available
    if (typeof (window as any).acknowledgeAudit === 'function') {
      await (window as any).acknowledgeAudit();
    }
  }

  /**
   * Handle request reversal button click
   */
  private handleRequestReversal(): void {
    console.log('[UnifiedAudit] Request reversal clicked');
    
    // Scroll to reversal section
    const reversalSection = document.getElementById('reversalSection');
    if (reversalSection) {
      reversalSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Handle rating submission
   */
  private async handleRatingSubmit(rating: number, feedback: string): Promise<void> {
    console.log('[UnifiedAudit] Rating submitted:', { rating, feedback });
    
    // Call existing rating function if available
    if (typeof (window as any).submitAuditRating === 'function') {
      await (window as any).submitAuditRating(rating, feedback);
    }
  }

  /**
   * Handle reversal request submission
   */
  private async handleReversalRequest(justification: string, type: string): Promise<void> {
    console.log('[UnifiedAudit] Reversal requested:', { justification, type });
    
    // Call existing reversal request function if available
    if (typeof (window as any).submitReversalRequest === 'function') {
      await (window as any).submitReversalRequest(justification, type);
    }
  }

  /**
   * Handle reversal response submission
   */
  private async handleReversalResponse(approved: boolean, response: string): Promise<void> {
    console.log('[UnifiedAudit] Reversal response:', { approved, response });
    
    // Call existing reversal response function if available
    if (typeof (window as any).submitReversalResponse === 'function') {
      await (window as any).submitReversalResponse(approved, response);
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const container = this.config.container;
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; padding: 2rem;">
        <svg style="width: 4rem; height: 4rem; color: #ef4444; margin-bottom: 1rem;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <h2 style="font-size: 1.5rem; color: #374151; margin-bottom: 0.5rem; font-family: 'Poppins', sans-serif;">Error Loading Audit</h2>
        <p style="color: #6b7280; font-family: 'Poppins', sans-serif; text-align: center; max-width: 400px;">${message}</p>
        <button 
          onclick="window.history.back()"
          style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #1A733E; color: white; border: none; border-radius: 0.5rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer;"
        >
          Go Back
        </button>
      </div>
    `;
  }

  /**
   * Switch mode
   */
  async switchMode(mode: AuditFormMode): Promise<void> {
    this.state.mode = mode;
    
    // Update orchestrator mode
    if (this.orchestrator) {
      this.orchestrator.setMode(mode);
    }

    // Update action buttons
    if (this.actionButtons) {
      this.actionButtons.setMode(mode);
    }

    // Update header
    this.updateHeaderAppearance();
  }

  /**
   * Get current state
   */
  getState(): AuditPageState {
    return { ...this.state };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.orchestrator?.destroy();
    this.ratingSection?.destroy();
    this.reversalSection?.destroy();
    this.actionButtons?.destroy();
  }
}

/**
 * Initialize unified audit page
 */
export async function initializeUnifiedAudit(container: HTMLElement): Promise<UnifiedAuditController> {
  const controller = new UnifiedAuditController({ container });
  await controller.initialize();
  return controller;
}

// Export for window access
if (typeof window !== 'undefined') {
  (window as any).UnifiedAuditController = UnifiedAuditController;
  (window as any).initializeUnifiedAudit = initializeUnifiedAudit;
}
