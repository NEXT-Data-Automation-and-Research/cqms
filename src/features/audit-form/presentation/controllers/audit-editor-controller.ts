/**
 * Audit Editor Controller
 * Handles loading and editing existing audits
 * Migrated from audit-form.html loadAuditForEditing() and populateFormWithAuditData()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getSupabaseClient } from '../utils/supabase-client-helper.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getQuillManager } from '../utils/quill-manager.js';

export class AuditEditorController {
  /**
   * Load audit for editing from URL parameters
   */
  async loadAuditForEditing(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const auditId = urlParams.get('edit');
    const scorecardId = urlParams.get('scorecard');
    const tableName = urlParams.get('table');
    
    // Check for calibration mode first
    const { checkCalibrationMode } = await import('../utils/calibration-mode.js');
    if (checkCalibrationMode()) {
      if (typeof (window as any).loadCalibrationSampleAudit === 'function') {
        await (window as any).loadCalibrationSampleAudit();
      }
      return;
    }
    
    if (!auditId || !tableName) {
      return; // No edit parameters, normal create mode
    }
    
    try {
      logInfo(`Loading audit for editing: ${auditId} from table: ${tableName}`);
      
      const supabase = await getSupabaseClient();
      if (!supabase) {
        alert('Error: Database connection not ready. Please refresh the page.');
        return;
      }
      
      // Load the audit data from the specified table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', auditId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        alert('Audit not found');
        return;
      }
      
      logInfo('Loaded audit data:', data);
      
      // Set editing mode flag FIRST to prevent event handlers from interfering
      (window as any).isEditingExistingAudit = true;
      (window as any).currentEditingAuditId = auditId;
      (window as any).currentEditingTableName = tableName;
      
      // Show the audit form modal
      const auditFormModal = document.getElementById('auditFormModal');
      if (auditFormModal) {
        auditFormModal.style.display = 'flex';
      }
      
      // Hide pending audits section when editing
      const pendingAuditsSection = document.getElementById('pendingAuditsSection');
      if (pendingAuditsSection) {
        pendingAuditsSection.style.display = 'none';
      }
      
      // Load and select the scorecard
      if (scorecardId) {
        await this.loadAndSelectScorecard(scorecardId);
      }
      
      // Populate form fields with audit data
      await this.populateFormWithAuditData(data);
      
      // Update header to indicate editing mode
      const formHeader = document.getElementById('formScorecardDisplay');
      if (formHeader) {
        const currentContent = formHeader.textContent || '';
        safeSetHTML(formHeader, `Editing Audit - ${currentContent}`);
      }
      
      // Restore audit start timestamp if editing existing audit
      if ((window as any).restoreAuditStartTimestamp && data.audit_start_time) {
        (window as any).restoreAuditStartTimestamp(data.audit_start_time);
      }
      
      // Restore timer from saved duration if editing existing audit
      if ((window as any).clearTimerState) {
        (window as any).clearTimerState();
      }
      
      if ((window as any).restoreTimerFromDuration && data.audit_duration !== null && data.audit_duration !== undefined) {
        (window as any).restoreTimerFromDuration(data.audit_duration);
      } else {
        // Start fresh timer if no saved duration
        if ((window as any).resetTimer && (window as any).startTimer) {
          (window as any).resetTimer();
          (window as any).startTimer();
        }
      }
      
    } catch (error) {
      logError('Error loading audit for editing:', error);
      alert(`Failed to load audit for editing: ${(error as Error).message}`);
    }
  }

  /**
   * Load and select scorecard
   */
  private async loadAndSelectScorecard(scorecardId: string): Promise<void> {
    const scorecardSelect = document.getElementById('scorecardSelect') as HTMLSelectElement;
    if (!scorecardSelect) {
      logError('Scorecard select element not found');
      alert('Error: Scorecard select element not found. Please refresh the page.');
      return;
    }
    
    // Wait for scorecard options to be populated
    let attempts = 0;
    while (scorecardSelect.options.length <= 1 && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (scorecardSelect.options.length > 1) {
      // Set the value (this will trigger the change event, but that's okay since we're in edit mode)
      scorecardSelect.value = scorecardId;
      
      // Wait for scorecard parameters to fully load
      if (typeof (window as any).loadScorecardParameters === 'function') {
        await (window as any).loadScorecardParameters(scorecardId);
      }
      
      // Additional wait to ensure parameters are rendered in DOM
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      logError('Scorecard dropdown not populated yet');
      alert('Error: Scorecard dropdown not ready. Please refresh the page.');
    }
  }

  /**
   * Populate form with audit data
   */
  async populateFormWithAuditData(audit: any): Promise<void> {
    try {
      // Populate employee information
      await this.populateEmployeeFields(audit);
      
      // Populate interaction details
      this.populateInteractionFields(audit);
      
      // Populate audit type and validation
      this.populateAuditMetadata(audit);
      
      // Populate transcript and recommendations
      await this.populateContentFields(audit);
      
      // Wait for scorecard parameters to be fully loaded and rendered
      await this.waitForParameters();
      
      // Populate error parameters
      await this.populateParameters(audit);
      
      // Recalculate scores
      if (typeof (window as any).calculateAverageScore === 'function') {
        (window as any).calculateAverageScore();
      }
      
      logInfo('Form populated with audit data');
    } catch (error) {
      logError('Error populating form with audit data:', error);
    }
  }

  /**
   * Populate employee fields
   */
  private async populateEmployeeFields(audit: any): Promise<void> {
    const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
    const employeeEmail = document.getElementById('employeeEmail') as HTMLInputElement;
    const employeeType = document.getElementById('employeeType') as HTMLInputElement;
    const employeeDepartment = document.getElementById('employeeDepartment') as HTMLInputElement;
    const countryOfEmployee = document.getElementById('countryOfEmployee') as HTMLInputElement;
    
    if (employeeSelect && audit.employee_email) {
      // Wait for employee options to be populated if not ready
      let attempts = 0;
      while (employeeSelect.options.length === 0 && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Find and select the employee in dropdown
      let employeeFound = false;
      const normalizedEmail = (audit.employee_email || '').toLowerCase().trim();
      for (let i = 0; i < employeeSelect.options.length; i++) {
        const optionEmail = ((employeeSelect.options[i] as any).dataset?.email || '').toLowerCase().trim();
        if (optionEmail === normalizedEmail) {
          employeeSelect.selectedIndex = i;
          // Trigger change event to populate other fields
          employeeSelect.dispatchEvent(new Event('change'));
          employeeFound = true;
          break;
        }
      }
      
      if (!employeeFound && employeeSelect.options.length > 0) {
        logWarn('Employee not found in dropdown:', audit.employee_email);
      }
    }
    
    // Set employee fields directly from audit data (in case dropdown selection fails)
    if (employeeEmail) employeeEmail.value = audit.employee_email || '';
    if (employeeType) employeeType.value = audit.employee_type || '';
    if (employeeDepartment) employeeDepartment.value = audit.employee_department || '';
    if (countryOfEmployee) {
      countryOfEmployee.value = audit.country_of_employee || '';
    }
  }

  /**
   * Populate interaction fields
   */
  private populateInteractionFields(audit: any): void {
    const interactionId = document.getElementById('interactionId') as HTMLInputElement;
    const interactionDate = document.getElementById('interactionDate') as HTMLInputElement;
    const channel = document.getElementById('channel') as HTMLSelectElement;
    const clientEmail = document.getElementById('clientEmail') as HTMLInputElement;
    
    if (interactionId) interactionId.value = audit.interaction_id || '';
    if (interactionDate) interactionDate.value = audit.interaction_date || '';
    if (channel) channel.value = audit.channel || '';
    if (clientEmail) clientEmail.value = audit.client_email || '';
  }

  /**
   * Populate audit metadata
   */
  private populateAuditMetadata(audit: any): void {
    const auditType = document.getElementById('auditType') as HTMLSelectElement;
    const validationStatus = document.getElementById('validationStatus') as HTMLSelectElement;
    
    if (auditType) auditType.value = audit.audit_type || '';
    if (validationStatus) validationStatus.value = audit.validation_status || '';
  }

  /**
   * Populate content fields (transcript, recommendations)
   */
  private async populateContentFields(audit: any): Promise<void> {
    const transcript = document.getElementById('transcript') as HTMLTextAreaElement;
    if (transcript) transcript.value = audit.transcript || '';
    
    // Populate recommendations in Quill editor
    const quillManager = getQuillManager();
    if (quillManager.hasEditor('recommendations')) {
      const quill = quillManager.getEditor('recommendations');
      if (audit.recommendations) {
        // Check if it's already HTML (contains tags) or plain text
        if (audit.recommendations.trim().startsWith('<')) {
          // It's HTML, set directly
          quill.root.innerHTML = audit.recommendations;
        } else {
          // It's plain text, convert to HTML
          const escaped = await escapeHtml(audit.recommendations);
          const htmlContent = escaped.split('\n').map(line => `<p>${line}</p>`).join('');
          quill.root.innerHTML = htmlContent;
        }
      } else {
        quill.root.innerHTML = '';
      }
    } else {
      // Fallback to textarea for backward compatibility
      const recommendations = document.getElementById('recommendations') as HTMLTextAreaElement;
      if (recommendations) recommendations.value = audit.recommendations || '';
    }
  }

  /**
   * Wait for parameters to load
   */
  private async waitForParameters(): Promise<void> {
    let attempts = 0;
    const currentParameters = (window as any).currentParameters || [];
    while ((!currentParameters || currentParameters.length === 0) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= 30) {
      logWarn('Timeout waiting for scorecard parameters to load');
    }
  }

  /**
   * Populate parameters and feedback
   */
  private async populateParameters(audit: any): Promise<void> {
    const currentParameters = (window as any).currentParameters || [];
    
    if (!currentParameters || currentParameters.length === 0) {
      return;
    }
    
    currentParameters.forEach((param: any) => {
      const fieldId = param.field_id || param.fieldId;
      const fieldType = param.field_type || param.fieldType || 'counter';
      const fieldValue = audit[fieldId];
      
      if (fieldType === 'radio') {
        // Set radio button selection
        const radioYes = document.getElementById(`${fieldId}_yes`) as HTMLInputElement;
        const radioNo = document.getElementById(`${fieldId}_no`) as HTMLInputElement;
        
        if (fieldValue === 1 || fieldValue === true || fieldValue === 'true' || fieldValue === '1') {
          if (radioYes) radioYes.checked = true;
        } else {
          if (radioNo) radioNo.checked = true;
        }
      } else {
        // Set counter value
        const field = document.getElementById(fieldId) as HTMLInputElement;
        const counterValue = fieldValue || 0;
        if (field) {
          field.value = counterValue.toString();
        }
        
        // Update plain text display
        const displayElement = document.getElementById(`${fieldId}_display`);
        if (displayElement) {
          displayElement.textContent = counterValue.toString();
          // Update color based on value
          if (counterValue > 0) {
            (displayElement as HTMLElement).style.color = '#ef4444';
            (displayElement as HTMLElement).style.fontWeight = '700';
          } else {
            (displayElement as HTMLElement).style.color = '#1f2937';
            (displayElement as HTMLElement).style.fontWeight = '700';
          }
        }
      }
      
      // Populate feedback - handle both old format (string) and new format (JSON array)
      this.populateFeedbackForParameter(param, audit);
    });
  }

  /**
   * Populate feedback for a parameter
   */
  private populateFeedbackForParameter(param: any, audit: any): void {
    const fieldId = param.field_id || param.fieldId;
    const fieldType = param.field_type || param.fieldType || 'counter';
    const paramType = param.parameter_type || 'error';
    
    const feedbackData = audit[`feedback_${fieldId}`];
    let feedbackArray: string[] = [];
    
    if (feedbackData) {
      if (typeof feedbackData === 'string') {
        // Try to parse as JSON array, fallback to single string
        try {
          const parsed = JSON.parse(feedbackData);
          feedbackArray = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch (e) {
          // If not valid JSON, treat as single string (backward compatibility)
          feedbackArray = feedbackData.trim() ? [feedbackData] : [];
        }
      } else if (Array.isArray(feedbackData)) {
        feedbackArray = feedbackData;
      } else {
        feedbackArray = feedbackData ? [feedbackData] : [];
      }
    }
    
    // Update feedback boxes based on error count first, then populate values
    if (typeof (window as any).updateFeedbackBoxesForParameter === 'function') {
      (window as any).updateFeedbackBoxesForParameter(fieldId, fieldType, paramType);
    }
    
    // Populate feedback values into the boxes
    if (feedbackArray.length > 0) {
      const feedbackContainer = document.getElementById(`feedback_container_${fieldId}`);
      if (feedbackContainer) {
        feedbackArray.forEach((feedbackText, index) => {
          const feedbackId = `feedback_${fieldId}_${index}`;
          const textarea = document.getElementById(feedbackId) as HTMLTextAreaElement;
          if (textarea && feedbackText) {
            textarea.value = feedbackText;
            // Trigger auto-expand
            setTimeout(() => {
              textarea.style.height = 'auto';
              const scrollHeightRem = textarea.scrollHeight / 16;
              textarea.style.height = Math.min(scrollHeightRem, 50.0) + 'rem';
            }, 100);
          }
          
          // Also check for Quill editor feedback
          const quillManager = getQuillManager();
          const quillId = `quill_feedback_${fieldId}_${index}`;
          if (quillManager.hasEditor(quillId)) {
            const quill = quillManager.getEditor(quillId);
            if (feedbackText.trim().startsWith('<')) {
              quill.root.innerHTML = feedbackText;
            } else {
              quill.root.innerHTML = `<p>${feedbackText}</p>`;
            }
          }
        });
      }
    }
  }

  /**
   * Check calibration mode
   */
  private async checkCalibrationMode(): Promise<boolean> {
    const { checkCalibrationMode } = await import('../utils/calibration-mode.js');
    return checkCalibrationMode();
  }
}

// Singleton instance
let auditEditorInstance: AuditEditorController | null = null;

/**
 * Get audit editor instance
 */
export function getAuditEditor(): AuditEditorController {
  if (!auditEditorInstance) {
    auditEditorInstance = new AuditEditorController();
  }
  return auditEditorInstance;
}

/**
 * Load audit for editing (global function for backward compatibility)
 */
export async function loadAuditForEditing(): Promise<void> {
  await getAuditEditor().loadAuditForEditing();
}

/**
 * Populate form with audit data (global function for backward compatibility)
 */
export async function populateFormWithAuditData(audit: any): Promise<void> {
  await getAuditEditor().populateFormWithAuditData(audit);
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).loadAuditForEditing = loadAuditForEditing;
  (window as any).populateFormWithAuditData = populateFormWithAuditData;
}

