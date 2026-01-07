/**
 * Audit Distribution Sidebar Component
 * Left sidebar navigation for audit distribution feature
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export type AuditDistributionView = 'manual' | 'schedule' | 'ai';

export interface AuditDistributionSidebarConfig {
  currentView: AuditDistributionView;
  onViewChange: (view: AuditDistributionView) => void;
}

export class AuditDistributionSidebar {
  private container: HTMLElement;
  private config: AuditDistributionSidebarConfig;

  constructor(container: HTMLElement, config: AuditDistributionSidebarConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    const { currentView } = this.config;

    const menuItems = [
      {
        id: 'manual' as AuditDistributionView,
        label: 'Manual Audit',
        icon: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <polyline points="17 11 19 13 23 9"/>
          </svg>
        `
      },
      {
        id: 'schedule' as AuditDistributionView,
        label: 'Schedule Audit',
        icon: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        `
      },
      {
        id: 'ai' as AuditDistributionView,
        label: 'AI-Audit',
        icon: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        `
      }
    ];

    const menuItemsHtml = menuItems.map(item => {
      const isActive = currentView === item.id;
      return `
        <button
          class="sidebar-menu-item w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
            isActive
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-300 hover:bg-white/10 hover:text-white'
          }"
          data-view="${item.id}"
        >
          <div class="flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}">
            ${item.icon}
          </div>
          <span class="text-sm font-medium">${item.label}</span>
        </button>
      `;
    }).join('');

    safeSetHTML(this.container, `
      <div class="audit-distribution-sidebar bg-dark-forest border-r border-white/10 w-64 flex flex-col h-full">
        <div class="p-4 border-b border-white/10 flex-shrink-0">
          <h2 class="text-lg font-bold text-white">Audit Distribution</h2>
          <p class="text-xs text-gray-400 mt-1">Manage audit assignments</p>
        </div>
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
          ${menuItemsHtml}
        </nav>
      </div>
    `);

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const menuItems = this.container.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = (item as HTMLElement).dataset.view as AuditDistributionView;
        if (view && view !== this.config.currentView) {
          this.config.onViewChange(view);
        }
      });
    });
  }

  update(config: Partial<AuditDistributionSidebarConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }
}

