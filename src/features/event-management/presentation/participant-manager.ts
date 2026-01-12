/**
 * Presentation Layer - Participant Manager
 * Manages participant selection and autocomplete
 */

import type { EventStateManager } from '../application/event-state.js';
import type { User } from '../domain/types.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';
import { logError } from '../../../utils/logging-helper.js';

export class ParticipantManager {
  private highlightedIndex = -1;
  private filteredUsers: User[] = [];

  constructor(private stateManager: EventStateManager) {}

  /**
   * Set up participant management
   */
  setup(): void {
    const searchInput = document.getElementById('participantSearch');
    const dropdown = document.getElementById('participantDropdown');
    
    if (!searchInput || !dropdown) return;

    // Handle input typing
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
      this.handleSearch(query);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        dropdown.classList.add('hidden');
        this.highlightedIndex = -1;
      }
    });

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    // Subscribe to state changes to update UI
    this.stateManager.subscribe(() => {
      this.renderSelectedParticipants();
    });

    // Initial render
    this.renderSelectedParticipants();
  }

  /**
   * Handle search input
   */
  private handleSearch(query: string): void {
    const dropdown = document.getElementById('participantDropdown');
    if (!dropdown) return;

    if (query.length === 0) {
      dropdown.classList.add('hidden');
      this.highlightedIndex = -1;
      return;
    }

    const state = this.stateManager.getState();
    const filtered = state.users.filter(user => {
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    }).filter(user => {
      // Exclude already selected participants
      return !state.selectedParticipants.some(selected => selected.email === user.email);
    });

    this.renderDropdown(filtered);
  }

  /**
   * Render dropdown with filtered users
   */
  private renderDropdown(filtered: User[]): void {
    const dropdown = document.getElementById('participantDropdown');
    if (!dropdown) return;

    this.filteredUsers = filtered;
    this.highlightedIndex = -1;

    if (filtered.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.innerHTML = filtered.map((user, index) => `
      <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 participant-option" data-user-index="${index}">
        <div class="font-medium text-sm text-gray-900">${escapeHtml(user.name || user.email)}</div>
        <div class="text-xs text-gray-500">${escapeHtml(user.email)}</div>
        ${user.role ? `<div class="text-xs text-gray-400">${escapeHtml(user.role)}${user.department ? ` • ${escapeHtml(user.department)}` : ''}</div>` : ''}
      </div>
    `).join('');

    // Add click handlers
    dropdown.querySelectorAll('.participant-option').forEach((option, index) => {
      option.addEventListener('click', () => {
        this.selectParticipant(filtered[index]);
      });
    });

    dropdown.classList.remove('hidden');
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(e: KeyboardEvent): void {
    const dropdown = document.getElementById('participantDropdown');
    const searchInput = e.target as HTMLInputElement;
    
    if (e.key === 'Escape') {
      if (dropdown) dropdown.classList.add('hidden');
      this.highlightedIndex = -1;
      searchInput.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.filteredUsers.length > 0) {
        this.highlightedIndex = (this.highlightedIndex + 1) % this.filteredUsers.length;
        this.updateHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.filteredUsers.length > 0) {
        this.highlightedIndex = this.highlightedIndex <= 0 ? this.filteredUsers.length - 1 : this.highlightedIndex - 1;
        this.updateHighlight();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredUsers.length) {
        this.selectParticipant(this.filteredUsers[this.highlightedIndex]);
      } else if (this.filteredUsers.length > 0) {
        this.selectParticipant(this.filteredUsers[0]);
      }
    }
  }

  /**
   * Update highlight in dropdown
   */
  private updateHighlight(): void {
    const dropdown = document.getElementById('participantDropdown');
    if (!dropdown) return;

    const options = dropdown.querySelectorAll('.participant-option');
    options.forEach((option, index) => {
      const nameDiv = option.querySelector('.font-medium');
      const emailDiv = option.querySelectorAll('.text-xs')[0] as HTMLElement;
      const roleDiv = option.querySelectorAll('.text-xs')[1] as HTMLElement;

      if (index === this.highlightedIndex) {
        option.classList.add('bg-primary', 'text-white');
        if (nameDiv) {
          nameDiv.classList.remove('text-gray-900');
          nameDiv.classList.add('text-white');
        }
        if (emailDiv) {
          emailDiv.classList.remove('text-gray-500');
          emailDiv.classList.add('text-white', 'opacity-90');
        }
        if (roleDiv) {
          roleDiv.classList.remove('text-gray-400');
          roleDiv.classList.add('text-white', 'opacity-75');
        }
        option.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        option.classList.remove('bg-primary', 'text-white');
        if (nameDiv) {
          nameDiv.classList.remove('text-white');
          nameDiv.classList.add('text-gray-900');
        }
        if (emailDiv) {
          emailDiv.classList.remove('text-white', 'opacity-90');
          emailDiv.classList.add('text-gray-500');
        }
        if (roleDiv) {
          roleDiv.classList.remove('text-white', 'opacity-75');
          roleDiv.classList.add('text-gray-400');
        }
      }
    });
  }

  /**
   * Select participant
   */
  selectParticipant(user: User): void {
    const state = this.stateManager.getState();
    
    // Check if already selected
    if (state.selectedParticipants.some(p => p.email === user.email)) {
      return;
    }

    this.stateManager.addParticipant(user);
    
    // Clear search input and hide dropdown, but keep focus
    const searchInput = document.getElementById('participantSearch') as HTMLInputElement;
    const dropdown = document.getElementById('participantDropdown');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 0);
    }
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
    this.highlightedIndex = -1;
  }

  /**
   * Remove participant (called from HTML)
   */
  removeParticipant(email: string): void {
    this.stateManager.removeParticipant(email);
  }

  /**
   * Render selected participants
   */
  renderSelectedParticipants(): void {
    const container = document.getElementById('selectedParticipants');
    if (!container) return;

    const state = this.stateManager.getState();
    const participants = state.selectedParticipants;

    if (participants.length === 0) {
      container.innerHTML = '<span class="text-xs text-gray-400 italic">No participants selected</span>';
      return;
    }

    container.innerHTML = participants.map(user => `
      <span class="inline-flex items-center gap-1 px-2 py-1 bg-primary text-white text-xs font-medium rounded">
        ${escapeHtml(user.name || user.email)}
        <button type="button" onclick="window.eventHandlers?.removeParticipant('${escapeHtml(user.email)}')" class="hover:bg-primary-dark rounded p-0.5 transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </span>
    `).join('');
  }
}
