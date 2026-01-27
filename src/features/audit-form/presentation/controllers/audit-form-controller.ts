/**
 * Audit Form Controller
 * Handles form submission and validation
 * Migrated from audit-form.html
 */

import { AuditFormService } from '../../application/audit-form-service.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getSupabaseClient } from '../utils/supabase-client-helper.js';
import type { AuditFormData, Scorecard, ScorecardParameter } from '../../domain/entities.js';

interface FormSubmissionState {
  isSubmitting: boolean;
  currentScorecard: Scorecard | null;
  currentParameters: ScorecardParameter[];
}

export class AuditFormController {
  private state: FormSubmissionState = {
    isSubmitting: false,
    currentScorecard: null,
    currentParameters: []
  };

  constructor(
    private service: AuditFormService,
    private form: HTMLFormElement
  ) {}

  /**
   * Initialize form submission handler and real-time validation
   */
  initialize(): void {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.setupRealTimeValidation();
  }

  /**
   * Setup real-time validation on blur
   */
  private setupRealTimeValidation(): void {
    // Validate interaction ID on blur
    const interactionIdField = document.getElementById('interactionId') as HTMLInputElement;
    if (interactionIdField) {
      interactionIdField.addEventListener('blur', () => {
        this.validateInteractionId(interactionIdField);
      });
    }

    // Setup validation for dynamically added fields
    // This will be called when parameters are loaded
    this.setupParameterValidation();
  }

  /**
   * Validate interaction ID field
   */
  private validateInteractionId(field: HTMLInputElement): void {
    const value = field.value?.trim() || '';
    const isValid = value.length > 0;
    
    if (!isValid) {
      field.style.borderColor = '#ef4444';
      this.showFieldError(field, 'Interaction ID is required');
    } else {
      field.style.borderColor = '#10b981';
      this.hideFieldError(field);
    }
  }

  /**
   * Setup validation for parameter fields
   */
  private setupParameterValidation(): void {
    // This will be called when parameters are rendered
    // We'll validate feedback fields when error count changes
    const observer = new MutationObserver(() => {
      this.attachFeedbackValidation();
    });

    const formContainer = this.form.querySelector('#parametersContainer') || this.form;
    observer.observe(formContainer, { childList: true, subtree: true });
  }

  /**
   * Attach validation to feedback fields
   */
  private attachFeedbackValidation(): void {
    this.state.currentParameters.forEach(param => {
      const errorCount = this.getParameterErrorCount(param);
      if (errorCount > 0) {
        const feedbackCount = Math.min(errorCount, 10);
        for (let i = 0; i < feedbackCount; i++) {
          const feedbackId = `feedback_${param.fieldId}_${i}`;
          const feedbackField = document.getElementById(feedbackId) as HTMLTextAreaElement;
          
          if (feedbackField && !feedbackField.hasAttribute('data-validation-attached')) {
            feedbackField.setAttribute('data-validation-attached', 'true');
            feedbackField.addEventListener('blur', () => {
              this.validateFeedbackField(feedbackField, param.errorName, i + 1, feedbackCount);
            });
          }

          // Also check Quill editors
          const quillContainer = document.querySelector(`#feedback_container_${param.fieldId} .quill-editor-container[data-feedback-index="${i}"]`);
          if (quillContainer) {
            const quillEditor = quillContainer.querySelector('.ql-editor') as HTMLElement;
            if (quillEditor && !quillEditor.hasAttribute('data-validation-attached')) {
              quillEditor.setAttribute('data-validation-attached', 'true');
              quillEditor.addEventListener('blur', () => {
                this.validateQuillFeedback(quillEditor, param.errorName, i + 1, feedbackCount);
              });
            }
          }
        }
      }
    });
  }

  /**
   * Validate feedback field
   */
  private validateFeedbackField(field: HTMLTextAreaElement, paramName: string, index: number, total: number): void {
    const value = field.value?.trim() || '';
    const isValid = value.length > 0;
    
    if (!isValid) {
      field.style.borderColor = '#ef4444';
      this.showFieldError(field, `Feedback is required for "${paramName}" (Feedback ${index} of ${total})`);
    } else {
      field.style.borderColor = '#10b981';
      this.hideFieldError(field);
    }
  }

