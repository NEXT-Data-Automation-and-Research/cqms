/**
 * User Profile Renderer
 * Renders user profile information from people table
 */

import type { PeopleRepository } from '../../infrastructure/people-repository.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';
import { getProfileHTML, getNotFoundHTML, getErrorHTML, getDetailSectionHTML, type PersonData } from './user-profile-templates.js';
import { formatDate, escapeHtml, attachImageErrorHandlers } from './user-profile-utils.js';

export interface UserProfileRendererConfig {
  peopleRepository: PeopleRepository;
  email: string;
}

export class UserProfileRenderer {
  private config: UserProfileRendererConfig;

  constructor(config: UserProfileRendererConfig) {
    this.config = config;
  }

  async render(): Promise<void> {
    try {
      logInfo('[UserProfileRenderer] Loading profile for:', this.config.email);

      const person = await this.config.peopleRepository.findByEmail(this.config.email);

      if (!person) {
        this.renderNotFound();
        return;
      }

      this.renderProfile(person as PersonData);
      logInfo('[UserProfileRenderer] Profile rendered successfully');
    } catch (error) {
      logError('[UserProfileRenderer] Error rendering profile:', error);
      this.renderError('Failed to load profile');
    }
  }

  private renderProfile(person: PersonData): void {
    const container = document.getElementById('user-profile-container');
    if (!container) return;

    const renderDetailSection = (title: string, items: Array<{ label: string; value: string | null }>) => {
      return getDetailSectionHTML(title, items, escapeHtml);
    };

    const html = getProfileHTML(person, escapeHtml, formatDate, renderDetailSection);
    safeSetHTML(container, html);
    attachImageErrorHandlers(container);
    this.attachEventListeners(container);
  }

  private renderNotFound(): void {
    const container = document.getElementById('user-profile-container');
    if (!container) return;
    safeSetHTML(container, getNotFoundHTML());
    this.attachEventListeners(container);
  }

  private renderError(message: string): void {
    const container = document.getElementById('user-profile-container');
    if (!container) return;
    safeSetHTML(container, getErrorHTML(message, escapeHtml));
    this.attachEventListeners(container);
  }

  private attachEventListeners(container: HTMLElement): void {
    // Attach back button event listeners
    container.querySelectorAll('[data-action="go-back"]').forEach(button => {
      if (button.hasAttribute('data-listener-attached')) return;
      button.setAttribute('data-listener-attached', 'true');
      
      button.addEventListener('click', () => {
        window.history.back();
      });
    });
  }
}

