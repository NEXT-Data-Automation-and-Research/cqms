/**
 * Channel Checkboxes Component
 * Manages channel selection with Select All functionality
 */

import { safeSetHTML } from '../../../../../../utils/html-sanitizer.js';
import { escapeHtml } from '../../../../../../utils/html-sanitizer.js';
import type { Channel } from '../../../domain/entities.js';

export class ChannelCheckboxes {
  private container: HTMLElement | null;
  private channels: Channel[] = [];
  private selectedChannels: string[] = [];
  private defaultChannels: string[] = [];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
  }

  /**
   * Set available channels
   */
  setChannels(channels: Channel[]): void {
    this.channels = channels.filter(c => c.is_active);
    this.render();
  }

  /**
   * Set selected channels (for editing)
   */
  setSelectedChannels(channels: string[]): void {
    this.selectedChannels = channels;
    this.updateCheckboxes();
  }

  /**
   * Get selected channels
   */
  getSelectedChannels(): string[] {
    return this.selectedChannels;
  }

  /**
   * Set default channels
   */
  setDefaultChannels(channels: string[]): void {
    this.defaultChannels = channels;
    this.updateDefaultCheckboxes();
  }

  /**
   * Get default channels
   */
  getDefaultChannels(): string[] {
    return this.defaultChannels;
  }

  /**
   * Render channel checkboxes
   */
  render(): void {
    if (!this.container) return;

    if (this.channels.length === 0) {
      safeSetHTML(
        this.container,
        '<p style="font-size: 0.5625rem; color: #6b7280; padding: 0.375rem;">No active channels found. Please create channels first.</p>'
      );
      return;
    }

    const channelCheckboxes = this.channels
      .map(
        (channel) => `
      <label style="display: flex; align-items: center; gap: 0.2812rem; cursor: pointer; padding: 0.1875rem;">
        <input type="checkbox" 
               class="channel-checkbox" 
               value="${escapeHtml(channel.name)}" 
               ${this.selectedChannels.includes(channel.name) ? 'checked' : ''}
               style="width: 0.6562rem; height: 0.6562rem; cursor: pointer; accent-color: #1A733E;">
        <span style="font-size: 0.5156rem; color: #374151; user-select: none;">${escapeHtml(channel.name)}</span>
      </label>
    `
      )
      .join('');

    const html = `
      <label style="display: flex; align-items: center; gap: 0.2812rem; cursor: pointer; padding: 0.2812rem; background: #f0fdf4; border: 0.0469rem solid #86efac; border-radius: 0.1875rem; margin-bottom: 0.1875rem; grid-column: 1 / -1; font-weight: 500;">
        <input type="checkbox" 
               id="selectAllChannels" 
               class="select-all-checkbox"
               style="width: 0.6562rem; height: 0.6562rem; cursor: pointer; accent-color: #1A733E;">
        <span style="font-size: 0.5625rem; color: #166534; user-select: none; font-weight: 600;">Select All</span>
      </label>
      ${channelCheckboxes}
    `;

    safeSetHTML(this.container, html);
    this.attachEventListeners();
    this.updateSelectAllState();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Select All checkbox
    const selectAllCheckbox = this.container.querySelector('#selectAllChannels') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = this.container!.querySelectorAll('.channel-checkbox') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach((cb) => {
          cb.checked = selectAllCheckbox.checked;
        });
        this.updateSelectedChannels();
        this.updateSelectAllState();
        this.updateDefaultChannelsUI();
      });
    }

    // Individual channel checkboxes
    this.container.querySelectorAll('.channel-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this.updateSelectedChannels();
        this.updateSelectAllState();
        this.updateDefaultChannelsUI();
      });
    });
  }

  /**
   * Update selected channels from checkboxes
   */
  private updateSelectedChannels(): void {
    if (!this.container) return;
    const checkboxes = this.container.querySelectorAll('.channel-checkbox:checked') as NodeListOf<HTMLInputElement>;
    this.selectedChannels = Array.from(checkboxes).map((cb) => cb.value);
  }

  /**
   * Update checkboxes from selected channels
   */
  private updateCheckboxes(): void {
    if (!this.container) return;
    const checkboxes = this.container.querySelectorAll('.channel-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((cb) => {
      cb.checked = this.selectedChannels.includes(cb.value);
    });
    this.updateSelectAllState();
  }

  /**
   * Update select all checkbox state
   */
  private updateSelectAllState(): void {
    if (!this.container) return;
    const selectAllCheckbox = this.container.querySelector('#selectAllChannels') as HTMLInputElement;
    if (!selectAllCheckbox) return;

    const checkboxes = this.container.querySelectorAll('.channel-checkbox') as NodeListOf<HTMLInputElement>;
    const checkedCount = this.container.querySelectorAll('.channel-checkbox:checked').length;

    if (checkboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  /**
   * Update default channels UI (shows when channels are selected)
   */
  private updateDefaultChannelsUI(): void {
    // This will be handled by the modal that contains this component
    // Emit event for parent to handle
    if (this.container) {
      this.container.dispatchEvent(
        new CustomEvent('channelsChanged', {
          detail: { selectedChannels: this.selectedChannels }
        })
      );
    }
  }

  /**
   * Update default checkboxes
   */
  private updateDefaultCheckboxes(): void {
    // This will be handled by the modal
  }

  /**
   * Validate at least one channel is selected
   */
  validate(): boolean {
    return this.selectedChannels.length > 0;
  }
}

