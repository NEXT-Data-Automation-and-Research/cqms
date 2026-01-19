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
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'div', 'nav', 'ul', 'ol', 'li', 'button', 'svg', 'path', 'polyline', 'polygon', 'circle', 'rect', 'g', 'line', 'input', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'style', 'img', 'select', 'option', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'form', 'textarea', 'small', 'main', 'section', 'article', 'header', 'footer', 'aside', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'blockquote', 'cite', 'code', 'pre', 'mark', 'del', 'ins', 'sub', 'sup', 'time', 'abbr', 'address', 'hr'],
        ALLOWED_ATTR: ['href', 'class', 'id', 'title', 'target', 'role', 'aria-label', 'aria-hidden', 'aria-expanded', 'aria-current', 'aria-describedby', 'aria-live', 'tabindex', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'd', 'type', 'checked', 'disabled', 'readonly', 'xmlns', 'style', 'src', 'alt', 'width', 'height', 'referrerPolicy', 'points', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'selected', 'value', 'name', 'colspan', 'rowspan', 'colSpan', 'rowSpan', 'placeholder', 'for', 'min', 'max', 'step', 'required', 'pattern', 'rows', 'cols', 'autocomplete', 'autofocus', 'multiple', 'size', 'spellcheck', 'wrap', 'accept', 'accept-charset', 'action', 'enctype', 'method', 'novalidate', 'rel', 'download', 'hreflang', 'media', 'ping', 'referrerpolicy', 'shape', 'coords', 'usemap', 'ismap', 'loading', 'decoding', 'crossorigin', 'sizes', 'srcset', 'datetime', 'pubdate', 'cite', 'open', 'reversed', 'start'],
        ALLOW_DATA_ATTR: true, // Allow data-* attributes for employee selection, event tracking, etc.
        ALLOW_ARIA_ATTR: true, // Allow all ARIA attributes
        KEEP_CONTENT: true, // Keep text content even if tags are removed
        RETURN_DOM: false, // Return string, not DOM
        RETURN_DOM_FRAGMENT: false, // Return string, not DOM fragment
        RETURN_TRUSTED_TYPE: false // Return string
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
 * Safely set HTML content for table body elements
 * Wraps tr elements in tbody for proper sanitization, then extracts them
 */
export function safeSetTableBodyHTML(tbody: HTMLTableSectionElement | null, html: string): void {
  if (!tbody) return;
  
  if (isDOMPurifyAvailable()) {
    try {
      // Wrap tr elements in a full table structure for proper sanitization context
      // DOMPurify needs the full table context to preserve tbody and tr tags
      const wrappedHtml = `<table><tbody>${html}</tbody></table>`;
      
      const sanitized = DOMPurify.sanitize(wrappedHtml, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'div', 'nav', 'ul', 'ol', 'li', 'button', 'svg', 'path', 'polyline', 'polygon', 'circle', 'rect', 'g', 'line', 'input', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'style', 'img', 'select', 'option', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
        ALLOWED_ATTR: ['href', 'class', 'id', 'title', 'target', 'role', 'aria-label', 'aria-hidden', 'aria-expanded', 'aria-current', 'aria-describedby', 'aria-live', 'tabindex', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'd', 'type', 'checked', 'disabled', 'readonly', 'xmlns', 'style', 'src', 'alt', 'width', 'height', 'referrerPolicy', 'points', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'selected', 'value', 'name', 'colspan', 'rowspan', 'colSpan', 'rowSpan', 'placeholder', 'for', 'min', 'max', 'step', 'data-action', 'data-scorecard-id', 'data-table-name', 'data-scorecard-name', 'data-audit-count', 'data-new-status'],
        ALLOW_DATA_ATTR: true,
        ALLOW_ARIA_ATTR: true,
        KEEP_CONTENT: true
      });
      
      // Extract the tbody content (just the tr elements)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitized;
      const sanitizedTable = tempDiv.querySelector('table');
      const sanitizedTbody = sanitizedTable ? sanitizedTable.querySelector('tbody') : tempDiv.querySelector('tbody');
      
      if (sanitizedTbody) {
        // Clear existing content
        tbody.innerHTML = '';
        // Move all tr elements from sanitized tbody to actual tbody
        // Use a document fragment to batch the moves
        const fragment = document.createDocumentFragment();
        while (sanitizedTbody.firstChild) {
          fragment.appendChild(sanitizedTbody.firstChild);
        }
        tbody.appendChild(fragment);
      } else {
        // Fallback: try to extract tr elements directly from tempDiv
        const trElements = tempDiv.querySelectorAll('tr');
        tbody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        trElements.forEach(tr => fragment.appendChild(tr.cloneNode(true)));
        tbody.appendChild(fragment);
      }
    } catch (error) {
      // If sanitization fails, fall back to escaping
      console.error('[HTML Sanitizer] DOMPurify sanitization failed for table body:', error);
      tbody.innerHTML = escapeHtml(html);
    }
  } else {
    // Fallback: if DOMPurify isn't loaded, escape the HTML
    console.warn('[HTML Sanitizer] DOMPurify not available, using escapeHtml fallback');
    tbody.innerHTML = escapeHtml(html);
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
      const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span', 'div', 'ul', 'ol', 'li', 'nav', 'button', 'svg', 'path', 'polyline', 'polygon', 'circle', 'rect', 'g', 'line', 'input', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'style', 'img', 'select', 'option', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'main', 'section', 'article', 'header', 'footer', 'aside', 'form', 'textarea', 'small'];
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: ['href', 'class', 'id', 'title', 'target', 'role', 'aria-label', 'aria-hidden', 'aria-expanded', 'aria-current', 'aria-describedby', 'aria-live', 'tabindex', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'd', 'type', 'checked', 'disabled', 'readonly', 'xmlns', 'style', 'src', 'alt', 'width', 'height', 'referrerPolicy', 'points', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'selected', 'value', 'name', 'colspan', 'rowspan', 'colSpan', 'rowSpan', 'placeholder', 'for', 'min', 'max', 'step', 'required', 'pattern', 'rows', 'cols'],
        ALLOW_DATA_ATTR: true, // Allow data-* attributes for employee selection, event tracking, etc.
        ALLOW_ARIA_ATTR: true, // Allow all ARIA attributes
        KEEP_CONTENT: true // Keep text content even if tags are removed
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
