/**
 * Audit Detail Modal
 * Modal for displaying detailed audit information
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logError, logInfo } from '../../../../utils/logging-helper.js';
import type { AuditReportsController } from '../audit-reports-controller.js';
import type { AuditReport } from '../../domain/entities.js';
import { renderAuditDetailModalHTML } from './utils/audit-detail-modal-renderer.js';
import { setupModalResizer } from './utils/modal-resizer.js';

export class AuditDetailModal {
  private modal: HTMLElement | null = null;
  private controller: AuditReportsController | null = null;
  private currentAudit: AuditReport | null = null;

  constructor(controller: AuditReportsController) {
    this.controller = controller;
  }

  /**
   * Open the audit detail modal
   */
  async open(audit: AuditReport): Promise<void> {
    try {
      logInfo('Opening audit detail modal:', audit.id);
      console.log('[AuditDetailModal] Opening modal for audit:', audit.id);
      console.log('[AuditDetailModal] Audit transcript available:', !!audit.transcript, 'length:', audit.transcript?.length || 0);

      // Create modal element if it doesn't exist
      if (!this.modal) {
        console.log('[AuditDetailModal] Creating new modal element');
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.id = 'auditDetailModal';
        document.body.appendChild(this.modal);
      }

      // Load scorecard parameters if needed
      let scorecardParameters: any[] = [];
      const scorecardId = audit._scorecard_id;
      
      if (scorecardId && this.controller) {
        try {
          console.log('[AuditDetailModal] Loading scorecard parameters for:', scorecardId);
          const repository = this.controller.getRepository();
          if (repository) {
            scorecardParameters = await repository.loadScorecardParameters(scorecardId);
            console.log('[AuditDetailModal] Loaded', scorecardParameters.length, 'scorecard parameters');
          }
        } catch (error) {
          logError('Error loading scorecard parameters:', error);
          console.error('[AuditDetailModal] Error loading scorecard parameters:', error);
        }
      }

      // Store current audit reference
      this.currentAudit = audit;

      // Render modal HTML
      console.log('[AuditDetailModal] Rendering modal HTML...');
      const html = renderAuditDetailModalHTML(audit, scorecardParameters);
      console.log('[AuditDetailModal] HTML generated, length:', html?.length || 0);
      safeSetHTML(this.modal, html);
      console.log('[AuditDetailModal] HTML injected into modal');

      // Show modal
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      console.log('[AuditDetailModal] Modal made active');

      // Attach event listeners
      this.attachEventListeners();
      console.log('[AuditDetailModal] Event listeners attached');

      // Setup resizable splitter
      setupModalResizer();
      console.log('[AuditDetailModal] Modal resizer setup complete');
      
      // Load conversation from Intercom if interaction ID is available
      const interactionId = audit.interactionId || audit.interaction_id;
      if (interactionId) {
        console.log('[AuditDetailModal] Loading conversation from Intercom for ID:', interactionId);
        this.loadConversationFromIntercom(String(interactionId));
      } else if (audit.transcript) {
        // If no interaction ID but has transcript, parse and display it
        console.log('[AuditDetailModal] Parsing stored transcript');
        this.parseTranscriptToChat(audit.transcript);
      }
    } catch (error) {
      logError('Error opening audit detail modal:', error);
      console.error('[AuditDetailModal] Error opening modal:', error);
      throw error;
    }
  }
  
  /**
   * Load conversation from Intercom API
   */
  private async loadConversationFromIntercom(conversationId: string): Promise<void> {
    const chatMessagesContainer = this.modal?.querySelector('#modalChatMessagesContainer');
    if (!chatMessagesContainer) {
      console.error('[AuditDetailModal] Chat messages container not found');
      return;
    }
    
    try {
      // Get Supabase URL for the edge function
      const supabaseUrl = (window as any).envConfig?.SUPABASE_URL || (window as any).SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }
      
      // Get user's JWT token for authenticated request
      let userToken = null;
      try {
        if ((window as any).supabaseClient) {
          const { data: { session } } = await (window as any).supabaseClient.auth.getSession();
          userToken = session?.access_token || null;
        }
      } catch (tokenError) {
        console.warn('[AuditDetailModal] Could not get user token:', tokenError);
      }
      
      // Fetch conversation from Intercom via edge function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?conversation_id=${encodeURIComponent(conversationId)}&display_as=plaintext`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      const response = await fetch(edgeFunctionUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Render conversation messages
      this.renderConversationMessages(chatMessagesContainer as HTMLElement, data);
      
    } catch (error: any) {
      console.error('[AuditDetailModal] Error loading conversation:', error);
      // Show error state with fallback to transcript if available
      const transcript = this.currentAudit?.transcript;
      if (transcript) {
        this.parseTranscriptToChat(transcript);
      } else {
        safeSetHTML(chatMessagesContainer as HTMLElement, `
          <div style="text-align: center; padding: 1.2937rem; color: #ef4444;">
            <p style="font-size: 0.5659rem;">Failed to load conversation</p>
            <p style="font-size: 0.5rem; color: #6b7280; margin-top: 0.5rem;">${error.message || 'Unknown error'}</p>
          </div>
        `);
      }
    }
  }
  
  /**
   * Render conversation messages from Intercom data
   */
  private renderConversationMessages(container: HTMLElement, data: any): void {
    const conversation = data.conversation || data;
    const parts = conversation?.conversation_parts?.conversation_parts || [];
    const source = conversation?.source;
    
    let messagesHtml = '';
    
    // Add initial message from source if available
    if (source?.body) {
      const isAdmin = source.author?.type === 'admin' || source.author?.type === 'bot';
      const authorName = source.author?.name || (isAdmin ? 'Agent' : 'Customer');
      const timestamp = source.created_at ? new Date(source.created_at * 1000).toLocaleString() : '';
      
      messagesHtml += this.renderChatBubble(source.body, isAdmin, authorName, timestamp);
    }
    
    // Add conversation parts
    for (const part of parts) {
      if (!part.body || part.part_type === 'note') continue;
      
      const isAdmin = part.author?.type === 'admin' || part.author?.type === 'bot';
      const authorName = part.author?.name || (isAdmin ? 'Agent' : 'Customer');
      const timestamp = part.created_at ? new Date(part.created_at * 1000).toLocaleString() : '';
      
      messagesHtml += this.renderChatBubble(part.body, isAdmin, authorName, timestamp);
    }
    
    if (!messagesHtml) {
      messagesHtml = `
        <div style="text-align: center; padding: 1.2937rem; color: #9ca3af; font-style: italic;">
          <p>No messages in this conversation</p>
        </div>
      `;
    }
    
    safeSetHTML(container, messagesHtml);
  }
  
  /**
   * Render a single chat bubble
   */
  private renderChatBubble(body: string, isAdmin: boolean, authorName: string, timestamp: string): string {
    // Strip HTML tags for plain text display
    const plainText = body.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return '';
    
    const bubbleStyle = isAdmin
      ? 'background: white; color: #374151; margin-left: auto; border-radius: 0.75rem 0.75rem 0 0.75rem;'
      : 'background: #1A733E; color: white; margin-right: auto; border-radius: 0.75rem 0.75rem 0.75rem 0;';
    
    const alignStyle = isAdmin ? 'align-items: flex-end;' : 'align-items: flex-start;';
    const nameColor = isAdmin ? '#6b7280' : '#9ca3af';
    
    return `
      <div style="display: flex; flex-direction: column; ${alignStyle} margin-bottom: 0.5rem; max-width: 80%;">
        <span style="font-size: 0.5rem; color: ${nameColor}; margin-bottom: 0.125rem; font-family: 'Poppins', sans-serif;">${authorName}</span>
        <div style="${bubbleStyle} padding: 0.5rem 0.75rem; max-width: 100%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          <p style="font-size: 0.5659rem; line-height: 1.5; margin: 0; font-family: 'Poppins', sans-serif; word-wrap: break-word;">${plainText}</p>
        </div>
        ${timestamp ? `<span style="font-size: 0.4375rem; color: #9ca3af; margin-top: 0.125rem; font-family: 'Poppins', sans-serif;">${timestamp}</span>` : ''}
      </div>
    `;
  }
  
  /**
   * Parse stored transcript text into chat format
   */
  private parseTranscriptToChat(transcript: string): void {
    const container = this.modal?.querySelector('#modalChatMessagesContainer');
    if (!container) return;
    
    // Try to parse transcript into messages
    const lines = transcript.split('\n').filter(line => line.trim());
    let messagesHtml = '';
    
    for (const line of lines) {
      // Try to detect agent vs customer messages (common patterns)
      const isAgent = /^(agent|admin|support|bot|representative|csr)[:]/i.test(line) || 
                     line.includes('[Agent]') || line.includes('[Admin]');
      const isCustomer = /^(customer|client|user|visitor)[:]/i.test(line) ||
                        line.includes('[Customer]') || line.includes('[User]');
      
      // Remove speaker prefix if present
      const cleanLine = line.replace(/^(agent|admin|support|bot|customer|client|user|visitor|representative|csr)[:]/i, '').trim();
      
      if (cleanLine) {
        const isAdmin = isAgent || (!isCustomer && messagesHtml.split('<div style="display: flex;').length % 2 === 0);
        messagesHtml += this.renderChatBubble(cleanLine, isAdmin, isAdmin ? 'Agent' : 'Customer', '');
      }
    }
    
    if (!messagesHtml) {
      // Fallback: show as single message block
      messagesHtml = `
        <div style="padding: 0.5rem; background: white; border-radius: 0.375rem; margin: 0.25rem;">
          <div style="white-space: pre-wrap; font-size: 0.6094rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif;">${transcript}</div>
        </div>
      `;
    }
    
    safeSetHTML(container as HTMLElement, messagesHtml);
  }

  /**
   * Close the modal
   */
  close(): void {
    if (this.modal) {
      this.modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('#auditDetailModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // View Full Audit button
    const viewFullBtn = this.modal.querySelector('#auditDetailModalViewFull');
    if (viewFullBtn) {
      viewFullBtn.addEventListener('click', () => {
        // Use stored audit reference
        const audit = this.currentAudit;
        
        if (audit && audit._scorecard_id && audit._scorecard_table) {
          // Navigate to unified audit-view page in view mode
          window.location.href = `/audit-view.html?id=${audit.id}&scorecard=${audit._scorecard_id}&table=${audit._scorecard_table}&mode=view`;
          this.close();
        } else {
          logError('Cannot navigate: Missing audit information', { 
            audit, 
            hasScorecardId: !!audit?._scorecard_id,
            hasScorecardTable: !!audit?._scorecard_table 
          });
          alert('Cannot view full audit: Missing required information.');
        }
      });
    }

    // Close button at bottom
    const bottomCloseBtn = this.modal.querySelector('#auditDetailModalBottomClose');
    if (bottomCloseBtn) {
      bottomCloseBtn.addEventListener('click', () => this.close());
    }

    // Copy interaction ID button
    const copyInteractionBtn = this.modal.querySelector('#copyInteractionId');
    if (copyInteractionBtn) {
      copyInteractionBtn.addEventListener('click', () => {
        const interactionId = this.modal?.querySelector('#interactionIdValue')?.textContent || '';
        navigator.clipboard.writeText(interactionId).then(() => {
          const btn = copyInteractionBtn as HTMLElement;
          // Store original SVG element for restoration
          const originalSvg = btn.querySelector('svg')?.outerHTML || '';
          const checkmarkSvg = '<svg style="width: 0.6562rem; height: 0.6562rem;" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          safeSetHTML(btn, checkmarkSvg);
          setTimeout(() => {
            if (originalSvg) {
              safeSetHTML(btn, originalSvg);
            }
          }, 1000);
        });
      });
    }

    // Copy client email button
    const copyEmailBtn = this.modal.querySelector('#copyClientEmail');
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', () => {
        const email = this.modal?.querySelector('#clientEmailValue')?.textContent || '';
        navigator.clipboard.writeText(email).then(() => {
          const btn = copyEmailBtn as HTMLElement;
          // Store original SVG element for restoration
          const originalSvg = btn.querySelector('svg')?.outerHTML || '';
          const checkmarkSvg = '<svg style="width: 0.6562rem; height: 0.6562rem;" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          safeSetHTML(btn, checkmarkSvg);
          setTimeout(() => {
            if (originalSvg) {
              safeSetHTML(btn, originalSvg);
            }
          }, 1000);
        });
      });
    }
  }
}

