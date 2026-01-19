/**
 * Breadcrumb Component
 * L2 FIX: Navigation breadcrumbs for hierarchical pages
 */

import { escapeHtml } from '../utils/html-sanitizer.js';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  current?: boolean;
}

/**
 * Render breadcrumb navigation
 */
export function renderBreadcrumb(items: BreadcrumbItem[]): string {
  if (items.length === 0) return '';

  const itemsHTML = items.map((item, index) => {
    const isLast = index === items.length - 1;
    const isCurrent = item.current || isLast;

    if (isCurrent && !item.path) {
      // Current page, no link
      return `
        <li aria-current="page" style="display: flex; align-items: center; color: #6b7280;">
          <span>${escapeHtml(item.label)}</span>
        </li>
      `;
    }

    if (item.path) {
      // Link item
      return `
        <li style="display: flex; align-items: center;">
          <a href="${escapeHtml(item.path)}" 
             style="color: #1A733E; text-decoration: none; transition: color 0.2s;"
             onmouseover="this.style.color='#15582E'"
             onmouseout="this.style.color='#1A733E'">
            ${escapeHtml(item.label)}
          </a>
          ${!isLast ? '<span style="margin: 0 0.5rem; color: #9ca3af;">/</span>' : ''}
        </li>
      `;
    }

    // Plain text item
    return `
      <li style="display: flex; align-items: center; color: #6b7280;">
        <span>${escapeHtml(item.label)}</span>
        ${!isLast ? '<span style="margin: 0 0.5rem; color: #9ca3af;">/</span>' : ''}
      </li>
    `;
  }).join('');

  return `
    <nav aria-label="Breadcrumb" style="margin-bottom: 1.5rem;">
      <ol style="display: flex; align-items: center; list-style: none; padding: 0; margin: 0; flex-wrap: wrap; gap: 0.25rem;">
        ${itemsHTML}
      </ol>
    </nav>
  `;
}

/**
 * Get breadcrumb items for current page
 */
export function getBreadcrumbForPage(path: string): BreadcrumbItem[] {
  const pathMap: Record<string, BreadcrumbItem[]> = {
    '/src/features/home/presentation/home-page.html': [
      { label: 'Home', path: '/src/features/home/presentation/home-page.html', current: true }
    ],
    '/src/features/settings/user-management/presentation/user-management.html': [
      { label: 'Home', path: '/src/features/home/presentation/home-page.html' },
      { label: 'Settings', path: '#' },
      { label: 'User Management', current: true }
    ],
    '/src/features/settings/scorecards/presentation/scorecards.html': [
      { label: 'Home', path: '/src/features/home/presentation/home-page.html' },
      { label: 'Settings', path: '#' },
      { label: 'Scorecards', current: true }
    ],
    '/src/features/settings/access-control/presentation/access-control.html': [
      { label: 'Home', path: '/src/features/home/presentation/home-page.html' },
      { label: 'Settings', path: '#' },
      { label: 'Access Control', current: true }
    ],
    '/profile.html': [
      { label: 'Home', path: '/src/features/home/presentation/home-page.html' },
      { label: 'Settings', path: '#' },
      { label: 'Profile', current: true }
    ]
  };

  return pathMap[path] || [
    { label: 'Home', path: '/src/features/home/presentation/home-page.html' },
    { label: 'Page', current: true }
  ];
}
