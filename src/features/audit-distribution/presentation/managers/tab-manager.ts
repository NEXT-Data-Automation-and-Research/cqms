/**
 * Tab Manager
 * Manages tab navigation for audit distribution views
 */

export type TabType = 'manual' | 'assigned' | 'ai' | 'statistics';

const TAB_COUNT = 4;
const TAB_PERCENT = 100 / TAB_COUNT;

function getTabIndex(tab: TabType): number {
  switch (tab) {
    case 'manual': return 0;
    case 'assigned': return 1;
    case 'ai': return 2;
    case 'statistics': return 3;
    default: return 0;
  }
}

export interface TabManagerConfig {
  onTabChange?: (tab: TabType) => void;
}

export class TabManager {
  private currentTab: TabType = 'manual';
  private config: TabManagerConfig;

  constructor(config: TabManagerConfig = {}) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    setTimeout(() => {
      const manualTab = document.getElementById('manualTab');
      const assignedTab = document.getElementById('assignedTab');
      const aiTab = document.getElementById('aiTab');
      const statisticsTab = document.getElementById('statisticsTab');
      const tabSlider = document.getElementById('tabSlider');

      if (tabSlider) {
        const tabIndex = getTabIndex(this.currentTab);
        const leftOffset = `calc(${tabIndex * TAB_PERCENT}% + 0.2344rem)`;
        tabSlider.style.left = leftOffset;
        tabSlider.style.width = `calc(${TAB_PERCENT}% - 0.2344rem)`;
      }

      const switchTab = (tab: TabType) => {
        this.currentTab = tab;
        manualTab?.classList.toggle('active', tab === 'manual');
        assignedTab?.classList.toggle('active', tab === 'assigned');
        aiTab?.classList.toggle('active', tab === 'ai');
        statisticsTab?.classList.toggle('active', tab === 'statistics');

        if (tabSlider) {
          const tabIndex = getTabIndex(tab);
          const leftOffset = `calc(${tabIndex * TAB_PERCENT}% + 0.2344rem)`;
          tabSlider.style.left = leftOffset;
          tabSlider.style.width = `calc(${TAB_PERCENT}% - 0.2344rem)`;
        }
        if (this.config.onTabChange) this.config.onTabChange(tab);
      };

      manualTab?.addEventListener('click', () => switchTab('manual'));
      assignedTab?.addEventListener('click', () => switchTab('assigned'));
      aiTab?.addEventListener('click', () => switchTab('ai'));
      statisticsTab?.addEventListener('click', () => switchTab('statistics'));
    }, 0);
  }

  getCurrentTab(): TabType {
    return this.currentTab;
  }

  switchToTab(tab: TabType): void {
    this.currentTab = tab;
    setTimeout(() => {
      const manualTab = document.getElementById('manualTab');
      const assignedTab = document.getElementById('assignedTab');
      const aiTab = document.getElementById('aiTab');
      const statisticsTab = document.getElementById('statisticsTab');
      const tabSlider = document.getElementById('tabSlider');

      manualTab?.classList.toggle('active', tab === 'manual');
      assignedTab?.classList.toggle('active', tab === 'assigned');
      aiTab?.classList.toggle('active', tab === 'ai');
      statisticsTab?.classList.toggle('active', tab === 'statistics');

      if (tabSlider) {
        const tabIndex = getTabIndex(tab);
        const leftOffset = `calc(${tabIndex * TAB_PERCENT}% + 0.2344rem)`;
        tabSlider.style.left = leftOffset;
        tabSlider.style.width = `calc(${TAB_PERCENT}% - 0.2344rem)`;
      }
      if (this.config.onTabChange) this.config.onTabChange(tab);
    }, 0);
  }
}

