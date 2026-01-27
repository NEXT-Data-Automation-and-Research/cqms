/**
 * Reversal Section Component
 * Handles the reversal request and response UI
 * Used in view mode for employees to request reversal and auditors to respond
 */

export interface ReversalData {
  requestedAt?: string;
  respondedAt?: string;
  status?: string;
  approved?: boolean | null;
  type?: string;
  justification?: string;
  attachments?: string[];
  approvedBy?: string;
  resolvedBy?: string;
  auditorResponse?: string;
  teamLeadApproved?: boolean | null;
  teamLeadReviewedBy?: string;
  teamLeadRejectionReason?: string;
}

export interface ReversalSectionConfig {
  /** Called when a reversal request is submitted */
  onRequestReversal?: (justification: string, type: string) => void | Promise<void>;
  /** Called when a reversal response is submitted */
  onRespondToReversal?: (approved: boolean, response: string) => void | Promise<void>;
  /** Current reversal data */
  reversalData?: ReversalData;
  /** Whether the user can request reversal */
  canRequest?: boolean;
  /** Whether the user can respond to reversal */
  canRespond?: boolean;
}

export class ReversalSection {
  private container: HTMLElement | null = null;
  private config: ReversalSectionConfig;

  constructor(config: ReversalSectionConfig = {}) {
    this.config = config;
  }

  /**
   * Render the reversal section
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Initialize with existing DOM
   */
  initializeWithExistingDOM(): void {
    this.container = document.getElementById('reversalSection');
    if (this.container) {
      this.attachEventListeners();
    }
  }

  /**
   * Get HTML template
   */
  private getHTML(): string {
    const data = this.config.reversalData;
    const hasReversal = !!data?.requestedAt;
    const isPending = hasReversal && !data?.respondedAt && data?.approved === null;
    const isResolved = hasReversal && (data?.respondedAt || data?.approved !== null);
    const canRequest = this.config.canRequest && !hasReversal;
    const canRespond = this.config.canRespond && isPending;

    if (!hasReversal && !canRequest) {
      return ''; // Nothing to show
    }

    return `
      <div id="reversalSection" style="background: #f9fafb; border-radius: 0.3234rem; padding: 0.6469rem; border: 0.0304rem solid ${isPending ? '#fbbf24' : isResolved ? (data?.approved ? '#10b981' : '#ef4444') : '#e5e7eb'}; margin-top: 0.6469rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4852rem;">
          <h3 style="font-size: 0.6064rem; font-weight: 600; color: #374151; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">
            <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="${isPending ? '#fbbf24' : isResolved ? (data?.approved ? '#10b981' : '#ef4444') : '#6b7280'}">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
            ${hasReversal ? 'Reversal Request' : 'Request Reversal'}
          </h3>
          ${hasReversal ? `
            <span style="font-size: 0.4447rem; padding: 0.1617rem 0.4852rem; border-radius: 0.8086rem; font-family: 'Poppins', sans-serif; font-weight: 600; background: ${isPending ? '#fef3c7' : data?.approved ? '#d1fae5' : '#fee2e2'}; color: ${isPending ? '#92400e' : data?.approved ? '#065f46' : '#991b1b'};">
              ${isPending ? 'Pending' : data?.approved ? 'Approved' : 'Rejected'}
            </span>
          ` : ''}
        </div>
        
        ${hasReversal ? this.getReversalDetailsHTML(data!, isPending, canRespond || false) : this.getRequestFormHTML()}
      </div>
    `;
  }

  /**
   * Get reversal details HTML (when reversal exists)
   */
  private getReversalDetailsHTML(data: ReversalData, isPending: boolean, canRespond: boolean): string {
    return `
      <div style="display: flex; flex-direction: column; gap: 0.4852rem;">
        <!-- Request Info -->
        <div style="background: white; padding: 0.4852rem; border-radius: 0.2425rem; border: 0.0304rem solid #e5e7eb;">
          <div style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; margin-bottom: 0.2425rem;">
            Requested on ${data.requestedAt ? new Date(data.requestedAt).toLocaleString() : 'N/A'}
            ${data.type ? ` • Type: ${data.type}` : ''}
          </div>
          <div style="font-size: 0.4852rem; color: #374151; font-family: 'Poppins', sans-serif;">
            ${data.justification || 'No justification provided'}
          </div>
        </div>
        
        ${data.respondedAt || data.auditorResponse ? `
          <!-- Response Info -->
          <div style="background: ${data.approved ? '#d1fae5' : '#fee2e2'}; padding: 0.4852rem; border-radius: 0.2425rem; border: 0.0304rem solid ${data.approved ? '#a7f3d0' : '#fecaca'};">
            <div style="font-size: 0.4447rem; color: ${data.approved ? '#065f46' : '#991b1b'}; font-family: 'Poppins', sans-serif; margin-bottom: 0.2425rem;">
              ${data.approved ? 'Approved' : 'Rejected'} on ${data.respondedAt ? new Date(data.respondedAt).toLocaleString() : 'N/A'}
              ${data.resolvedBy ? ` by ${data.resolvedBy}` : ''}
            </div>
            <div style="font-size: 0.4852rem; color: ${data.approved ? '#065f46' : '#991b1b'}; font-family: 'Poppins', sans-serif;">
              ${data.auditorResponse || 'No response provided'}
            </div>
          </div>
        ` : ''}
        
        ${canRespond ? this.getResponseFormHTML() : ''}
      </div>
    `;
  }

