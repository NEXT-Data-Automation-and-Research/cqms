/**
 * Audit Detail Modal
 * Modal for displaying detailed audit information
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logError, logInfo } from '../../../../utils/logging-helper.js';
import type { AuditReportsController } from '../audit-reports-controller.js';
import type { AuditReport } from '../../domain/entities.js';
import type { ScorecardInfo } from '../../infrastructure/audit-reports-repository.js';
import { mapAuditData } from '../../infrastructure/audit-data-mapper.js';
import { renderAuditDetailModalHTML } from './utils/audit-detail-modal-renderer.js';
import { setupModalResizer } from './utils/modal-resizer.js';
import { ConversationPanel } from '../../../audit-form/presentation/components/conversation-panel.js';

export class AuditDetailModal {
  private modal: HTMLElement | null = null;
  private controller: AuditReportsController | null = null;
  private currentAudit: AuditReport | null = null;
  private conversationPanel: ConversationPanel | null = null;

  constructor(controller: AuditReportsController) {
    this.controller = controller;
  }

  /**
   * Open the audit detail modal
   */
  async open(audit: AuditReport): Promise<void> {
    try {
      console.log('[AuditDetailModal] ============================================');
      console.log('[AuditDetailModal] OPENING MODAL - START');
      console.log('[AuditDetailModal] ============================================');
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

      // Debug: Log audit object to see what we have
      console.log('[AuditDetailModal] Audit object keys:', Object.keys(audit));
      console.log('[AuditDetailModal] Audit _scorecard_table:', audit._scorecard_table);
      console.log('[AuditDetailModal] Audit _scorecard_id:', audit._scorecard_id);
      console.log('[AuditDetailModal] Audit id:', audit.id);
      console.log('[AuditDetailModal] Full audit object:', JSON.stringify(audit, null, 2).substring(0, 500));
      
      // Load full audit data from database table to get all parameter values and feedbacks
      let fullAuditData: AuditReport = audit;
      
      // Try multiple ways to get table name
      let tableName = audit._scorecard_table;
      console.log('[AuditDetailModal] Initial tableName from audit._scorecard_table:', tableName);
      
      if (!tableName && audit._scorecard_id && this.controller) {
        // Try to get table name from scorecard via controller's scorecards
        try {
          console.log('[AuditDetailModal] Table name not found, trying to get from scorecard ID:', audit._scorecard_id);
          
          // First try: Get from controller's cached scorecards
          const scorecards = this.controller.getScorecards();
          if (scorecards && scorecards.length > 0) {
            console.log('[AuditDetailModal] Found', scorecards.length, 'scorecards in controller');
            const scorecard = scorecards.find(s => s.id === audit._scorecard_id);
            if (scorecard && scorecard.table_name) {
              tableName = scorecard.table_name;
              console.log('[AuditDetailModal] Found table name from controller scorecards:', tableName);
              (audit as any)._scorecard_table = tableName;
            }
          }
          
          // Second try: Load from repository if not found
          if (!tableName) {
            const repository = this.controller.getRepository();
            if (repository) {
              console.log('[AuditDetailModal] Loading scorecards from repository...');
              const loadedScorecards = await repository.loadScorecards();
              console.log('[AuditDetailModal] Loaded', loadedScorecards.length, 'scorecards from repository');
              const scorecard = loadedScorecards.find((s: ScorecardInfo) => s.id === audit._scorecard_id);
              if (scorecard && scorecard.table_name) {
                tableName = scorecard.table_name;
                console.log('[AuditDetailModal] Found table name from repository:', tableName);
                (audit as any)._scorecard_table = tableName;
              } else {
                console.warn('[AuditDetailModal] Scorecard not found for ID:', audit._scorecard_id);
              }
            } else {
              console.warn('[AuditDetailModal] Repository not available');
            }
          }
        } catch (e) {
          console.error('[AuditDetailModal] Error getting table name from scorecard:', e);
        }
      }
      
      // Final fallback: try to infer from audit data or use a default
      if (!tableName) {
        console.warn('[AuditDetailModal] Could not determine table name. Available options:');
        console.warn('[AuditDetailModal] - audit._scorecard_table:', audit._scorecard_table);
        console.warn('[AuditDetailModal] - audit._scorecard_id:', audit._scorecard_id);
        console.warn('[AuditDetailModal] - controller available:', !!this.controller);
      }
      
      const auditId = audit.id;
      
      // Ensure Supabase client is available - use secure client like audit reports page does
      let supabaseClient = (window as any).supabaseClient;
      console.log('[AuditDetailModal] Initial supabaseClient check:', !!supabaseClient);
      
      if (!supabaseClient) {
        // Try to get secure Supabase client (like audit reports page uses)
        try {
          const { getSecureSupabase } = await import('../../../../utils/secure-supabase.js');
          supabaseClient = await getSecureSupabase(false);
          console.log('[AuditDetailModal] Got secure Supabase client:', !!supabaseClient);
          if (supabaseClient) {
            (window as any).supabaseClient = supabaseClient; // Cache it
          }
        } catch (e) {
          console.warn('[AuditDetailModal] Could not get secure Supabase client:', e);
        }
        
        // Fallback: Try to get it from the getSupabase function if available
        if (!supabaseClient && typeof (window as any).getSupabase === 'function') {
          supabaseClient = (window as any).getSupabase();
          console.log('[AuditDetailModal] Got supabaseClient from getSupabase():', !!supabaseClient);
        }
        
        // If still not available, wait a bit for it to initialize
        if (!supabaseClient) {
          console.log('[AuditDetailModal] Supabase client not immediately available, waiting...');
          for (let i = 0; i < 10 && !supabaseClient; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            supabaseClient = (window as any).supabaseClient;
            if (!supabaseClient && typeof (window as any).getSupabase === 'function') {
              supabaseClient = (window as any).getSupabase();
            }
          }
          if (supabaseClient) {
            console.log('[AuditDetailModal] Supabase client became available after waiting');
          } else {
            console.warn('[AuditDetailModal] Supabase client still not available after waiting');
          }
        }
      }
      
      console.log('[AuditDetailModal] ===== FINAL CHECK BEFORE LOADING =====');
      console.log('[AuditDetailModal] tableName:', tableName);
      console.log('[AuditDetailModal] auditId:', auditId);
      console.log('[AuditDetailModal] supabaseClient available:', !!supabaseClient);
      console.log('[AuditDetailModal] ========================================');
      
      // ALWAYS try to load full data if we have tableName and auditId
      // This is critical to get all parameter values and feedbacks
      if (tableName && auditId) {
        console.log('[AuditDetailModal] ✅ CONDITIONS MET - Loading full audit data...');
        try {
          // Ensure we have a Supabase client
          if (!supabaseClient) {
            console.warn('[AuditDetailModal] Supabase client not available, trying to get secure client...');
            try {
              const { getSecureSupabase } = await import('../../../../utils/secure-supabase.js');
              supabaseClient = await getSecureSupabase(false);
              if (supabaseClient) {
                (window as any).supabaseClient = supabaseClient;
                console.log('[AuditDetailModal] Got secure Supabase client inside block');
              }
            } catch (e) {
              console.error('[AuditDetailModal] Failed to get secure Supabase client:', e);
            }
          }
          
          if (!supabaseClient) {
            console.error('[AuditDetailModal] Cannot load full audit data - Supabase client not available');
            throw new Error('Supabase client not available');
          }
          
          console.log('[AuditDetailModal] Loading full audit data from table:', tableName, 'for audit ID:', auditId);
          console.log('[AuditDetailModal] Supabase client available:', !!supabaseClient);
          
          const { data: fullData, error: fetchError } = await supabaseClient
            .from(tableName)
            .select('*')
            .eq('id', auditId)
            .single();
          
          if (fetchError) {
            console.error('[AuditDetailModal] Error loading full audit data:', fetchError);
            console.error('[AuditDetailModal] Error details:', JSON.stringify(fetchError, null, 2));
            logError('Error loading full audit data:', fetchError);
            // Continue with partial data if fetch fails
          } else if (fullData) {
            console.log('[AuditDetailModal] Full audit data loaded successfully');
            console.log('[AuditDetailModal] Total columns in fullData:', Object.keys(fullData).length);
            
            // Log feedback columns for debugging
            const feedbackColumns = Object.keys(fullData).filter(key => 
              key.toLowerCase().includes('feedback') || key.startsWith('feedback_')
            );
            console.log('[AuditDetailModal] Found', feedbackColumns.length, 'feedback columns:', feedbackColumns);
            
            // Log a sample of feedback data to see what's actually there
            if (feedbackColumns.length > 0) {
              feedbackColumns.slice(0, 3).forEach(col => {
                const value = fullData[col];
                console.log(`[AuditDetailModal] Sample feedback column "${col}":`, 
                  typeof value, 
                  value ? (Array.isArray(value) ? `Array[${value.length}]` : String(value).substring(0, 100)) : 'null/undefined'
                );
              });
            }
            
            // Log parameter value columns for debugging
            const parameterColumns = Object.keys(fullData).filter(key => 
              !key.toLowerCase().includes('feedback') && 
              !key.startsWith('_') && 
              !['id', 'employee_email', 'employee_name', 'employee_type', 'employee_department', 
                'auditor_email', 'auditor_name', 'interaction_id', 'interaction_date', 'audit_type',
                'channel', 'quarter', 'week', 'country_of_employee', 'client_email', 'passing_status',
                'validation_status', 'average_score', 'critical_errors', 'total_errors_count', 
                'transcript', 'error_description', 'critical_fail_error', 'significant_error', 
                'recommendations', 'reversal_requested_at', 'reversal_responded_at', 'reversal_approved',
                'acknowledgement_status', 'acknowledgement_status_updated_at', 'audit_duration',
                'submitted_at', 'audit_start_time', 'audit_end_time', 'created_at', 'updated_at',
                'scorecard_id', 'client_name', 'agent_pre_status', 'agent_post_status'].includes(key.toLowerCase())
            );
            console.log('[AuditDetailModal] Found', parameterColumns.length, 'parameter columns (sample):', parameterColumns.slice(0, 15));
            
            // Map the full data from database (snake_case) to camelCase using the mapper
            // This ensures all fields are properly converted and accessible
            const mappedFullData = mapAuditData(fullData);
            
            // Merge: Start with original audit (has scorecard metadata), then add mapped full data
            // This ensures we have both camelCase (for interface) and snake_case (for database columns)
            fullAuditData = {
              ...audit, // Start with metadata from audit report (scorecard info, etc.)
              ...mappedFullData, // Add mapped full data (camelCase fields)
              ...fullData, // Also keep original snake_case fields for direct column access
              // Preserve scorecard metadata
              _scorecard_id: audit._scorecard_id || mappedFullData._scorecard_id,
              _scorecard_name: audit._scorecard_name || mappedFullData._scorecard_name,
              _scorecard_table: audit._scorecard_table || mappedFullData._scorecard_table || tableName,
              _scoring_type: audit._scoring_type || mappedFullData._scoring_type,
            } as AuditReport;
            
            console.log('[AuditDetailModal] Merged audit data:');
            console.log('[AuditDetailModal] - Original audit fields:', Object.keys(audit).length);
            console.log('[AuditDetailModal] - Full data fields:', Object.keys(fullData).length);
            console.log('[AuditDetailModal] - Mapped full data fields:', Object.keys(mappedFullData).length);
            console.log('[AuditDetailModal] - Final merged fields:', Object.keys(fullAuditData).length);
            console.log('[AuditDetailModal] - totalErrorsCount (camelCase):', (fullAuditData as any).totalErrorsCount);
            console.log('[AuditDetailModal] - total_errors_count (snake_case):', (fullAuditData as any).total_errors_count);
            console.log('[AuditDetailModal] - averageScore (camelCase):', (fullAuditData as any).averageScore);
            console.log('[AuditDetailModal] - average_score (snake_case):', (fullAuditData as any).average_score);
          } else {
            console.warn('[AuditDetailModal] Full audit data query returned null/undefined');
          }
        } catch (error) {
          console.error('[AuditDetailModal] Exception loading full audit data:', error);
          console.error('[AuditDetailModal] Exception stack:', (error as Error).stack);
          logError('Exception loading full audit data:', error);
          // Continue with partial data if fetch fails
        }
      } else {
        console.warn('[AuditDetailModal] Cannot load full audit data - missing requirements');
        if (!tableName) console.warn('[AuditDetailModal] Missing table name (audit._scorecard_table)');
        if (!auditId) console.warn('[AuditDetailModal] Missing audit ID (audit.id)');
        if (!supabaseClient) {
          console.warn('[AuditDetailModal] Missing Supabase client');
          console.warn('[AuditDetailModal] window.supabaseClient:', !!(window as any).supabaseClient);
          console.warn('[AuditDetailModal] window.getSupabase:', typeof (window as any).getSupabase);
        }
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

      // Store current audit reference (use full data if available)
      this.currentAudit = fullAuditData;

      // Debug: Verify data before rendering
      console.log('[AuditDetailModal] ===== DATA VERIFICATION BEFORE RENDERING =====');
      console.log('[AuditDetailModal] fullAuditData keys count:', Object.keys(fullAuditData).length);
      console.log('[AuditDetailModal] totalErrorsCount:', (fullAuditData as any).totalErrorsCount);
      console.log('[AuditDetailModal] total_errors_count:', (fullAuditData as any).total_errors_count);
      console.log('[AuditDetailModal] averageScore:', (fullAuditData as any).averageScore);
      console.log('[AuditDetailModal] average_score:', (fullAuditData as any).average_score);
      const feedbackKeys = Object.keys(fullAuditData).filter(k => k.toLowerCase().includes('feedback'));
      console.log('[AuditDetailModal] Feedback columns found:', feedbackKeys.length, feedbackKeys.slice(0, 5));
      console.log('[AuditDetailModal] Scorecard parameters count:', scorecardParameters.length);
      console.log('[AuditDetailModal] ============================================');

      // Render modal HTML (use full audit data)
      console.log('[AuditDetailModal] Rendering modal HTML...');
      const html = renderAuditDetailModalHTML(fullAuditData, scorecardParameters);
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
      
      // Load conversation using the reusable ConversationPanel component from audit-form
      const interactionId = fullAuditData.interactionId || fullAuditData.interaction_id;
      if (interactionId) {
        console.log('[AuditDetailModal] Loading conversation using ConversationPanel for ID:', interactionId);
        this.loadConversationWithPanel(String(interactionId));
      } else if (fullAuditData.transcript) {
        // If no interaction ID but has transcript, parse and display it
        console.log('[AuditDetailModal] Parsing stored transcript');
        this.parseTranscriptToChat(fullAuditData.transcript);
      }
    } catch (error) {
      logError('Error opening audit detail modal:', error);
      console.error('[AuditDetailModal] Error opening modal:', error);
      throw error;
    }
  }
  
  /**
   * Load conversation using the reusable ConversationPanel component from audit-form
   */
  private async loadConversationWithPanel(conversationId: string): Promise<void> {
    const conversationContainer = this.modal?.querySelector('#modalConversationContainer');
    if (!conversationContainer) {
      console.error('[AuditDetailModal] Conversation container not found');
      return;
    }
    
    try {
      console.log('[AuditDetailModal] Initializing ConversationPanel for:', conversationId);
      
      // Create and initialize the ConversationPanel
      this.conversationPanel = new ConversationPanel({
        containerId: 'modalConversationContainer',
        showInfoGrid: false,  // Don't show info grid in modal (already have audit details)
        showAttributes: false, // Don't show attributes in modal
        autoLoad: false,
        onConversationLoaded: (conversation) => {
          console.log('[AuditDetailModal] Conversation loaded successfully via ConversationPanel');
        },
        onError: (error) => {
          console.error('[AuditDetailModal] ConversationPanel error:', error);
          // Fallback to transcript if available
          if (this.currentAudit?.transcript) {
            this.parseTranscriptToChat(this.currentAudit.transcript);
          }
        }
      });
      
      await this.conversationPanel.init();
      await this.conversationPanel.loadConversation(conversationId);
      
    } catch (error: any) {
      console.error('[AuditDetailModal] Error initializing ConversationPanel:', error);
      // Fallback to transcript if available
      if (this.currentAudit?.transcript) {
        this.parseTranscriptToChat(this.currentAudit.transcript);
      } else {
        safeSetHTML(conversationContainer as HTMLElement, `
          <div style="text-align: center; padding: 1.2937rem; color: #ef4444;">
            <p style="font-size: 0.5659rem;">Failed to load conversation</p>
            <p style="font-size: 0.5rem; color: #6b7280; margin-top: 0.5rem;">${error.message || 'Unknown error'}</p>
          </div>
        `);
      }
    }
  }
  
  /**
   * Parse stored transcript text into chat format (fallback when ConversationPanel fails)
   */
  private parseTranscriptToChat(transcript: string): void {
    const container = this.modal?.querySelector('#modalConversationContainer');
    if (!container) return;
    
    // Display transcript as simple text (ConversationPanel handles full chat formatting)
    safeSetHTML(container as HTMLElement, `
      <div style="padding: 0.5rem; background: white; border-radius: 0.375rem; margin: 0.25rem; height: 100%; overflow-y: auto;">
        <div style="white-space: pre-wrap; font-size: 0.6094rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif;">${transcript}</div>
      </div>
    `);
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

