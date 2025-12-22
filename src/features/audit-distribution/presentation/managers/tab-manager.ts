/**
 * Tab Manager
 * Manages tab navigation for manual audit view
 */

export type TabType = 'assignment' | 'statistics';

export interface TabManagerConfig {
  onTabChange?: (tab: TabType) => void;
}

export class TabManager {
  private currentTab: TabType = 'assignment';
  private config: TabManagerConfig;

  constructor(config: TabManagerConfig = {}) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    const assignmentTab = document.getElementById('assignmentTab');
    const statisticsTab = document.getElementById('statisticsTab');
    const tabSlider = document.getElementById('tabSlider');
    const assignmentContent = document.getElementById('assignmentContent');
    const statisticsContent = document.getElementById('statisticsContent');

    const switchTab = (tab: TabType) => {
      this.currentTab = tab;
      
      // Update tab buttons
      assignmentTab?.classList.toggle('active', tab === 'assignment');
      statisticsTab?.classList.toggle('active', tab === 'statistics');
      
      // Update tab slider position
      if (tabSlider) {
        tabSlider.style.left = tab === 'assignment' ? '0.2344rem' : 'calc(50% + 0.1172rem)';
      }
      
      // Show/hide content
      assignmentContent?.classList.toggle('hidden', tab !== 'assignment');
      statisticsContent?.classList.toggle('hidden', tab !== 'statistics');

      // Notify listener
      if (this.config.onTabChange) {
        this.config.onTabChange(tab);
      }
    };

    assignmentTab?.addEventListener('click', () => switchTab('assignment'));
    statisticsTab?.addEventListener('click', () => switchTab('statistics'));
  }

  getCurrentTab(): TabType {
    return this.currentTab;
  }

  switchToTab(tab: TabType): void {
    const assignmentTab = document.getElementById('assignmentTab');
    const statisticsTab = document.getElementById('statisticsTab');
    const tabSlider = document.getElementById('tabSlider');
    const assignmentContent = document.getElementById('assignmentContent');
    const statisticsContent = document.getElementById('statisticsContent');

    this.currentTab = tab;
    
    assignmentTab?.classList.toggle('active', tab === 'assignment');
    statisticsTab?.classList.toggle('active', tab === 'statistics');
    
    if (tabSlider) {
      tabSlider.style.left = tab === 'assignment' ? '0.2344rem' : 'calc(50% + 0.1172rem)';
    }
    
    assignmentContent?.classList.toggle('hidden', tab !== 'assignment');
    statisticsContent?.classList.toggle('hidden', tab !== 'statistics');

    if (this.config.onTabChange) {
      this.config.onTabChange(tab);
    }
  }
}

