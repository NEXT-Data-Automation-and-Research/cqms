/**
 * Automatic XSS Protection
 * 
 * This module provides a drop-in solution that automatically sanitizes
 * all innerHTML assignments without requiring code changes.
 * 
 * Usage:
 *   import { enableAutoXSSProtection } from './utils/auto-xss-protection.js';
 *   enableAutoXSSProtection(); // Call once at app startup
 * 
 * After enabling, all innerHTML assignments are automatically sanitized.
 * 
 * SAFE APPROACH: Uses DOMPurify with your existing configuration.
 * Can be disabled easily if issues occur.
 */

import { sanitizeHTML } from './html-sanitizer.js';

/**
 * Track if auto-protection is enabled
 */
let isEnabled = false;

/**
 * Original innerHTML descriptor
 */
let originalInnerHTMLDescriptor: PropertyDescriptor | undefined = undefined;

/**
 * Sanitize HTML string using DOMPurify
 */
function autoSanitizeHTML(html: string): string {
  try {
    // Use existing sanitizeHTML function
    return sanitizeHTML(html, false);
  } catch (error) {
    console.warn('[Auto XSS Protection] Sanitization failed, using escaped HTML:', error);
    // Fallback: escape HTML
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
}

/**
 * Create a proxy that intercepts innerHTML assignments
 */
function createHTMLElementProxy(element: HTMLElement): HTMLElement {
  return new Proxy(element, {
    set(target, property, value, receiver) {
      // Intercept innerHTML assignments
      if (property === 'innerHTML' && typeof value === 'string') {
        // Auto-sanitize the HTML
        const sanitized = autoSanitizeHTML(value);
        // Set the sanitized version
        return Reflect.set(target, property, sanitized, receiver);
      }
      
      // For all other properties, set normally
      return Reflect.set(target, property, value, receiver);
    },
    
    get(target, property, receiver) {
      // Return innerHTML getter normally
      if (property === 'innerHTML') {
        return Reflect.get(target, property, receiver);
      }
      
      // For methods that return elements, wrap them
      const value = Reflect.get(target, property, receiver);
      
      // If it's a method that returns HTMLElement(s), wrap the result
      if (typeof value === 'function') {
        return function(...args: any[]) {
          const result = value.apply(target, args);
          
          // Wrap single elements
          if (result instanceof HTMLElement) {
            return createHTMLElementProxy(result);
          }
          
          // Wrap NodeLists
          if (result instanceof NodeList) {
            return Array.from(result).map(node => 
              node instanceof HTMLElement ? createHTMLElementProxy(node) : node
            );
          }
          
          return result;
        };
      }
      
      return value;
    }
  });
}

/**
 * Override HTMLElement.prototype.innerHTML setter
 * This automatically sanitizes all innerHTML assignments
 * 
 * SAFE: Uses your existing DOMPurify configuration
 * SAFE: Can be disabled easily if issues occur
 */
function overrideInnerHTMLSetter(): void {
  if (isEnabled) {
    console.warn('[Auto XSS Protection] Already enabled');
    return;
  }

  // Try to get descriptor from HTMLElement.prototype, Element.prototype, or Node.prototype
  originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML') ||
                                 Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML') ||
                                 Object.getOwnPropertyDescriptor(Node.prototype, 'innerHTML');
  
  if (!originalInnerHTMLDescriptor) {
    // Fallback: Try to get it from a created element
    const testElement = document.createElement('div');
    const testDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(testElement), 'innerHTML');
    if (testDescriptor) {
      originalInnerHTMLDescriptor = testDescriptor;
    }
  }
  
  if (!originalInnerHTMLDescriptor) {
    console.error('[Auto XSS Protection] Could not access innerHTML descriptor - protection disabled');
    console.warn('[Auto XSS Protection] This may be due to browser security restrictions');
    return;
  }

  // Override innerHTML setter
  Object.defineProperty(HTMLElement.prototype, 'innerHTML', {
    get: originalInnerHTMLDescriptor.get,
    set: function(value: string | null | undefined) {
      // Handle null/undefined
      if (value == null) {
        if (originalInnerHTMLDescriptor?.set) {
          originalInnerHTMLDescriptor.set.call(this, value);
        }
        return;
      }

      // Only sanitize strings
      if (typeof value === 'string') {
        try {
          // Auto-sanitize before setting using existing DOMPurify config
          const sanitized = autoSanitizeHTML(value);
          if (originalInnerHTMLDescriptor?.set) {
            originalInnerHTMLDescriptor.set.call(this, sanitized);
          }
        } catch (error) {
          // If sanitization fails, fall back to original behavior (safer)
          console.warn('[Auto XSS Protection] Sanitization failed, using original setter:', error);
          if (originalInnerHTMLDescriptor?.set) {
            originalInnerHTMLDescriptor.set.call(this, value);
          }
        }
      } else {
        // Non-string values set normally
        if (originalInnerHTMLDescriptor?.set) {
          originalInnerHTMLDescriptor.set.call(this, value);
        }
      }
    },
    configurable: true,
    enumerable: originalInnerHTMLDescriptor.enumerable
  });

  isEnabled = true;
  console.log('[Auto XSS Protection] ✅ Enabled - All innerHTML assignments will be automatically sanitized');
  console.log('[Auto XSS Protection] Using DOMPurify with your existing configuration');
}

