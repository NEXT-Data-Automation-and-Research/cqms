/**
 * Form Data Collector Utilities
 * Collects and validates form data from audit form
 * Extracted from new-audit-form.html
 */

import type { ScorecardParameter } from '../../domain/entities.js';
import { logInfo, logWarn } from '../../../../utils/logging-helper.js';

export interface ParameterValue {
  parameterId: string;
  fieldId: string;
  value: number;
}

export interface ParameterFeedback {
  fieldId: string;
  feedbacks: string[];
}

export interface ParameterComment {
  fieldId: string;
  comments: string[];
  commentedAt: string;
  commentedBy: string;
}

/**
 * Collect parameter values from form
 */
export function collectParameterValues(parameters: ScorecardParameter[]): ParameterValue[] {
  const values: ParameterValue[] = [];

  parameters.forEach(param => {
    let value = 0;

    if (param.fieldType === 'radio') {
      const selectedRadio = document.querySelector(`input[name="${param.fieldId}"]:checked`) as HTMLInputElement;
      value = selectedRadio ? parseInt(selectedRadio.value) || 0 : 0;
    } else {
      const field = document.getElementById(param.fieldId) as HTMLInputElement;
      value = field ? (parseInt(field.value) || 0) : 0;
    }

    values.push({
      parameterId: param.id,
      fieldId: param.fieldId,
      value
    });
  });

  return values;
}

/**
 * Collect parameter feedback from form
 */
export function collectParameterFeedback(fieldId: string): string[] {
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
        const htmlText = plainText.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
        feedbacks.push(htmlText);
      }
    });
  }

  return feedbacks;
}

/**
 * Collect all parameter feedbacks
 */
export function collectAllParameterFeedbacks(parameters: ScorecardParameter[]): ParameterFeedback[] {
  const feedbacks: ParameterFeedback[] = [];

  parameters.forEach(param => {
    const paramFeedbacks = collectParameterFeedback(param.fieldId);
    if (paramFeedbacks.length > 0) {
      feedbacks.push({
        fieldId: param.fieldId,
        feedbacks: paramFeedbacks
      });
    }
  });

  return feedbacks;
}

/**
 * Collect parameter comments from form
 */
export function collectParameterComments(fieldId: string): string[] {
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
 * Collect all parameter comments
 */
export function collectAllParameterComments(parameters: ScorecardParameter[], userEmail: string): Record<string, ParameterComment> {
  const comments: Record<string, ParameterComment> = {};

  parameters.forEach(param => {
    const paramComments = collectParameterComments(param.fieldId);
    if (paramComments.length > 0) {
      comments[param.fieldId] = {
        fieldId: param.fieldId,
        comments: paramComments,
        commentedAt: new Date().toISOString(),
        commentedBy: userEmail
      };
    }
  });

  return comments;
}

/**
 * Collect recommendations from Quill editor or textarea
 */
export function collectRecommendations(): string | null {
  // Check for Quill editor instance
  const quillInstances = (window as any).quillInstances;
  if (quillInstances && quillInstances instanceof Map) {
    const quill = quillInstances.get('recommendations');
    if (quill && quill.root) {
      const htmlContent = quill.root.innerHTML;
      if (htmlContent && htmlContent.trim() && htmlContent !== '<p><br></p>') {
        return htmlContent.trim();
      }
    }
  }

  // Fallback to textarea
  const recommendationsField = document.getElementById('recommendations') as HTMLTextAreaElement;
  if (recommendationsField && recommendationsField.value && recommendationsField.value.trim()) {
    const plainText = recommendationsField.value.trim();
    return plainText.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
  }

  return null;
}

/**
 * Get current user email
 */
export function getCurrentUserEmail(): string {
  // Try multiple ways to get user email
  const session = (window as any).supabaseClient?.auth?.session();
  if (session?.user?.email) {
    return session.user.email;
  }

  const userEmail = (window as any).currentUserEmail;
  if (userEmail) {
    return userEmail;
  }

  // Try to get from auth check
  const authCheck = (window as any).authCheck;
  if (authCheck?.user?.email) {
    return authCheck.user.email;
  }

  logWarn('Could not determine current user email');
  return '';
}

/**
 * Get current user name
 */
export function getCurrentUserName(): string {
  const session = (window as any).supabaseClient?.auth?.session();
  if (session?.user?.user_metadata?.full_name) {
    return session.user.user_metadata.full_name;
  }

  const userName = (window as any).currentUserName;
  if (userName) {
    return userName;
  }

  return '';
}

/**
 * Escape HTML helper
 */
function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get parameter error count
 */
export function getParameterErrorCount(param: ScorecardParameter): number {
  if (param.fieldType === 'radio') {
    const selectedRadio = document.querySelector(`input[name="${param.fieldId}"]:checked`) as HTMLInputElement;
    if (selectedRadio) {
      const value = parseInt(selectedRadio.value) || 0;
      const paramType = param.parameterType || 'error';
      // For achievement/bonus: NO (0) = error
      // For error parameters: YES (1) = error
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
export function hasFeedbackContent(feedbackId: string): boolean {
  // Check Quill editor
  const quillInstances = (window as any).quillInstances;
  if (quillInstances && quillInstances instanceof Map) {
    const quill = quillInstances.get(feedbackId);
    if (quill && quill.root) {
      const htmlContent = quill.root.innerHTML;
      return htmlContent && htmlContent.trim() && htmlContent !== '<p><br></p>';
    }
  }

  // Fallback to textarea
  const feedbackField = document.getElementById(feedbackId) as HTMLTextAreaElement;
  return feedbackField ? (feedbackField.value?.trim().length ?? 0) > 0 : false;
}
