/**
 * Analytics allowlist: valid page_slug and page_path for strict server-side validation.
 * Built from route-config so only allowlisted values are accepted (no false data).
 */

import { routes } from '../routing/route-config.js';
import { getRouteMappings } from '../routing/route-mapper.js';

/** Set of allowed page slugs (from route-config + submenus) */
const ALLOWED_SLUGS = new Set<string>();

/** Map: path (clean or file path) -> slug for validation */
const PATH_TO_SLUG = new Map<string, string>();

function buildAllowlist(): void {
  if (ALLOWED_SLUGS.size > 0) return;

  for (const route of routes) {
    if (route.slug) {
      ALLOWED_SLUGS.add(route.slug);
      if (route.path) {
        PATH_TO_SLUG.set(route.path, route.slug);
        PATH_TO_SLUG.set(route.path.replace(/^\//, ''), route.slug);
      }
    }
    if (route.submenu) {
      for (const item of route.submenu) {
        if (item.slug) {
          ALLOWED_SLUGS.add(item.slug);
          if (item.path) {
            PATH_TO_SLUG.set(item.path, item.slug);
            PATH_TO_SLUG.set(item.path.replace(/^\//, ''), item.slug);
          }
        }
      }
    }
  }

  const mappings = getRouteMappings();
  for (const m of mappings) {
    let slug: string | undefined = PATH_TO_SLUG.get(m.filePath);
    if (!slug) {
      const main = routes.find(r => r.path === m.filePath);
      if (main?.slug) slug = main.slug;
      else {
        const sub = routes.flatMap(r => r.submenu ?? []).find(s => s.path === m.filePath);
        if (sub?.slug) slug = sub.slug;
      }
    }
    if (slug) {
      PATH_TO_SLUG.set(m.cleanPath, slug);
      PATH_TO_SLUG.set(m.cleanPath.replace(/^\//, ''), slug);
      ALLOWED_SLUGS.add(slug);
    }
  }
}

buildAllowlist();

/**
 * Check if a slug is allowed (for server validation).
 */
export function isAllowedSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return ALLOWED_SLUGS.has(slug.trim());
}

/**
 * Resolve path to slug. Returns undefined if path is not in allowlist.
 * Accepts clean path (e.g. /home) or file path (e.g. /src/features/home/...).
 */
export function pathToSlug(path: string): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  const normalized = path.trim();
  if (PATH_TO_SLUG.has(normalized)) return PATH_TO_SLUG.get(normalized);
  if (PATH_TO_SLUG.has(normalized.replace(/^\//, ''))) return PATH_TO_SLUG.get(normalized.replace(/^\//, ''));
  return undefined;
}

/**
 * Get allowed slug for a path; if path is not allowlisted, returns undefined.
 * Use this to validate client-sent page_slug + page_path (both must match).
 */
export function getAllowedSlugForPath(path: string): string | undefined {
  return pathToSlug(path);
}

/**
 * Max lengths for sanitization (proposal §4.5.2).
 */
export const ANALYTICS_LIMITS = {
  PAGE_PATH_MAX_LENGTH: 500,
  REFERRER_MAX_LENGTH: 2048,
  DEVICE_INFO_MAX_BYTES: 2048,
  MAX_EVENTS_PER_REQUEST: 5,
  TIME_ON_PAGE_MAX_SECONDS: 86400,
  TIMESTAMP_MAX_PAST_HOURS: 24,
  TIMESTAMP_MAX_FUTURE_SECONDS: 60,
} as const;