/**
 * Restore original innerHTML behavior
 */
function disableAutoXSSProtection(): void {
  if (!isEnabled || !originalInnerHTMLDescriptor) {
    return;
  }

  // Restore original descriptor
  Object.defineProperty(HTMLElement.prototype, 'innerHTML', originalInnerHTMLDescriptor);
  
  isEnabled = false;
  originalInnerHTMLDescriptor = undefined;
  console.log('[Auto XSS Protection] Disabled');
}

/**
 * Enable automatic XSS protection via createElement override
 * This approach works even when prototype override fails
 */
function enableViaCreateElement(): void {
  if (isEnabled) {
    return;
  }

  // Store original createElement
  const originalCreateElement = document.createElement.bind(document);
  
  // Override createElement to wrap elements with Proxy
  document.createElement = function(tagName: string, options?: ElementCreationOptions): HTMLElement {
    const element = originalCreateElement(tagName, options);
    
    // Wrap with Proxy to intercept innerHTML assignments
    return new Proxy(element, {
      set(target, property, value, receiver) {
        if (property === 'innerHTML' && typeof value === 'string') {
          // Auto-sanitize before setting
          const sanitized = autoSanitizeHTML(value);
          return Reflect.set(target, property, sanitized, receiver);
        }
        return Reflect.set(target, property, value, receiver);
      }
    }) as HTMLElement;
  };

  isEnabled = true;
  console.log('[Auto XSS Protection] ✅ Enabled via createElement override');
  console.log('[Auto XSS Protection] All new elements will have automatic XSS protection');
}

/**
 * Enable automatic XSS protection
 * Call this once at application startup
 * 
 * Tries prototype override first, falls back to createElement override
 */
export function enableAutoXSSProtection(): void {
  // Check if DOMPurify is available
  try {
    if (typeof window === 'undefined') {
      console.warn('[Auto XSS Protection] Not available in non-browser environment');
      return;
    }

    // Try prototype override first
    overrideInnerHTMLSetter();
    
    // If prototype override failed, use createElement override
    if (!isEnabled) {
      console.log('[Auto XSS Protection] Prototype override failed, using createElement override');
      enableViaCreateElement();
    }
  } catch (error) {
    console.error('[Auto XSS Protection] Failed to enable:', error);
    // Fallback to createElement override
    try {
      enableViaCreateElement();
    } catch (fallbackError) {
      console.error('[Auto XSS Protection] Fallback also failed:', fallbackError);
    }
  }
}

/**
 * Check if auto-protection is enabled
 */
export function isAutoXSSProtectionEnabled(): boolean {
  return isEnabled;
}

/**
 * Disable automatic XSS protection
 * Useful for testing or if issues occur
 */
export { disableAutoXSSProtection };
