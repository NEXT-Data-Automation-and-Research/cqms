/**
 * Profile Fields Renderer
 * Helper functions for rendering additional profile fields from people table
 */

import { UserProfile } from '../domain/entities.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';

/**
 * Generate employee information fields
 */
export function generateEmployeeInfoFields(profile: UserProfile): string {
  const hasEmployeeInfo = profile.employee_id || profile.designation || profile.country;
  if (!hasEmployeeInfo) {
    return '';
  }

  return `
    <div class="mt-6 pt-6 border-t border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Employee Information</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
          <input
            type="text"
            value="${profile.employee_id ? escapeHtml(String(profile.employee_id)) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.employee_id ? 'text-gray-400 italic' : ''}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Designation</label>
          <input
            type="text"
            value="${profile.designation ? escapeHtml(profile.designation) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.designation ? 'text-gray-400 italic' : ''}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <input
            type="text"
            value="${profile.country ? escapeHtml(profile.country) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.country ? 'text-gray-400 italic' : ''}"
          />
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate team information fields
 */
export function generateTeamInfoFields(profile: UserProfile): string {
  const hasTeamInfo = profile.team || profile.channel || profile.team_supervisor || profile.quality_mentor;
  if (!hasTeamInfo) {
    return '';
  }

  return `
    <div class="mt-6 pt-6 border-t border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Team Information</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Team</label>
          <input
            type="text"
            value="${profile.team ? escapeHtml(profile.team) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.team ? 'text-gray-400 italic' : ''}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Channel</label>
          <input
            type="text"
            value="${profile.channel ? escapeHtml(profile.channel) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.channel ? 'text-gray-400 italic' : ''}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Team Supervisor</label>
          <input
            type="text"
            value="${profile.team_supervisor_name || profile.team_supervisor ? escapeHtml(profile.team_supervisor_name || profile.team_supervisor || '') : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.team_supervisor ? 'text-gray-400 italic' : ''}"
          />
          ${profile.team_supervisor && !profile.team_supervisor_name ? `
            <p class="mt-1 text-xs text-gray-500">Email: ${escapeHtml(profile.team_supervisor)}</p>
          ` : ''}
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Quality Mentor</label>
          <input
            type="text"
            value="${profile.quality_mentor ? escapeHtml(profile.quality_mentor) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.quality_mentor ? 'text-gray-400 italic' : ''}"
          />
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate account information fields
 */
export function generateAccountInfoFields(profile: UserProfile): string {
  const hasAccountInfo = profile.is_active !== null || profile.last_login || profile.login_count !== null || profile.intercom_admin_alias;
  if (!hasAccountInfo) {
    return '';
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not available';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return `
    <div class="mt-6 pt-6 border-t border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
          <input
            type="text"
            value="${profile.is_active !== null ? (profile.is_active ? 'Active' : 'Inactive') : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${profile.is_active === null ? 'text-gray-400 italic' : ''}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Last Login</label>
          <input
            type="text"
            value="${formatDate(profile.last_login)}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.last_login ? 'text-gray-400 italic' : ''}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Login Count</label>
          <input
            type="text"
            value="${profile.login_count !== null ? escapeHtml(String(profile.login_count)) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${profile.login_count === null ? 'text-gray-400 italic' : ''}"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Intercom Admin Alias</label>
          <input
            type="text"
            value="${profile.intercom_admin_alias ? escapeHtml(profile.intercom_admin_alias) : 'Not available'}"
            disabled
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed ${!profile.intercom_admin_alias ? 'text-gray-400 italic' : ''}"
          />
        </div>
      </div>
    </div>
  `;
}

