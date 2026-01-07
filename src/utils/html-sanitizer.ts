/**
 * HTML Sanitization Utility
 * Safe HTML rendering functions to prevent XSS attacks
 */

// Static import - should be available via import map in HTML pages
// If import fails, the module won't load, so we need to handle that at usage time
import DOMPurify from 'dompurify';

/**
 * Check if DOMPurify is available and working
 */
function isDOMPurifyAvailable(): boolean {
  try {
    return typeof DOMPurify !== 'undefined' && 
           DOMPurify !== null && 
           typeof DOMPurify.sanitize === 'function';
  } catch {
    return false;
  }
}

/**
 * Escape HTML to prevent XSS attacks
 * Converts special characters to HTML entities
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely set HTML content using DOMPurify
 * Use this instead of innerHTML when you need to render HTML
 */
export function safeSetHTML(element: HTMLElement | null, html: string): void {
  if (!element) return;
  
  if (isDOMPurifyAvailable()) {
    try {
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'div', 'nav', 'ul', 'ol', 'li', 'button', 'svg', 'path', 'polyline', 'polygon', 'circle', 'rect', 'g', 'line', 'input', 'label', 'h2', 'h3', 'style', 'img', 'select', 'option'],
        ALLOWED_ATTR: ['href', 'class', 'id', 'title', 'target', 'role', 'aria-label', 'aria-hidden', 'tabindex', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'type', 'checked', 'disabled', 'xmlns', 'style', 'src', 'alt', 'width', 'height', 'referrerPolicy', 'points', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'selected', 'value', 'name'],
        ALLOW_DATA_ATTR: true // Allow data-* attributes for employee selection, event tracking, etc.
      });
      element.innerHTML = sanitized;
    } catch (error) {
      // If sanitization fails, fall back to escaping
      console.warn('[HTML Sanitizer] DOMPurify sanitization failed, using escapeHtml:', error);
      element.innerHTML = escapeHtml(html);
    }
  } else {
    // Fallback: if DOMPurify isn't loaded, escape the HTML
    console.warn('[HTML Sanitizer] DOMPurify not available, using escapeHtml fallback');
    element.innerHTML = escapeHtml(html);
  }
}

/**
 * Safely set text content of an element
 * Use this instead of innerHTML when setting plain text
 */
export function setTextContent(element: HTMLElement | null, text: string | null | undefined): void {
  if (!element) return;
  element.textContent = text || '';
}

/**
 * Safely create a text node and append to element
 */
export function appendTextNode(element: HTMLElement, text: string): void {
  element.appendChild(document.createTextNode(text));
}

/**
 * Safely create an element with text content
 */
export function createTextElement(tagName: string, text: string, className?: string): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) {
    element.className = className;
  }
  return element;
}

/**
 * Sanitize HTML string using DOMPurify
 * Returns sanitized HTML string
 * 
 * @param html - HTML string to sanitize
 * @param allowTrustedContent - If true and DOMPurify isn't available, return HTML as-is (for trusted templates)
 */
export function sanitizeHTML(html: string, allowTrustedContent: boolean = false): string {
  if (isDOMPurifyAvailable()) {
    try {
      const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'div', 'ul', 'ol', 'li', 'nav', 'button', 'svg', 'path', 'polyline', 'polygon', 'circle', 'rect', 'g', 'line', 'input', 'label', 'h2', 'h3', 'style', 'img', 'select', 'option'];
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: ['href', 'class', 'id', 'title', 'target', 'role', 'aria-label', 'aria-hidden', 'tabindex', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'type', 'checked', 'disabled', 'xmlns', 'style', 'src', 'alt', 'width', 'height', 'referrerPolicy', 'points', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'selected', 'value', 'name'],
        ALLOW_DATA_ATTR: true // Allow data-* attributes for employee selection, event tracking, etc.
      });
      return sanitized;
    } catch (error) {
      // If sanitization fails, fall back to escaping
      console.warn('[HTML Sanitizer] DOMPurify sanitization failed, using escapeHtml:', error);
      if (allowTrustedContent) {
        return html;
      }
      return escapeHtml(html);
    }
  } else {
    // Fallback: escape HTML if DOMPurify isn't available
    // Unless it's trusted content (like embedded templates)
    if (allowTrustedContent) {
      console.warn('[HTML Sanitizer] DOMPurify not available, returning trusted content as-is');
      return html;
    }
    console.warn('[HTML Sanitizer] DOMPurify not available, using escapeHtml fallback');
    return escapeHtml(html);
  }
}
