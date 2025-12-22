/**
 * Panel Manager
 * Manages auditor panel visibility and animations
 */

export interface PanelManagerConfig {
  onPanelToggle?: (isVisible: boolean) => void;
}

export class PanelManager {
  private isVisible: boolean = false;
  private config: PanelManagerConfig;
  private panelWidth: number = 400;

  constructor(config: PanelManagerConfig = {}) {
    this.config = config;
  }

  show(): void {
    const container = document.getElementById('auditorPanelContainer');
    const toggleButton = document.getElementById('auditorPanelToggle');
    
    if (!container) return;

    this.isVisible = true;
    container.style.width = `${this.panelWidth}px`;
    container.style.opacity = '1';
    
    if (toggleButton) {
      const chevron = toggleButton.querySelector('#toggleChevron') as HTMLElement;
      if (chevron) {
        chevron.style.transform = 'rotate(180deg)';
      }
      toggleButton.title = 'Hide Panel';
    }

    if (this.config.onPanelToggle) {
      this.config.onPanelToggle(true);
    }
  }

  hide(): void {
    const container = document.getElementById('auditorPanelContainer');
    const toggleButton = document.getElementById('auditorPanelToggle');
    
    if (!container) return;

    this.isVisible = false;
    container.style.width = '0px';
    container.style.opacity = '0';
    
    if (toggleButton) {
      const chevron = toggleButton.querySelector('#toggleChevron') as HTMLElement;
      if (chevron) {
        chevron.style.transform = 'rotate(0deg)';
      }
      toggleButton.title = 'Select Auditors';
    }

    if (this.config.onPanelToggle) {
      this.config.onPanelToggle(false);
    }
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isPanelVisible(): boolean {
    return this.isVisible;
  }

  setWidth(width: number): void {
    this.panelWidth = width;
    if (this.isVisible) {
      const container = document.getElementById('auditorPanelContainer');
      if (container) {
        container.style.width = `${width}px`;
      }
    }
  }
}

