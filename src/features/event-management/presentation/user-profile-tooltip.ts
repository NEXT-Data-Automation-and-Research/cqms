/**
 * User Profile Tooltip Component
 * Shows user profile information on hover over participant names
 */

import type { User } from '../domain/types.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';

export class UserProfileTooltip {
  private tooltip: HTMLDivElement | null = null;
  private hideTimeout: NodeJS.Timeout | null = null;

  /**
   * Show user profile tooltip
   */
  show(user: User, targetElement: HTMLElement): void {
    // Clear any existing hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Remove existing tooltip if any
    this.hide();

    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'user-profile-tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.style.cssText = `
      position: absolute;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      padding: 1rem;
      z-index: 10000;
      min-width: 280px;
      max-width: 320px;
      pointer-events: auto;
    `;

    // Get user initials
    const initials = this.getInitials(user.name || user.email);

    // Build tooltip HTML
    this.tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
        <div style="width: 3rem; height: 3rem; border-radius: 50%; background-color: #1a733e; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="color: white; font-weight: 600; font-size: 1rem;">${escapeHtml(initials)}</span>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 0.9375rem; color: #111827; margin-bottom: 0.25rem;">${escapeHtml(user.name || 'N/A')}</div>
          <div style="font-size: 0.8125rem; color: #6b7280;">${escapeHtml(user.email)}</div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${this.renderDetailRow('Role', user.role)}
        ${this.renderDetailRow('Department', user.department)}
        ${this.renderDetailRow('Team', user.team)}
        ${this.renderDetailRow('Channel', user.channel)}
        ${this.renderDetailRow('Country', user.country)}
      </div>
    `;

    // Append to body
    document.body.appendChild(this.tooltip);

    // Position tooltip
    this.positionTooltip(targetElement);

    // Add mouse leave handler to target
    const handleMouseLeave = () => {
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, 100);
    };

    const handleMouseEnter = () => {
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
    };

    targetElement.addEventListener('mouseleave', handleMouseLeave);
    this.tooltip.addEventListener('mouseenter', handleMouseEnter);
    this.tooltip.addEventListener('mouseleave', handleMouseLeave);
    
    // Store handlers for cleanup
    (targetElement as any)._tooltipMouseLeave = handleMouseLeave;
    (this.tooltip as any)._tooltipMouseEnter = handleMouseEnter;
    (this.tooltip as any)._tooltipMouseLeave = handleMouseLeave;
  }

  /**
   * Hide tooltip
   */
  hide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
      this.tooltip = null;
    }
  }

  /**
   * Get user initials from name
   */
  private getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Render a detail row
   */
  private renderDetailRow(label: string, value: string | undefined): string {
    if (!value) return '';
    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.8125rem; color: #6b7280; font-weight: 400;">${escapeHtml(label)}:</span>
        <span style="font-size: 0.8125rem; color: #111827; font-weight: 500; text-align: right;">${escapeHtml(value)}</span>
      </div>
    `;
  }

  /**
   * Position tooltip relative to target element
   */
  private positionTooltip(targetElement: HTMLElement): void {
    if (!this.tooltip) return;

    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default: position below and to the right
    let top = rect.bottom + 8;
    let left = rect.left;

    // Adjust if tooltip would go off screen
    if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }
    if (left < 10) {
      left = 10;
    }

    // If not enough space below, position above
    if (top + tooltipRect.height > viewportHeight - 10) {
      top = rect.top - tooltipRect.height - 8;
    }
    if (top < 10) {
      top = 10;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  }
}

// Create singleton instance
const userProfileTooltip = new UserProfileTooltip();

// Export for use
export default userProfileTooltip;
