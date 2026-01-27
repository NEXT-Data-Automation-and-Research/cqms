/**
 * Route Mapper
 * Maps clean URLs (slugs) to actual file paths
 * Provides bidirectional mapping for navigation and routing
 */

import { routes } from './route-config.js'
import type { RouteConfig } from './route-types.js'

/**
 * Mapping from clean URL to actual file path
 */
export interface RouteMapping {
  /** Clean URL path (e.g., '/home', '/settings/scorecards') */
  cleanPath: string
  /** Actual file path (e.g., '/src/features/home/presentation/home-page.html') */
  filePath: string
}

/**
 * Generate route mappings from route config
 * Creates mappings for both main routes and submenu routes
 */
export function generateRouteMappings(): RouteMapping[] {
  const mappings: RouteMapping[] = []

  routes.forEach((route) => {
    // Add main route mapping if slug exists
    if (route.slug) {
      mappings.push({
        cleanPath: `/${route.slug}`,
        filePath: route.path
      })
    }

    // Add submenu route mappings if they exist
    if (route.submenu) {
      route.submenu.forEach((submenuItem) => {
        if (submenuItem.slug) {
          // For submenus, create nested paths like /settings/scorecards
          const parentSlug = route.slug || ''
          const cleanPath = parentSlug 
            ? `/${parentSlug}/${submenuItem.slug}`
            : `/${submenuItem.slug}`
          
          mappings.push({
            cleanPath,
            filePath: submenuItem.path
          })
        }
      })
    }
  })

  return mappings
}

/**
 * Get file path from clean URL
 * @param cleanPath - Clean URL path (e.g., '/home', '/settings/scorecards')
 * @returns Actual file path or undefined if not found
 */
export function getFilePathFromCleanPath(cleanPath: string): string | undefined {
  const mappings = generateRouteMappings()
  const mapping = mappings.find(m => m.cleanPath === cleanPath)
  return mapping?.filePath
}

/**
 * Get clean URL from file path
 * @param filePath - Actual file path (e.g., '/src/features/home/presentation/home-page.html')
 * @returns Clean URL path or undefined if not found
 */
export function getCleanPathFromFilePath(filePath: string): string | undefined {
  const mappings = generateRouteMappings()
  const mapping = mappings.find(m => m.filePath === filePath)
  return mapping?.cleanPath
}

/**
 * Check if a path is a clean URL (has a slug mapping)
 * @param path - URL path to check
 * @returns True if path has a clean URL mapping
 */
export function isCleanPath(path: string): boolean {
  const mappings = generateRouteMappings()
  return mappings.some(m => m.cleanPath === path)
}

/**
 * Get all route mappings (cached for performance)
 */
let cachedMappings: RouteMapping[] | null = null

export function getRouteMappings(): RouteMapping[] {
  if (!cachedMappings) {
    cachedMappings = generateRouteMappings()
  }
  return cachedMappings
}

/**
 * Clear cached mappings (useful for testing or hot reloading)
 */
export function clearRouteMappingsCache(): void {
  cachedMappings = null
}
