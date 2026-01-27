/**
 * Tab Manager
 * Manages tab navigation for audit distribution views
 */

export type TabType = 'manual' | 'schedule' | 'ai' | 'statistics';

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
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const manualTab = document.getElementById('manualTab');
      const scheduleTab = document.getElementById('scheduleTab');
      const aiTab = document.getElementById('aiTab');
      const statisticsTab = document.getElementById('statisticsTab');
      const tabSlider = document.getElementById('tabSlider');

      // Set initial slider position
      if (tabSlider) {
        const tabIndex = this.currentTab === 'manual' ? 0 : this.currentTab === 'schedule' ? 1 : this.currentTab === 'ai' ? 2 : 3;
        const leftOffset = `calc(${tabIndex * 25}% + 0.2344rem)`;
        tabSlider.style.left = leftOffset;
        tabSlider.style.width = 'calc(25% - 0.2344rem)';
      }

      const switchTab = (tab: TabType) => {
        this.currentTab = tab;
        
        // Update tab buttons
        manualTab?.classList.toggle('active', tab === 'manual');
        scheduleTab?.classList.toggle('active', tab === 'schedule');
        aiTab?.classList.toggle('active', tab === 'ai');
        statisticsTab?.classList.toggle('active', tab === 'statistics');
        
        // Update tab slider position (4 tabs, so each is 25%)
        if (tabSlider) {
          const tabIndex = tab === 'manual' ? 0 : tab === 'schedule' ? 1 : tab === 'ai' ? 2 : 3;
          const leftOffset = `calc(${tabIndex * 25}% + 0.2344rem)`;
          tabSlider.style.left = leftOffset;
          tabSlider.style.width = 'calc(25% - 0.2344rem)';
        }

        // Notify listener
        if (this.config.onTabChange) {
          this.config.onTabChange(tab);
        }
      };

      manualTab?.addEventListener('click', () => switchTab('manual'));
      scheduleTab?.addEventListener('click', () => switchTab('schedule'));
      aiTab?.addEventListener('click', () => switchTab('ai'));
      statisticsTab?.addEventListener('click', () => switchTab('statistics'));
    }, 0);
  }

  getCurrentTab(): TabType {
    return this.currentTab;
  }

  switchToTab(tab: TabType): void {
    this.currentTab = tab;
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const manualTab = document.getElementById('manualTab');
      const scheduleTab = document.getElementById('scheduleTab');
      const aiTab = document.getElementById('aiTab');
      const statisticsTab = document.getElementById('statisticsTab');
      const tabSlider = document.getElementById('tabSlider');

      manualTab?.classList.toggle('active', tab === 'manual');
      scheduleTab?.classList.toggle('active', tab === 'schedule');
      aiTab?.classList.toggle('active', tab === 'ai');
      statisticsTab?.classList.toggle('active', tab === 'statistics');
      
      if (tabSlider) {
        const tabIndex = tab === 'manual' ? 0 : tab === 'schedule' ? 1 : tab === 'ai' ? 2 : 3;
        const leftOffset = `calc(${tabIndex * 25}% + 0.2344rem)`;
        tabSlider.style.left = leftOffset;
        tabSlider.style.width = 'calc(25% - 0.2344rem)';
      }

      if (this.config.onTabChange) {
        this.config.onTabChange(tab);
      }
    }, 0);
  }
}

