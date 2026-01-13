/**
 * Profile Renderer
 * Handles HTML generation and rendering for profile page
 */

import { UserProfile } from '../domain/entities.js';
import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';
import { logWarn } from '../../../utils/logging-helper.js';

/**
 * Renderer for profile page UI
 */
export class ProfileRenderer {
  /**
   * Render the profile page
   */
  render(profile: UserProfile | null, isEditing: boolean): void {
    const container = document.getElementById('profile-container');
    if (!container) {
      logWarn('[ProfileRenderer] Profile container not found');
      return;
    }

    if (!profile) {
      safeSetHTML(container, '<p class="text-gray-600">Loading profile...</p>');
      return;
    }

    safeSetHTML(container, this.generateProfileHTML(profile, isEditing));
  }

  /**
   * Generate profile HTML
   */
  private generateProfileHTML(profile: UserProfile, isEditing: boolean): string {
    const initials = profile.full_name
      ? profile.full_name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
      : profile.email.charAt(0).toUpperCase();

    return `
      <div class="max-w-4xl mx-auto">
        <!-- Profile Header -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div class="flex items-center gap-6">
            <div class="relative">
              <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-semibold">
                ${profile.avatar_url 
                  ? `<img src="${escapeHtml(profile.avatar_url)}" alt="Profile" class="w-24 h-24 rounded-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark hidden items-center justify-center text-white text-2xl font-semibold">${escapeHtml(initials)}</div>`
                  : escapeHtml(initials)
                }
              </div>
            </div>
            <div class="flex-1">
              <h1 class="text-2xl font-bold text-gray-900 mb-1">
                ${escapeHtml(profile.full_name || 'No name set')}
              </h1>
              <p class="text-gray-600 mb-2">${escapeHtml(profile.email)}</p>
              ${profile.role ? `<p class="text-sm text-gray-500">${escapeHtml(profile.role)}${profile.department ? ` • ${escapeHtml(profile.department)}` : ''}</p>` : ''}
            </div>
            <button id="edit-profile-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              ${isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>

        <!-- Profile Form -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <form id="profile-form" class="space-y-6">
            ${this.generateFormFields(profile, isEditing)}
          </form>

          <!-- Success/Error Messages -->
          <div id="profile-message" class="mt-4 hidden"></div>
        </div>
      </div>
    `;
  }

  /**
   * Generate form fields HTML
   */
  private generateFormFields(profile: UserProfile, isEditing: boolean): string {
    return `
      <!-- Full Name -->
      <div>
        <label for="full_name" class="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          value="${escapeHtml(profile.full_name || '')}"
          ${!isEditing ? 'disabled' : ''}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter your full name"
          maxlength="100"
        />
      </div>

      <!-- Email (read-only) -->
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value="${escapeHtml(profile.email)}"
          disabled
          class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        />
        <p class="mt-1 text-sm text-gray-500">Email cannot be changed</p>
      </div>

      <!-- Avatar URL -->
      <div>
        <label for="avatar_url" class="block text-sm font-medium text-gray-700 mb-2">
          Profile Picture URL
        </label>
        <input
          type="url"
          id="avatar_url"
          name="avatar_url"
          value="${escapeHtml(profile.avatar_url || '')}"
          ${!isEditing ? 'disabled' : ''}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="https://example.com/avatar.jpg"
          maxlength="500"
        />
        <p class="mt-1 text-sm text-gray-500">Enter a URL to your profile picture</p>
      </div>

      <!-- Role and Department (read-only) -->
      ${this.generateRoleDepartmentFields(profile)}

      <!-- Submit Button (only shown when editing) -->
      ${isEditing ? this.generateActionButtons() : ''}
    `;
  }

  /**
   * Generate role and department fields
   */
  private generateRoleDepartmentFields(profile: UserProfile): string {
    if (!profile.role && !profile.department) {
      return '';
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${profile.role ? `
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <input
              type="text"
              value="${escapeHtml(profile.role)}"
              disabled
              class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
          </div>
        ` : ''}
        ${profile.department ? `
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <input
              type="text"
              value="${escapeHtml(profile.department)}"
              disabled
              class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate action buttons
   */
  private generateActionButtons(): string {
    return `
      <div class="flex gap-4 pt-4">
        <button
          type="submit"
          id="save-profile-btn"
          class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Changes
        </button>
        <button
          type="button"
          id="cancel-edit-btn"
          class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    `;
  }

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    const messageEl = document.getElementById('profile-message');
    if (messageEl) {
      safeSetHTML(messageEl, `
        <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          ${escapeHtml(message)}
        </div>
      `);
      messageEl.classList.remove('hidden');
      setTimeout(() => {
        messageEl.classList.add('hidden');
      }, 5000);
    }
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    const messageEl = document.getElementById('profile-message');
    if (messageEl) {
      safeSetHTML(messageEl, `
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          ${escapeHtml(message)}
        </div>
      `);
      messageEl.classList.remove('hidden');
    }
  }
}

