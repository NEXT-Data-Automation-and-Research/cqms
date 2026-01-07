/**
 * Component Loader
 * This file loads HTML components into the page
 */

import { safeSetHTML, sanitizeHTML, escapeHtml } from '../../../utils/html-sanitizer.js'
import { logInfo, logError } from '../../../utils/logging-helper.js'

/**
 * Information about a component to load
 */
export interface ComponentConfig {
  path: string
  target: string
}

/**
 * This class loads HTML components dynamically
 */
export class ComponentLoader {
  /**
   * Load a single component
   */
  async loadComponent(componentPath: string, targetSelector: string): Promise<void> {
    try {
      logInfo(`Loading component: ${componentPath} into ${targetSelector}`)
      const response = await fetch(componentPath)
      
      if (!response.ok) {
        throw new Error(`Failed to load component: ${response.status} ${response.statusText} - ${componentPath}`)
      }
      
      const html = await response.text()
      
      if (!html || html.trim() === '') {
        throw new Error(`Component ${componentPath} returned empty content`)
      }
      
      const targetElement = document.querySelector(targetSelector)
      
      if (!targetElement) {
        throw new Error(`Target element not found: ${targetSelector}`)
      }
      
      safeSetHTML(targetElement as HTMLElement, sanitizeHTML(html))
      logInfo(`✓ Component loaded: ${componentPath}`)
    } catch (error: any) {
      logError(`✗ Error loading component ${componentPath}:`, error)
      // Don't throw - allow other components to load
      const targetElement = document.querySelector(targetSelector)
      if (targetElement) {
        const errorMessage = escapeHtml(error.message)
        safeSetHTML(targetElement as HTMLElement, `<div class="p-2 text-red-500 text-xs">Failed to load component: ${errorMessage}</div>`)
      }
    }
  }

  /**
   * Load multiple components in parallel
   */
  async loadComponents(components: ComponentConfig[]): Promise<void> {
    const loadPromises = components.map(component => 
      this.loadComponent(component.path, component.target)
    )
    
    await Promise.all(loadPromises)
    
    // Dispatch event when all components are loaded
    window.componentsLoaded = true
    document.dispatchEvent(new CustomEvent('componentsLoaded'))
    
    logInfo('All components loaded successfully')
  }
}

// Create a single instance to share
export const componentLoader = new ComponentLoader()

// Export convenience functions
export async function loadComponent(componentPath: string, targetSelector: string): Promise<void> {
  return componentLoader.loadComponent(componentPath, targetSelector)
}

export async function loadComponents(components: ComponentConfig[]): Promise<void> {
  return componentLoader.loadComponents(components)
}
