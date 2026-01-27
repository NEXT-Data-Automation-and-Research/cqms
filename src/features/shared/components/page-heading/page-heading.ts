/**
 * Global Page Heading Component
 * Creates a consistent page heading across all pages
 */

export interface PageHeadingOptions {
  /** The text content of the heading */
  text: string;
  /** Whether the page has a dark background (uses white text) */
  darkBackground?: boolean;
  /** Optional custom class names */
  className?: string;
  /** Optional container element to append to */
  container?: HTMLElement;
}

/**
 * Creates a standardized page heading element
 * @param options - Configuration options for the heading
 * @returns The created heading element
 */
export function createPageHeading(options: PageHeadingOptions): HTMLElement {
  const { text, darkBackground = false, className = '' } = options;
  
  const heading = document.createElement('h1');
  heading.className = `page-heading-global ${darkBackground ? 'dark-bg' : ''} ${className}`.trim();
  heading.textContent = text;
  
  return heading;
}

/**
 * Renders a page heading into a container
 * @param container - The container element to render into
 * @param text - The heading text
 * @param options - Optional configuration
 */
export function renderPageHeading(
  container: HTMLElement | string,
  text: string,
  options?: Omit<PageHeadingOptions, 'text' | 'container'>
): HTMLElement {
  const containerElement = typeof container === 'string' 
    ? document.querySelector(container) as HTMLElement
    : container;
  
  if (!containerElement) {
    throw new Error(`Container element not found: ${container}`);
  }
  
  const heading = createPageHeading({ text, ...options });
  containerElement.appendChild(heading);
  
  return heading;
}

/**
 * Replaces an existing heading with the standardized one
 * @param selector - Selector for the existing heading element
 * @param text - The new heading text
 * @param options - Optional configuration
 */
export function replacePageHeading(
  selector: string,
  text: string,
  options?: Omit<PageHeadingOptions, 'text'>
): HTMLElement | null {
  const existingHeading = document.querySelector(selector);
  if (!existingHeading) {
    return null;
  }
  
  const heading = createPageHeading({ text, ...options });
  existingHeading.replaceWith(heading);
  
  return heading;
}
