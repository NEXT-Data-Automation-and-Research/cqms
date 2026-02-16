/**
 * Scorecard Controller
 * Handles scorecard loading and selection logic
 * Migrated from audit-form.html
 */

import { AuditFormService } from '../../application/audit-form-service.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { SCORECARD_AUDIT_FORM_FIELDS } from '../../../../core/constants/field-whitelists.js';
import type { Scorecard, ScorecardParameter } from '../../domain/entities.js';

export class ScorecardController {
  private currentScorecard: Scorecard | null = null;
  private currentParameters: ScorecardParameter[] = [];
  private allAvailableScorecards: Scorecard[] = [];

  constructor(private service: AuditFormService) {}

  /**
   * Load available scorecards
   */
  async loadScorecards(
    channelFilter: string | null = null,
    preselectedScorecardId: string | null = null,
    skipAutoSelect = false
  ): Promise<void> {
    // #region agent log
    if (typeof window !== 'undefined' && (window as any).fetch) {
      (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:23',message:'loadScorecards start',data:{channelFilter,preselectedScorecardId,skipAutoSelect},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    
    const scorecardSelect = document.getElementById('scorecardSelect') as HTMLSelectElement;
    
    // #region agent log
    if (typeof window !== 'undefined' && (window as any).fetch) {
      (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:29',message:'DOM element check',data:{hasElement:!!scorecardSelect,elementId:'scorecardSelect'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    
    if (!scorecardSelect) {
      logError('Scorecard select element not found');
      return;
    }

    try {
      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:36',message:'Calling service.loadScorecards',data:{channelFilter:channelFilter||undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      
      const scorecards = await this.service.loadScorecards(channelFilter || undefined);
      
      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:40',message:'Scorecards fetched',data:{count:scorecards?.length||0,hasScorecards:!!scorecards},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      
      this.allAvailableScorecards = scorecards;

      // Filter by channel if provided
      let filteredScorecards = this.allAvailableScorecards;
      if (channelFilter) {
        filteredScorecards = this.allAvailableScorecards.filter((scorecard: Scorecard) => {
          if (!scorecard.channels) return false;
          const channelsList = scorecard.channels.split(',').map((c: string) => c.trim());
          return channelsList.includes(channelFilter);
        });

        // Sort scorecards: default ones first, then by created_at
        filteredScorecards.sort((a: Scorecard, b: Scorecard) => {
          const aIsDefault = a.defaultForChannels && 
            typeof a.defaultForChannels === 'string' && 
            a.defaultForChannels.split(',').map((c: string) => c.trim()).includes(channelFilter);
          const bIsDefault = b.defaultForChannels && 
            typeof b.defaultForChannels === 'string' && 
            b.defaultForChannels.split(',').map((c: string) => c.trim()).includes(channelFilter);

          if (aIsDefault && !bIsDefault) return -1;
          if (!aIsDefault && bIsDefault) return 1;

          // Sort by created_at (newest first)
          const aDate = new Date(a.createdAt || 0);
          const bDate = new Date(b.createdAt || 0);
          return bDate.getTime() - aDate.getTime();
        });
      }

      // Show appropriate placeholder based on whether a channel is selected
      if (channelFilter) {
        safeSetHTML(scorecardSelect, '<option value="">Select a scorecard...</option>');
      } else if (!preselectedScorecardId) {
        safeSetHTML(scorecardSelect, '<option value="">Select a channel first...</option>');
      } else {
        safeSetHTML(scorecardSelect, '<option value="">Select a scorecard...</option>');
      }

      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:68',message:'Before adding options',data:{filteredCount:filteredScorecards?.length||0,hasFiltered:!!filteredScorecards},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion

      if (filteredScorecards && filteredScorecards.length > 0) {
        filteredScorecards.forEach(scorecard => {
          const option = document.createElement('option');
          option.value = scorecard.id;

          // Add "(Default)" indicator if this is the default scorecard for the channel
          let displayName = scorecard.name;
          if (channelFilter && scorecard.defaultForChannels && typeof scorecard.defaultForChannels === 'string') {
            const defaultChannels = scorecard.defaultForChannels.split(',').map((c: string) => c.trim());
            if (defaultChannels.includes(channelFilter)) {
              displayName += ' (Default)';
            }
          }

          option.textContent = displayName;
          if (scorecard.passingThreshold) {
            option.dataset.threshold = scorecard.passingThreshold.toString();
          }
          option.dataset.tableName = scorecard.tableName;
          option.dataset.channels = scorecard.channels || '';
          scorecardSelect.appendChild(option);
        });
        
        // #region agent log
        if (typeof window !== 'undefined' && (window as any).fetch) {
          (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:92',message:'Options added',data:{optionsCount:scorecardSelect.options.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        }
        // #endregion

        // Attach change event listener
        if (!scorecardSelect.hasAttribute('data-listener-attached')) {
          scorecardSelect.setAttribute('data-listener-attached', 'true');
          scorecardSelect.onchange = async (): Promise<void> => {
            const selectedValue = scorecardSelect.value;
            if (selectedValue && selectedValue !== 'null' && selectedValue !== 'undefined' && selectedValue.trim() !== '') {
              await this.loadScorecardParameters(selectedValue);
            } else {
              this.currentScorecard = null;
              this.currentParameters = [];
              const scorecardInfo = document.getElementById('scorecardInfo');
              if (scorecardInfo) {
                scorecardInfo.style.display = 'none';
              }
              this.clearErrorParameters();
              this.updateHeaderMetadata();
              this.showNoScorecardMessage();
            }
          };
        }

        // Auto-select scorecard
        if (filteredScorecards.length > 0 && !skipAutoSelect) {
          if (preselectedScorecardId) {
            const preselectedExists = filteredScorecards.some(sc => sc.id === preselectedScorecardId);
            if (preselectedExists) {
              scorecardSelect.value = preselectedScorecardId;
              await this.loadScorecardParameters(preselectedScorecardId);
            } else {
              // Check if it exists in all scorecards (for AI audit)
              const preselectedInAll = this.allAvailableScorecards.some(sc => sc.id === preselectedScorecardId);
              if (preselectedInAll && channelFilter) {
                logWarn('Preselected scorecard does not match channel filter, but adding it for AI audit:', preselectedScorecardId);
                const preselectedScorecard = this.allAvailableScorecards.find(sc => sc.id === preselectedScorecardId);
                if (preselectedScorecard) {
                  const option = document.createElement('option');
                  option.value = preselectedScorecard.id;
                  option.textContent = preselectedScorecard.name + ' (AI Audit)';
                  if (preselectedScorecard.passingThreshold) {
                    option.dataset.threshold = preselectedScorecard.passingThreshold.toString();
                  }
                  option.dataset.tableName = preselectedScorecard.tableName;
                  option.dataset.channels = preselectedScorecard.channels || '';
                  scorecardSelect.appendChild(option);
                  scorecardSelect.value = preselectedScorecardId;
                  await this.loadScorecardParameters(preselectedScorecardId);
                }
              }
            }
          } else if (channelFilter) {
            // No preselected scorecard but channel is selected - auto-select the default/first
            const firstScorecard = filteredScorecards[0];
            if (firstScorecard) {
              logInfo('Auto-selecting default scorecard for channel:', firstScorecard.name, firstScorecard.id);
              scorecardSelect.value = firstScorecard.id;
              await this.loadScorecardParameters(firstScorecard.id);
            }
          }
        }

        // Show message if no scorecard is selected
        if (!scorecardSelect.value || scorecardSelect.value === '') {
          if (!channelFilter && !preselectedScorecardId) {
            this.showSelectChannelMessage();
          } else {
            this.showNoScorecardMessage();
          }
        } else if (channelFilter && filteredScorecards.length === 0) {
          safeSetHTML(scorecardSelect, '<option value="">No scorecards available for this channel</option>');
        }
      } else {
        safeSetHTML(scorecardSelect, '<option value="">No scorecards available</option>');
      }

      logInfo('Scorecards loaded:', filteredScorecards?.length || 0);
    } catch (error) {
      logError('Error loading scorecards:', error);
      safeSetHTML(scorecardSelect, '<option value="">Error loading scorecards</option>');
    }
  }

  /**
   * Load scorecard parameters
   */
  async loadScorecardParameters(scorecardId: string): Promise<void> {
    try {
      const { scorecard, parameters } = await this.service.loadScorecardWithParameters(scorecardId);
      this.currentScorecard = scorecard;
      this.currentParameters = parameters;
      
      // Render parameters UI
      this.renderParameters(parameters);
      
      // Show scorecard info
      const scorecardInfo = document.getElementById('scorecardInfo');
      if (scorecardInfo) {
        scorecardInfo.style.display = 'block';
      }
      
      this.updateHeaderMetadata();
    } catch (error) {
      logError('Error loading scorecard parameters:', error);
      this.currentScorecard = null;
      this.currentParameters = [];
    }
  }

  /**
   * Render parameters UI
   */
  private renderParameters(parameters: ScorecardParameter[]): void {
    const container = document.getElementById('parametersContainer');
    if (!container) return;

    // Clear existing parameters
    safeSetHTML(container, '');

    // Render each parameter
    parameters.forEach(param => {
      const paramElement = this.createParameterElement(param);
      container.appendChild(paramElement);
    });
  }

  /**
   * Create parameter element
   */
  private createParameterElement(param: ScorecardParameter): HTMLElement {
    const div = document.createElement('div');
    div.className = 'parameter-item';
    div.dataset.parameterId = param.id;
    
    // Create parameter HTML (simplified - actual implementation would be more complex)
    const html = `
      <label>
        <input type="checkbox" data-parameter-id="${param.id}" />
        ${param.errorName} (${param.penaltyPoints} points)
      </label>
    `;
    
    safeSetHTML(div, html);
    return div;
  }

  /**
   * Clear error parameters
   */
  private clearErrorParameters(): void {
    const container = document.getElementById('parametersContainer');
    if (container) {
      safeSetHTML(container, '');
    }
  }

  /**
   * Update header metadata
   */
  private updateHeaderMetadata(): void {
    // Implementation for updating header metadata
    // This would update the form header with scorecard information
  }

  /**
   * Show select channel message
   */
  private showSelectChannelMessage(): void {
    const scorecardDisplay = document.getElementById('scorecardDisplay');
    if (scorecardDisplay) {
      safeSetHTML(scorecardDisplay, '<svg style="width: 0.5659rem; height: 0.5659rem; display: inline-block; vertical-align: middle; margin-right: 0.2425rem;" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> Select a channel');
    }
  }

  /**
   * Show no scorecard message
   */
  private showNoScorecardMessage(): void {
    const scorecardDisplay = document.getElementById('scorecardDisplay');
    if (scorecardDisplay) {
      safeSetHTML(scorecardDisplay, '<svg style="width: 0.5659rem; height: 0.5659rem; display: inline-block; vertical-align: middle; margin-right: 0.2425rem;" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> Select a scorecard');
    }
  }

  /**
   * Get current scorecard
   */
  getCurrentScorecard(): Scorecard | null {
    return this.currentScorecard;
  }

  /**
   * Get current parameters
   */
  getCurrentParameters(): ScorecardParameter[] {
    return this.currentParameters;
  }
}

// Global function for backward compatibility
// Note: This requires a ScorecardController instance to be created first
let globalScorecardController: ScorecardController | null = null;

/**
 * Set global scorecard controller instance
 */
export function setGlobalScorecardController(controller: ScorecardController): void {
  globalScorecardController = controller;
}

/**
 * Load scorecards (global function for backward compatibility)
 */
export async function loadScorecards(
  channelFilter: string | null = null,
  preselectedScorecardId: string | null = null,
  skipAutoSelect = false
): Promise<void> {
  // #region agent log
  if (typeof window !== 'undefined' && (window as any).fetch) {
    (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:280',message:'loadScorecards called',data:{hasGlobalController:!!globalScorecardController,channelFilter,preselectedScorecardId,skipAutoSelect},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
  
  if (!globalScorecardController) {
    // Try to get from window if available
    const loader = (window as any).auditFormLoader;
    // #region agent log
    if (typeof window !== 'undefined' && (window as any).fetch) {
      (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:287',message:'No global controller, checking window',data:{hasLoader:!!loader,hasController:loader?.scorecardController},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    
    if (loader && loader.scorecardController) {
      globalScorecardController = loader.scorecardController;
    } else {
      // #region agent log
      if (typeof window !== 'undefined' && (window as any).fetch) {
        (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:293',message:'Controller not found, throwing error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion
      throw new Error('ScorecardController not initialized. Call setGlobalScorecardController first.');
    }
  }
  
  // #region agent log
  if (typeof window !== 'undefined' && (window as any).fetch) {
    (window as any).fetch('http://127.0.0.1:7242/ingest/ba7b91df-149f-453d-8410-43bdcb825ea7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scorecard-controller.ts:299',message:'Calling controller.loadScorecards',data:{hasController:!!globalScorecardController},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
  
  if (!globalScorecardController) {
    throw new Error('ScorecardController not initialized. Call setGlobalScorecardController first.');
  }
  
  await globalScorecardController.loadScorecards(channelFilter, preselectedScorecardId, skipAutoSelect);
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).loadScorecards = loadScorecards;
}

