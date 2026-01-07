/**
 * Notification Consent Modal Component
 * Handles UI interactions for the notification consent modal
 */

export class NotificationConsentModal {
  private modal: HTMLElement | null = null;
  private webCheckbox: HTMLInputElement | null = null;
  private emailCheckbox: HTMLInputElement | null = null;
  private allowBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;

  private onAllow: (() => Promise<void>) | null = null;
  private onSave: ((channels: { web: boolean; email: boolean }) => Promise<void>) | null = null;
  private onSkip: (() => void) | null = null;

  constructor() {
    this.initializeElements();
    this.attachEventListeners();
  }

  /**
   * Initialize DOM elements
   */
  private initializeElements(): void {
    this.modal = document.getElementById('notificationConsentModal');
    this.webCheckbox = document.getElementById('channelWeb') as HTMLInputElement;
    this.emailCheckbox = document.getElementById('channelEmail') as HTMLInputElement;
    this.allowBtn = document.getElementById('allowNotificationsBtn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('savePreferencesBtn') as HTMLButtonElement;
    this.skipBtn = document.getElementById('skipConsentBtn') as HTMLButtonElement;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (this.allowBtn) {
      this.allowBtn.addEventListener('click', async () => {
        if (this.onAllow) {
          await this.onAllow();
        }
      });
    }

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', async () => {
        if (this.onSave) {
          const channels = {
            web: this.webCheckbox?.checked || false,
            email: this.emailCheckbox?.checked || false,
          };
          await this.onSave(channels);
        }
      });
    }

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => {
        if (this.onSkip) {
          this.onSkip();
        }
      });
    }
  }

  /**
   * Set callback for "Allow Notifications" button
   */
  setOnAllow(callback: () => Promise<void>): void {
    this.onAllow = callback;
  }

  /**
   * Set callback for "Save Preferences" button
   */
  setOnSave(callback: (channels: { web: boolean; email: boolean }) => Promise<void>): void {
    this.onSave = callback;
  }

  /**
   * Set callback for "Skip" button
   */
  setOnSkip(callback: () => void): void {
    this.onSkip = callback;
  }

  /**
   * Show the modal
   */
  show(): void {
    if (this.modal) {
      this.modal.classList.add('show');
    }
  }

  /**
   * Hide the modal
   */
  hide(): void {
    if (this.modal) {
      this.modal.classList.remove('show');
    }
  }

  /**
   * Get selected channels
   */
  getSelectedChannels(): { web: boolean; email: boolean } {
    return {
      web: this.webCheckbox?.checked || false,
      email: this.emailCheckbox?.checked || false,
    };
  }

  /**
   * Update button states based on browser permission
   */
  updateBrowserPermissionStatus(permission: NotificationPermission | 'unsupported'): void {
    if (this.allowBtn) {
      if (permission === 'granted') {
        this.allowBtn.textContent = 'Notifications Enabled';
        this.allowBtn.disabled = true;
      } else if (permission === 'denied') {
        this.allowBtn.textContent = 'Permission Denied';
        this.allowBtn.disabled = true;
      } else {
        this.allowBtn.textContent = 'Allow Notifications';
        this.allowBtn.disabled = false;
      }
    }
  }
}