  /**
   * Validate Quill editor feedback
   */
  private validateQuillFeedback(editor: HTMLElement, paramName: string, index: number, total: number): void {
    const content = editor.innerHTML?.trim() || '';
    const isEmpty = !content || content === '<p><br></p>';
    const container = editor.closest('.ql-container') as HTMLElement;
    
    if (container) {
      if (isEmpty) {
        container.style.borderColor = '#ef4444';
        this.showFieldError(container, `Feedback is required for "${paramName}" (Feedback ${index} of ${total})`);
      } else {
        container.style.borderColor = '#10b981';
        this.hideFieldError(container);
      }
    }
  }

  /**
   * Show field error message
   */
  private showFieldError(field: HTMLElement, message: string): void {
    // Remove existing error
    this.hideFieldError(field);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.style.cssText = `
      font-size: 0.75rem;
      color: #ef4444;
      margin-top: 0.25rem;
      margin-left: 0.25rem;
    `;
    errorDiv.textContent = message;
    
    field.parentElement?.appendChild(errorDiv);
  }

  /**
   * Hide field error message
   */
  private hideFieldError(field: HTMLElement): void {
    const errorDiv = field.parentElement?.querySelector('.field-error-message');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  /**
   * Set current scorecard and parameters
   */
  setScorecardData(scorecard: Scorecard | null, parameters: ScorecardParameter[]): void {
    this.state.currentScorecard = scorecard;
    this.state.currentParameters = parameters;
    // Setup validation for newly loaded parameters
    setTimeout(() => {
      this.attachFeedbackValidation();
    }, 100);
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(e: Event): Promise<void> {
    logInfo('Form submit event fired');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Prevent duplicate submissions
    if (this.state.isSubmitting) {
      logWarn('Submission already in progress, ignoring duplicate submit event');
      return;
    }

    // Disable submit button immediately and show loading state
    const submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalButtonText = submitButton?.textContent || 'Submit';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      submitButton.style.opacity = '0.7';
      submitButton.style.cursor = 'not-allowed';
    }

    this.state.isSubmitting = true;

    try {
      // Validate scorecard selection
      if (!this.state.currentScorecard || !this.state.currentParameters || this.state.currentParameters.length === 0) {
        await this.showErrorDialog('No Scorecard Selected', 'Please select a scorecard before submitting the audit.');
        this.state.isSubmitting = false;
        // Re-enable button on error
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
          submitButton.style.opacity = '1';
          submitButton.style.cursor = 'pointer';
        }
        return;
      }

      // Wait for Supabase client
      const supabase = await this.waitForSupabaseClient();
      if (!supabase) {
        await this.showErrorDialog(
          'Initialization Error',
          'Supabase client not initialized. Please refresh the page and try again.'
        );
        this.state.isSubmitting = false;
        // Re-enable button on error
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
          submitButton.style.opacity = '1';
          submitButton.style.cursor = 'pointer';
        }
        return;
      }

      logInfo('Supabase client is ready');
      logInfo('Saving to table:', this.state.currentScorecard.tableName);

      // Collect and validate form data
      const auditData = await this.collectFormData();
      
      // Validate form data
      const validationErrors = this.validateFormData(auditData);
      if (validationErrors.length > 0) {
        await this.showValidationErrors(validationErrors);
        this.state.isSubmitting = false;
        // Re-enable button on validation error
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
          submitButton.style.opacity = '1';
          submitButton.style.cursor = 'pointer';
        }
        return;
      }

      // Save audit
      await this.saveAudit(auditData);

      // Send notifications (non-blocking)
      this.sendNotifications(auditData, this.state.currentScorecard).catch(err => {
        logError('Error sending notifications:', err);
      });

      // Show success message
      await this.showSuccessDialog();

