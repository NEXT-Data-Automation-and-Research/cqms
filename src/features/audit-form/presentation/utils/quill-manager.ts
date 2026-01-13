/**
 * Quill Editor Manager
 * Manages Quill editor instances for feedback fields
 * Migrated from audit-form.html
 */

import { logError, logWarn } from '../../../../utils/logging-helper.js';
import { escapeHtml } from '../../../../utils/html-sanitizer.js';

export class QuillManager {
  private quillInstances: Map<string, any> = new Map();

  /**
   * Initialize Quill editor for a feedback field
   */
  initializeEditor(
    containerId: string,
    feedbackId: string,
    placeholder: string,
    existingContent?: string,
    isRequired = false
  ): void {
    const container = document.getElementById(containerId);
    if (!container) {
      logError(`Container ${containerId} not found`);
      return;
    }

    // Check if Quill is available
    if (typeof (window as any).Quill === 'undefined') {
      logWarn('Quill.js is not loaded. Using textarea fallback.');
      this.createFallbackTextarea(container, feedbackId, placeholder, existingContent);
      return;
    }

    try {
      const Quill = (window as any).Quill;
      const quill = new Quill(container, {
        theme: 'snow',
        placeholder: placeholder,
        modules: {
          toolbar: [
            ['bold', 'italic'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'],
            ['clean']
          ]
        }
      });

      // Set existing content
      if (existingContent) {
        if (existingContent.trim().startsWith('<')) {
          // It's HTML, set directly
          quill.root.innerHTML = existingContent;
        } else {
          // It's plain text, convert to HTML
          const htmlContent = existingContent.split('\n')
            .map(line => `<p>${escapeHtml(line)}</p>`)
            .join('');
          quill.root.innerHTML = htmlContent;
        }
      }

      // Store instance
      this.quillInstances.set(feedbackId, quill);

      // Add validation for required fields
      if (isRequired) {
        quill.root.setAttribute('data-required', 'true');
        quill.on('text-change', () => {
          const content = quill.root.innerHTML;
          const isEmpty = !content || content.trim() === '' || content === '<p><br></p>';
          const qlContainer = container.querySelector('.ql-container') as HTMLElement;
          if (qlContainer) {
            qlContainer.style.borderColor = isEmpty ? '#ef4444' : '#10b981';
          }
        });
      }
    } catch (error) {
      logError('Error initializing Quill editor:', error);
      this.createFallbackTextarea(container, feedbackId, placeholder, existingContent);
    }
  }

  /**
   * Create fallback textarea when Quill is not available
   */
  private createFallbackTextarea(
    container: HTMLElement,
    feedbackId: string,
    placeholder: string,
    existingContent?: string
  ): void {
    const textarea = document.createElement('textarea');
    textarea.id = feedbackId;
    textarea.name = feedbackId;
    textarea.placeholder = placeholder;
    textarea.style.cssText = 'font-family: Poppins, sans-serif; font-size: 0.5659rem; line-height: 1.2; min-height: 1rem; max-height: 50rem; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; border: 0.0625rem solid #d1d5db; border-radius: 0.1617rem; padding: 0.2425rem 0.3234rem; width: 100%; box-sizing: border-box;';
    
    if (existingContent) {
      // Strip HTML tags for textarea
      textarea.value = existingContent.replace(/<[^>]*>/g, '');
    }

    container.replaceWith(textarea);
  }

  /**
   * Get Quill instance
   */
  getInstance(feedbackId: string): any {
    return this.quillInstances.get(feedbackId);
  }

  /**
   * Get Quill instance (alias for getInstance)
   */
  getQuillInstance(feedbackId: string): any {
    return this.getInstance(feedbackId);
  }

  /**
   * Initialize Quill editor (alias for initializeEditor with different signature)
   */
  initQuillEditor(
    containerId: string,
    placeholder: string,
    initialContent: string | null = null,
    isRequired: boolean = false
  ): void {
    // Extract feedbackId from containerId if possible
    const feedbackId = containerId.replace('quill_', '');
    this.initializeEditor(
      containerId,
      feedbackId,
      placeholder,
      initialContent || undefined,
      isRequired
    );
  }

  /**
   * Destroy Quill editor (alias for destroyInstance)
   */
  destroyQuillEditor(feedbackId: string): void {
    this.destroyInstance(feedbackId);
  }

  /**
   * Get all instances
   */
  getAllInstances(): Map<string, any> {
    return this.quillInstances;
  }

  /**
   * Destroy Quill instance
   */
  destroyInstance(feedbackId: string): void {
    const quill = this.quillInstances.get(feedbackId);
    if (quill && typeof quill.destroy === 'function') {
      try {
        quill.destroy();
      } catch (error) {
        logWarn('Error destroying Quill instance:', error);
      }
    }
    this.quillInstances.delete(feedbackId);
  }

  /**
   * Destroy all instances
   */
  destroyAllInstances(): void {
    this.quillInstances.forEach((quill, id) => {
      if (quill && typeof quill.destroy === 'function') {
        try {
          quill.destroy();
        } catch (error) {
          logWarn(`Error destroying Quill instance ${id}:`, error);
        }
      }
    });
    this.quillInstances.clear();
  }

  /**
   * Get content from Quill instance
   */
  getContent(feedbackId: string): string {
    const quill = this.quillInstances.get(feedbackId);
    if (!quill) return '';
    
    const content = quill.root.innerHTML;
    // Check if content is empty (Quill returns '<p><br></p>' for empty)
    if (!content || content.trim() === '' || content === '<p><br></p>') {
      return '';
    }
    return content.trim();
  }

  /**
   * Check if content exists
   */
  hasContent(feedbackId: string): boolean {
    const content = this.getContent(feedbackId);
    return content.length > 0;
  }

  /**
   * Check if editor exists
   */
  hasEditor(feedbackId: string): boolean {
    return this.quillInstances.has(feedbackId);
  }

  /**
   * Get editor instance
   */
  getEditor(feedbackId: string): any {
    return this.quillInstances.get(feedbackId);
  }
}

// Singleton instance
let quillManagerInstance: QuillManager | null = null;

/**
 * Get Quill manager instance
 */
export function getQuillManager(): QuillManager {
  if (!quillManagerInstance) {
    quillManagerInstance = new QuillManager();
  }
  return quillManagerInstance;
}