  /**
   * Get request form HTML (when no reversal exists)
   */
  private getRequestFormHTML(): string {
    if (!this.config.canRequest) return '';

    return `
      <div style="display: flex; flex-direction: column; gap: 0.4852rem;">
        <div>
          <label style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; display: block; margin-bottom: 0.1617rem;">
            Reversal Type
          </label>
          <select 
            id="reversalType"
            style="width: 100%; padding: 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif;"
          >
            <option value="">Select type...</option>
            <option value="Score Dispute">Score Dispute</option>
            <option value="Incorrect Parameters">Incorrect Parameters</option>
            <option value="Context Not Considered">Context Not Considered</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div>
          <label style="font-size: 0.4447rem; color: #6b7280; font-family: 'Poppins', sans-serif; display: block; margin-bottom: 0.1617rem;">
            Justification
          </label>
          <textarea 
            id="reversalJustification" 
            placeholder="Explain why you are requesting a reversal..." 
            required
            style="width: 100%; padding: 0.4852rem; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; resize: vertical; min-height: 3.6387rem; box-sizing: border-box;"
          ></textarea>
        </div>
        
        <div style="display: flex; justify-content: flex-end;">
          <button 
            type="button" 
            id="submitReversalRequestBtn"
            style="padding: 0.3234rem 0.6469rem; background: #f59e0b; color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s;"
          >
            Submit Reversal Request
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get response form HTML (for auditors)
   */
  private getResponseFormHTML(): string {
    return `
      <div style="background: #fffbeb; padding: 0.4852rem; border-radius: 0.2425rem; border: 0.0304rem solid #fbbf24; margin-top: 0.4852rem;">
        <div style="font-size: 0.4852rem; color: #92400e; font-family: 'Poppins', sans-serif; font-weight: 600; margin-bottom: 0.3234rem;">
          Respond to Reversal Request
        </div>
        
        <textarea 
          id="reversalResponse" 
          placeholder="Provide your response..." 
          style="width: 100%; padding: 0.4852rem; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; resize: vertical; min-height: 2.4258rem; box-sizing: border-box; margin-bottom: 0.4852rem;"
        ></textarea>
        
        <div style="display: flex; justify-content: flex-end; gap: 0.4852rem;">
          <button 
            type="button" 
            id="rejectReversalBtn"
            style="padding: 0.3234rem 0.6469rem; background: #ef4444; color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s;"
          >
            Reject
          </button>
          <button 
            type="button" 
            id="approveReversalBtn"
            style="padding: 0.3234rem 0.6469rem; background: #10b981; color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s;"
          >
            Approve
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Request reversal button
    const requestBtn = document.getElementById('submitReversalRequestBtn');
    if (requestBtn) {
      requestBtn.addEventListener('click', () => this.handleRequestSubmit());
    }

    // Approve/reject buttons
    const approveBtn = document.getElementById('approveReversalBtn');
    const rejectBtn = document.getElementById('rejectReversalBtn');
    
    if (approveBtn) {
      approveBtn.addEventListener('click', () => this.handleResponseSubmit(true));
    }
    
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => this.handleResponseSubmit(false));
    }
  }

  /**
   * Handle reversal request submission
   */
  private async handleRequestSubmit(): Promise<void> {
    const typeEl = document.getElementById('reversalType') as HTMLSelectElement;
    const justificationEl = document.getElementById('reversalJustification') as HTMLTextAreaElement;
    
    const type = typeEl?.value || '';
    const justification = justificationEl?.value?.trim() || '';

    if (!justification) {
      alert('Please provide a justification for your reversal request.');
      return;
    }

    if (this.config.onRequestReversal) {
      await this.config.onRequestReversal(justification, type);
    }
  }

  /**
   * Handle reversal response submission
   */
  private async handleResponseSubmit(approved: boolean): Promise<void> {
    const responseEl = document.getElementById('reversalResponse') as HTMLTextAreaElement;
    const response = responseEl?.value?.trim() || '';

    if (!approved && !response) {
      alert('Please provide a reason for rejection.');
      return;
    }

    if (this.config.onRespondToReversal) {
      await this.config.onRespondToReversal(approved, response);
    }
  }

  /**
   * Update reversal data and re-render
   */
  updateReversalData(data: ReversalData): void {
    this.config.reversalData = data;
    if (this.container) {
      this.container.innerHTML = this.getHTML();
      this.attachEventListeners();
    }
  }

  /**
   * Set permissions
   */
  setPermissions(canRequest: boolean, canRespond: boolean): void {
    this.config.canRequest = canRequest;
    this.config.canRespond = canRespond;
    if (this.container) {
      this.container.innerHTML = this.getHTML();
      this.attachEventListeners();
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