      // Redirect or reset form
      this.handleSubmissionSuccess();
    } catch (error) {
      logError('Error submitting audit form:', error);
      await this.showErrorDialog('Submission Error', 'Failed to submit audit. Please try again.');
      // Re-enable button on error
      const submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = '✓ Submit Audit';
        submitButton.style.opacity = '1';
        submitButton.style.cursor = 'pointer';
      }
    } finally {
      this.state.isSubmitting = false;
    }
  }

  /**
   * Wait for Supabase client to be ready
   */
  private async waitForSupabaseClient(maxAttempts = 50): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await getSupabaseClient();
      } catch (error) {
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    return null;
  }

  /**
   * Collect form data
   */
  private async collectFormData(): Promise<Partial<AuditFormData>> {
    const formData = new FormData(this.form);
    const auditData: any = {};

    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      auditData[key] = value;
    }

    // Collect dynamic parameter fields
    this.state.currentParameters.forEach(param => {
      if (param.fieldType === 'radio') {
        const selectedRadio = document.querySelector(`input[name="${param.fieldId}"]:checked`) as HTMLInputElement;
        auditData[param.fieldId] = selectedRadio ? parseInt(selectedRadio.value) : 0;
      } else {
        const field = document.getElementById(param.fieldId) as HTMLInputElement;
        auditData[param.fieldId] = field ? (parseInt(field.value) || 0) : 0;
      }

      // Collect feedback boxes
      const feedbacks = this.collectParameterFeedback(param.fieldId);
      auditData[`feedback_${param.fieldId}`] = feedbacks.length > 0 ? feedbacks : null;

      // Collect parameter comments
      const comments = this.collectParameterComments(param.fieldId);
      if (comments.length > 0) {
        if (!auditData.parameter_comments) {
          auditData.parameter_comments = {};
        }
        const userEmail = this.getCurrentUserEmail();
        auditData.parameter_comments[param.fieldId] = {
          comments: comments,
          commented_at: new Date().toISOString(),
          commented_by: userEmail
        };
      }
    });

    // Update employee name from selected option using multiple fallback methods
    const employeeSelect = document.getElementById('employeeName') as HTMLSelectElement;
    let employeeNameFound = false;

    // Method 1: Get from selected option using selectedIndex
    if (employeeSelect && employeeSelect.selectedIndex > 0) {
      const selectedOption = employeeSelect.options[employeeSelect.selectedIndex];
      if (selectedOption && selectedOption.value && selectedOption.textContent) {
        auditData.employeeName = selectedOption.textContent.trim();
        employeeNameFound = true;
      }
    }

    // Method 2: If Method 1 failed, try finding option by email value
    if (!employeeNameFound && employeeSelect && auditData.employeeEmail) {
      const emailToFind = (auditData.employeeEmail as string).toLowerCase().trim();
      for (let i = 0; i < employeeSelect.options.length; i++) {
        const opt = employeeSelect.options[i];
        if (opt.value && opt.value.toLowerCase().trim() === emailToFind) {
          const optName = opt.dataset.name || opt.textContent;
          if (optName && optName.trim()) {
            auditData.employeeName = optName.trim();
            employeeNameFound = true;
          }
          break;
        }
      }
    }

    // Method 3: If still not found, try using the select's current value
    if (!employeeNameFound && employeeSelect && employeeSelect.value) {
      const currentValue = employeeSelect.value.toLowerCase().trim();
      for (let i = 0; i < employeeSelect.options.length; i++) {
        const opt = employeeSelect.options[i];
        if (opt.value && opt.value.toLowerCase().trim() === currentValue) {
          const optName = opt.dataset.name || opt.textContent;
          if (optName && optName.trim()) {
            auditData.employeeName = optName.trim();
            employeeNameFound = true;
          }
          break;
        }
      }
    }

    // Method 4: If still not found, try the hidden employeeNameDisplay field
    if (!employeeNameFound) {
      const employeeNameDisplayField = document.getElementById('employeeNameDisplay') as HTMLInputElement;
      if (employeeNameDisplayField && employeeNameDisplayField.value && employeeNameDisplayField.value.trim()) {
        auditData.employeeName = employeeNameDisplayField.value.trim();
        employeeNameFound = true;
      }
    }

    // Method 5: Last resort - use employeeNameDisplay from auditData if available
    if (!employeeNameFound && auditData.employeeNameDisplay) {
      const nameDisplay = auditData.employeeNameDisplay as string;
      if (nameDisplay && nameDisplay.trim()) {
        auditData.employeeName = nameDisplay.trim();
        employeeNameFound = true;
      }
    }

    // Update channel with the actual name from the selected option (not UUID)
    const channelSelect = document.getElementById('channel') as HTMLSelectElement;
    if (channelSelect && channelSelect.selectedIndex > 0) {
      const selectedChannelOption = channelSelect.options[channelSelect.selectedIndex];
      if (selectedChannelOption && selectedChannelOption.value && selectedChannelOption.textContent) {
        auditData.channel = selectedChannelOption.textContent.trim();
      }
    }

    // Collect recommendations from Quill editor
    const recommendations = this.collectRecommendations();
    if (recommendations) {
      auditData.recommendations = recommendations;
    }

    return auditData;
  }

  /**
   * Collect parameter feedback
   */
  private collectParameterFeedback(fieldId: string): string[] {
    const feedbacks: string[] = [];
    const feedbackContainer = document.getElementById(`feedback_container_${fieldId}`);
    
    if (!feedbackContainer) return feedbacks;

    // Get feedback from Quill editors (if available)
    const quillContainers = feedbackContainer.querySelectorAll('.quill-editor-container');
    quillContainers.forEach((container) => {
      const editor = container.querySelector('.ql-editor') as HTMLElement;
      if (editor) {
        const htmlContent = editor.innerHTML;
        if (htmlContent && htmlContent.trim() && htmlContent !== '<p><br></p>') {
          // HTML is already sanitized by safeSetHTML when rendered
          // Just trim and store
          feedbacks.push(htmlContent.trim());
        }
      }
    });

    // Fallback to textareas
    if (feedbacks.length === 0) {
      const textareas = feedbackContainer.querySelectorAll(`textarea[id^="feedback_${fieldId}_"]`);
      textareas.forEach(textarea => {
        const textareaEl = textarea as HTMLTextAreaElement;
        if (textareaEl.value && textareaEl.value.trim()) {
          const plainText = textareaEl.value.trim();
          const htmlText = plainText.split('\n').map(line => `<p>${this.escapeHtml(line)}</p>`).join('');
          feedbacks.push(htmlText);
        }
      });
    }

    return feedbacks;
  }

  /**
   * Collect parameter comments
   */
  private collectParameterComments(fieldId: string): string[] {
    const comments: string[] = [];
    const commentInputs = document.querySelectorAll(`input[data-param-key="${fieldId}"]`);
    commentInputs.forEach(input => {
      const inputEl = input as HTMLInputElement;
      if (inputEl.value && inputEl.value.trim()) {
        comments.push(inputEl.value.trim());
      }
    });
    return comments;
  }

  /**
   * Collect recommendations from Quill editor
   */
  private collectRecommendations(): string | null {
    // Check for Quill editor instance (would need to be passed in or accessed globally)
    // For now, check textarea fallback
    const recommendationsField = document.getElementById('recommendations') as HTMLTextAreaElement;
    if (recommendationsField && recommendationsField.value && recommendationsField.value.trim()) {
      const plainText = recommendationsField.value.trim();
      return plainText.split('\n').map(line => `<p>${this.escapeHtml(line)}</p>`).join('');
    }
    return null;
  }

  /**
   * Validate form data
   */
  private validateFormData(auditData: any): string[] {
    const errors: string[] = [];

    // Validate interaction ID
    const interactionIdField = document.getElementById('interactionId') as HTMLInputElement;
    if (!interactionIdField || !interactionIdField.value || !interactionIdField.value.trim()) {
      errors.push('Interaction ID is required. Please enter an Interaction ID before submitting.');
      return errors;
    }

    // Validate feedback fields when error count > 0
    this.state.currentParameters.forEach(param => {
      const errorCount = this.getParameterErrorCount(param);
      
      if (errorCount > 0) {
        const feedbackCount = Math.min(errorCount, 10);
        for (let i = 0; i < feedbackCount; i++) {
          const feedbackId = `feedback_${param.fieldId}_${i}`;
          const hasContent = this.hasFeedbackContent(feedbackId);
          
          if (!hasContent) {
            errors.push(`Feedback is required for "${param.errorName}" (Feedback ${i + 1} of ${feedbackCount})`);
          }
        }
      }
    });

    return errors;
  }

  /**
   * Get parameter error count
   */
  private getParameterErrorCount(param: ScorecardParameter): number {
    if (param.fieldType === 'radio') {
      const selectedRadio = document.querySelector(`input[name="${param.fieldId}"]:checked`) as HTMLInputElement;
      if (selectedRadio) {
        const value = parseInt(selectedRadio.value) || 0;
        const paramType = param.parameterType || 'error';
        if (paramType === 'achievement' || paramType === 'bonus') {
          return value === 0 ? 1 : 0;
        }
        return value;
      }
      return 0;
    } else {
      const field = document.getElementById(param.fieldId) as HTMLInputElement;
      return field ? (parseInt(field.value) || 0) : 0;
    }
  }

  /**
   * Check if feedback has content
   */
  private hasFeedbackContent(feedbackId: string): boolean {
    // Check Quill editor (would need quillInstances map)
    // For now, check textarea fallback
    const feedbackField = document.getElementById(feedbackId) as HTMLTextAreaElement;
    return feedbackField ? (feedbackField.value?.trim().length ?? 0) > 0 : false;
  }

  /**
   * Save audit to database
   */
  private async saveAudit(auditData: Partial<AuditFormData>): Promise<void> {
    if (!this.state.currentScorecard) {
      throw new Error('No scorecard selected');
    }

    // Prepare audit payload
    const payload = this.prepareAuditPayload(auditData);

    // Save using service
    await this.service.saveAudit(this.state.currentScorecard.tableName, payload);
    
    logInfo('Audit saved successfully');
  }

  /**
   * Prepare audit payload
   */
  private prepareAuditPayload(auditData: any): Partial<AuditFormData> {
    const payload: any = {
      employeeEmail: auditData.employeeEmail || null,
      employeeName: auditData.employeeName || null,
      employeeType: auditData.employeeType || null,
      employeeDepartment: auditData.employeeDepartment || null,
      countryOfEmployee: auditData.countryOfEmployee || null,
      auditorEmail: auditData.auditorEmail || null,
      auditorName: auditData.auditorName || null,
      interactionId: auditData.interactionId || null,
      interactionDate: auditData.interactionDate || null,
      channel: auditData.channel || null,
      transcript: auditData.transcript || null,
      scorecardId: this.state.currentScorecard?.id || null,
      quarter: auditData.quarter || null,
      week: auditData.week ? parseInt(auditData.week) : undefined,
      passingStatus: auditData.passingStatus || null,
      averageScore: auditData.averageScore ? parseFloat(auditData.averageScore) : undefined,
      totalErrorsCount: auditData.totalErrorsCount ? parseInt(auditData.totalErrorsCount) : undefined,
      recommendations: auditData.recommendations || null,
      auditDuration: auditData.auditDuration ? parseInt(auditData.auditDuration) : undefined
    };

    // Add dynamic parameter fields
    this.state.currentParameters.forEach(param => {
      const fieldValue = auditData[param.fieldId];
      payload[param.fieldId] = fieldValue ? parseInt(fieldValue) : 0;

      const feedbackKey = `feedback_${param.fieldId}`;
      const feedbackValue = auditData[feedbackKey];
      payload[feedbackKey] = Array.isArray(feedbackValue) && feedbackValue.length > 0 
        ? feedbackValue 
        : null;
    });

    // Add parameter comments
    if (auditData.parameter_comments && Object.keys(auditData.parameter_comments).length > 0) {
      payload.parameterComments = auditData.parameter_comments;
    }

    return payload;
  }

  /**
   * Send notifications (email, webhook)
   */
  private async sendNotifications(auditData: Partial<AuditFormData>, scorecard: Scorecard): Promise<void> {
    // Email notification
    await this.sendEmailNotification(auditData, scorecard).catch(err => {
      logWarn('Email notification failed:', err);
    });

    // N8N webhook
    await this.sendN8nWebhook(auditData, scorecard).catch(err => {
      logWarn('N8N webhook failed:', err);
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(auditData: Partial<AuditFormData>, scorecard: Scorecard): Promise<void> {
    try {
      const supabaseUrl = (window as any).env?.SUPABASE_URL || (window as any).SUPABASE_URL;
      const supabaseAnonKey = (window as any).env?.SUPABASE_ANON_KEY || (window as any).SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        logWarn('Supabase configuration not found. Email notification skipped.');
        return;
      }
      
      const emailData = {
        employee_email: auditData.employeeEmail || null,
        employee_name: auditData.employeeName || null,
        auditor_name: auditData.auditorName || null,
        auditor_email: auditData.auditorEmail || null,
        audit_id: (auditData as any).id || null,
        audit_type: auditData.auditType || null,
        passing_status: auditData.passingStatus || null,
        average_score: auditData.averageScore || null,
        submitted_at: (auditData as any).submitted_at || null,
        scorecard_name: scorecard.name || null
      };
      
      if (!emailData.employee_email) {
        logWarn('Employee email not found. Email notification skipped.');
        return;
      }
      
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-audit-email`;
      logInfo(`Sending email notification to: ${emailData.employee_email}`);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logError(`Email notification API error: ${response.status} ${response.statusText} - ${errorText}`);
        return;
      }
      
      const result = await response.json();
      if (result.success) {
        logInfo('Email notification sent successfully');
      } else {
        logWarn(`Email notification not sent: ${result.message || result.warning}`);
      }
    } catch (error) {
      logError('Error sending email notification:', error);
    }
  }

  /**
   * Send N8N webhook
   */
  private async sendN8nWebhook(auditData: Partial<AuditFormData>, scorecard: Scorecard): Promise<void> {
    try {
      const n8nWebhookUrl = (window as any).env?.N8N_WEBHOOK_URL || (window as any).N8N_WEBHOOK_URL || 
        'https://qaatsaas.app.n8n.cloud/webhook/audit-submission';
      
      if (!n8nWebhookUrl) {
        logWarn('N8N webhook URL not configured. Skipping n8n webhook notification.');
        return;
      }
      
      const baseUrl = window.location?.origin || (window as any).env?.BASE_URL || (window as any).BASE_URL || '';
      
      const webhookData = {
        employee_email: auditData.employeeEmail || null,
        employee_name: auditData.employeeName || null,
        employeeEmail: auditData.employeeEmail || null,
        employeeName: auditData.employeeName || null,
        auditor_name: auditData.auditorName || null,
        auditor_email: auditData.auditorEmail || null,
        auditorName: auditData.auditorName || null,
        auditorEmail: auditData.auditorEmail || null,
        audit_id: (auditData as any).id || null,
        id: (auditData as any).id || null,
        audit_type: auditData.auditType || null,
        auditType: auditData.auditType || null,
        passing_status: auditData.passingStatus || null,
        passingStatus: auditData.passingStatus || null,
        average_score: auditData.averageScore || null,
        averageScore: auditData.averageScore || null,
        submitted_at: (auditData as any).submitted_at || null,
        submittedAt: (auditData as any).submitted_at || null,
        scorecard_name: scorecard.name || null,
        scorecardName: scorecard.name || null,
        scorecard_id: scorecard.id || null,
        scorecardId: scorecard.id || null,
        table_name: scorecard.tableName || null,
        tableName: scorecard.tableName || null,
        base_url: baseUrl || null,
        baseUrl: baseUrl || null
      };
      
      if (!webhookData.employee_email) {
        logWarn('Employee email not found. n8n webhook notification skipped.');
        return;
      }
      
      logInfo(`Sending audit submission to n8n webhook: ${n8nWebhookUrl}`);
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(webhookData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logError(`n8n webhook error: ${response.status} ${response.statusText} - ${errorText}`);
        return;
      }
      
      const result = await response.json();
      logInfo('n8n webhook triggered successfully');
    } catch (error) {
      logError('Error sending n8n webhook:', error);
    }
  }

  /**
   * Show error dialog
   */
  private async showErrorDialog(title: string, message: string): Promise<void> {
    if ((window as any).confirmationDialog && typeof (window as any).confirmationDialog.show === 'function') {
      await (window as any).confirmationDialog.show({
        title,
        message,
        confirmText: 'OK',
        type: 'error'
      });
    } else {
      alert(`${title}: ${message}`);
    }
  }

  /**
   * Show validation errors
   */
  private async showValidationErrors(errors: string[]): Promise<void> {
    const message = 'Please fill in all required fields:\n\n' + 
      errors.slice(0, 5).join('\n') + 
      (errors.length > 5 ? `\n... and ${errors.length - 5} more` : '');
    
    await this.showErrorDialog('Validation Error', message);
  }

  /**
   * Show success dialog
   */
  private async showSuccessDialog(): Promise<void> {
    if ((window as any).confirmationDialog && typeof (window as any).confirmationDialog.show === 'function') {
      await (window as any).confirmationDialog.show({
        title: 'Success',
        message: 'Audit submitted successfully!',
        confirmText: 'OK',
        type: 'success'
      });
    }
  }

  /**
   * Handle submission success
   */
  private handleSubmissionSuccess(): void {
    // Reset form or redirect
    this.form.reset();
    // Could redirect to audit view or dashboard
  }

  /**
   * Get current user email
   */
  private getCurrentUserEmail(): string {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        return userInfo.email || '';
      }
    } catch (error) {
      logWarn('Error getting user email:', error);
    }
    return '';
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

