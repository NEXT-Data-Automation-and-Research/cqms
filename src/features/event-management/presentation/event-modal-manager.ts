/**
 * Presentation Layer - Event Modal Manager
 * Manages event modals (create, edit, view) and quick add
 */

import type { EventController } from '../application/event-controller.js';
import type { EventStateManager } from '../application/event-state.js';
import type { EventRenderer } from './event-renderer.js';
import type { Event, EventFormData } from '../domain/types.js';
import { logError, logInfo } from '../../../utils/logging-helper.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';

export class EventModalManager {
  private currentQuickAddType: string | null = null;

  constructor(
    private controller: EventController,
    private stateManager: EventStateManager,
    private renderer: EventRenderer
  ) {}

  /**
   * Set up modal event listeners
   */
  setup(): void {
    // Event form submission
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
      eventForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Close buttons
    const closeEventModalBtn = document.getElementById('closeEventModalBtn');
    const cancelEventBtn = document.getElementById('cancelEventBtn');
    const closeViewEventModalBtn = document.getElementById('closeViewEventModalBtn');
    const closeViewEventModalBtn2 = document.getElementById('closeViewEventModalBtn2');
    const closeQuickAddModalBtn = document.getElementById('closeQuickAddModalBtn');

    closeEventModalBtn?.addEventListener('click', () => this.closeEventModal());
    cancelEventBtn?.addEventListener('click', () => this.closeEventModal());
    closeViewEventModalBtn?.addEventListener('click', () => this.closeViewEventModal());
    closeViewEventModalBtn2?.addEventListener('click', () => this.closeViewEventModal());
    closeQuickAddModalBtn?.addEventListener('click', () => this.closeQuickAddModal());

    // Close modals when clicking outside
    const eventModal = document.getElementById('eventModal');
    const viewEventModal = document.getElementById('viewEventModal');
    const quickAddModal = document.getElementById('quickAddModal');

    eventModal?.addEventListener('click', (e) => {
      if (e.target === eventModal) this.closeEventModal();
    });

    viewEventModal?.addEventListener('click', (e) => {
      if (e.target === viewEventModal) this.closeViewEventModal();
    });

    quickAddModal?.addEventListener('click', (e) => {
      if (e.target === quickAddModal) this.closeQuickAddModal();
    });

    // Quick Add button
    this.setupQuickAddButton();

    // Google Meet buttons
    const pasteMeetLinkBtn = document.getElementById('pasteMeetLinkBtn');
    const createMeetLinkBtn = document.getElementById('createMeetLinkBtn');

    pasteMeetLinkBtn?.addEventListener('click', () => this.pasteMeetLink());
    createMeetLinkBtn?.addEventListener('click', () => this.createMeetLink());

    // Quick Add search
    const quickAddSearch = document.getElementById('quickAddSearch');
    if (quickAddSearch) {
      quickAddSearch.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value;
        this.filterQuickAddOptions(query);
      });
      
      quickAddSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeQuickAddModal();
        }
      });
    }

    // Make functions available globally
    (window as any).showQuickAddOptions = (type: string) => this.showQuickAddOptions(type);
    (window as any).addGroupMembers = (field: string, value: string) => this.addGroupMembers(field, value);
    (window as any).closeQuickAddModal = () => this.closeQuickAddModal();
    (window as any).pasteMeetLink = () => this.pasteMeetLink();
    (window as any).createMeetLink = () => this.createMeetLink();
  }

  /**
   * Open create modal
   */
  openCreateModal(eventType?: string | null, date?: string | null): void {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('eventModalTitle');
    const form = document.getElementById('eventForm') as HTMLFormElement;
    
    if (!modal || !form) return;
    
    this.stateManager.setEditingEventId(null);
    modalTitle!.textContent = 'Create Event';
    form.reset();
    this.stateManager.clearParticipants();
    
    // Auto-fill event type if provided
    if (eventType) {
      const eventTypeSelect = document.getElementById('eventType') as HTMLSelectElement;
      if (eventTypeSelect) {
        eventTypeSelect.value = eventType;
      }
    }
    
    // Auto-fill date if provided
    if (date) {
      const eventDateInput = document.getElementById('eventDate') as HTMLInputElement;
      if (eventDateInput) {
        eventDateInput.value = date;
      }
    }
    
    // Automatically add the event creator as a participant
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (userInfo && userInfo.email) {
      const state = this.stateManager.getState();
      const creatorUser = state.users.find(u => u.email === userInfo.email);
      if (creatorUser) {
        this.stateManager.addParticipant(creatorUser);
      }
    }
    
    modal.classList.remove('hidden');
  }

  /**
   * Edit event
   */
  async editEvent(eventId: string): Promise<void> {
    try {
      const state = this.stateManager.getState();
      const event = state.events.find(e => e.id === eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      // Check permissions
      const canModify = event.created_by === this.controller.getUserEmail() || 
                       this.controller.isUserSuperAdmin();
      
      if (!canModify) {
        if ((window as any).confirmationDialog) {
          await (window as any).confirmationDialog.show({
            title: 'Permission Denied',
            message: 'You can only edit events that you created.',
            confirmText: 'OK',
            cancelText: '',
            type: 'error'
          });
        } else {
          alert('You can only edit events that you created.');
        }
        return;
      }

      this.openEditModal(event);
    } catch (error) {
      logError('[EventModalManager] Error editing event:', error);
    }
  }

  /**
   * Open edit modal with event data
   */
  private openEditModal(event: Event): void {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('eventModalTitle');
    const form = document.getElementById('eventForm') as HTMLFormElement;
    
    if (!modal || !form) return;
    
    this.stateManager.setEditingEventId(event.id);
    modalTitle!.textContent = 'Edit Event';
    
    // Fill form fields
    (document.getElementById('eventTitle') as HTMLInputElement).value = event.title || '';
    (document.getElementById('eventType') as HTMLSelectElement).value = event.type || '';
    (document.getElementById('eventDate') as HTMLInputElement).value = event.date || '';
    (document.getElementById('eventStartTime') as HTMLInputElement).value = event.start_time || '';
    (document.getElementById('eventEndTime') as HTMLInputElement).value = event.end_time || '';
    (document.getElementById('eventDescription') as HTMLTextAreaElement).value = event.description || '';
    (document.getElementById('eventMeetLink') as HTMLInputElement).value = event.meet_link || '';
    
    // Handle participants
    this.stateManager.clearParticipants();
    const state = this.stateManager.getState();
    
    if (event.participants) {
      let participantEmails: string[] = [];
      if (Array.isArray(event.participants)) {
        participantEmails = event.participants;
      } else {
        // Handle case where participants might be stored as string in database
        const participantsStr = String(event.participants);
        try {
          const parsed = JSON.parse(participantsStr);
          participantEmails = Array.isArray(parsed) ? parsed : [participantsStr];
        } catch {
          participantEmails = participantsStr.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        }
      }
      
      // Match emails with user objects
      participantEmails.forEach(email => {
        const user = state.users.find(u => u.email === email);
        if (user) {
          this.stateManager.addParticipant(user);
        }
      });
    }
    
    const searchInput = document.getElementById('participantSearch') as HTMLInputElement;
    const dropdown = document.getElementById('participantDropdown');
    if (searchInput) searchInput.value = '';
    if (dropdown) dropdown.classList.add('hidden');
    
    modal.classList.remove('hidden');
  }

  /**
   * View event
   */
  async viewEvent(eventId: string): Promise<void> {
    try {
      const state = this.stateManager.getState();
      const event = state.events.find(e => e.id === eventId);
      
      if (!event) {
        throw new Error('Event not found');
      }

      const modal = document.getElementById('viewEventModal');
      const content = document.getElementById('viewEventContent');
      
      if (!modal || !content) return;
      
      const typeColors = {
        session: 'bg-blue-100 text-blue-800',
        meeting: 'bg-purple-100 text-purple-800',
        feedback: 'bg-green-100 text-green-800',
        training: 'bg-orange-100 text-orange-800'
      };
      
      const typeLabels = {
        session: 'Session',
        meeting: 'Meeting',
        feedback: 'Feedback Session',
        training: 'Training Session'
      };
      
      // Parse participants
      let participantEmails: string[] = [];
      if (event.participants) {
        if (Array.isArray(event.participants)) {
          participantEmails = event.participants;
        } else {
          // Handle case where participants might be stored as string in database
          const participantsStr = String(event.participants);
          try {
            const parsed = JSON.parse(participantsStr);
            participantEmails = Array.isArray(parsed) ? parsed : [];
          } catch {
            participantEmails = participantsStr.split(',').map((p: string) => p.trim()).filter((p: string) => p);
          }
        }
      }
      
      // Match emails with user objects
      const participantUsers = participantEmails
        .map(email => state.users.find(u => u.email === email))
        .filter(u => u !== undefined);
      
      // Get creator name
      const creatorUser = event.created_by ? state.users.find(u => u.email === event.created_by) : null;
      const creatorName = creatorUser ? (creatorUser.name || creatorUser.email) : (event.created_by || 'N/A');
      
      content.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1">Event Title</label>
          <div class="flex items-center gap-2 mb-4">
            <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(event.title)}</h3>
            <span class="px-2 py-1 rounded text-xs font-semibold ${typeColors[event.type] || 'bg-gray-100 text-gray-800'}">
              ${typeLabels[event.type] || event.type}
            </span>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Date</label>
            <p class="text-sm text-gray-900">${this.formatDate(event.date)}</p>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Time</label>
            <p class="text-sm text-gray-900">${event.start_time || 'N/A'} - ${event.end_time || 'N/A'}</p>
          </div>
        </div>
        
        ${event.description ? `
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <p class="text-sm text-gray-900 whitespace-pre-wrap">${escapeHtml(event.description)}</p>
          </div>
        ` : ''}
        
        ${participantUsers.length > 0 ? `
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Participants</label>
            <div class="flex flex-wrap gap-2">
              ${participantUsers.map(user => `
                <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${escapeHtml(user.name || user.email)}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${event.meet_link ? `
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Google Meet Link</label>
            <a href="${escapeHtml(event.meet_link)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              Join Google Meet
            </a>
            <p class="text-xs text-gray-500 mt-1 break-all">${escapeHtml(event.meet_link)}</p>
          </div>
        ` : ''}
        
        <div class="pt-4 border-t border-gray-200">
          <label class="block text-xs font-semibold text-gray-500 mb-1">Created By</label>
          <p class="text-sm text-gray-900">${escapeHtml(creatorName)}</p>
          ${event.created_at ? `
            <p class="text-xs text-gray-500 mt-1">Created on ${this.formatDateTime(event.created_at)}</p>
          ` : ''}
        </div>
      `;
      
      modal.classList.remove('hidden');
    } catch (error) {
      logError('[EventModalManager] Error viewing event:', error);
    }
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    
    try {
      const title = (document.getElementById('eventTitle') as HTMLInputElement).value.trim();
      const type = (document.getElementById('eventType') as HTMLSelectElement).value;
      const date = (document.getElementById('eventDate') as HTMLInputElement).value;
      const startTime = (document.getElementById('eventStartTime') as HTMLInputElement).value;
      const endTime = (document.getElementById('eventEndTime') as HTMLInputElement).value;
      const description = (document.getElementById('eventDescription') as HTMLTextAreaElement).value.trim();
      const meetLinkInput = (document.getElementById('eventMeetLink') as HTMLInputElement).value.trim();
      
      // Validate required fields
      if (!title || !type || !date || !startTime || !endTime) {
        alert('Please fill in all required fields');
        return;
      }

      // Validate time
      if (startTime >= endTime) {
        alert('End time must be after start time');
        return;
      }

      const state = this.stateManager.getState();
      const participants = state.selectedParticipants.map(p => p.email);

      // Process meet link
      let meetLink: string | null = null;
      if (meetLinkInput) {
        if (meetLinkInput.startsWith('http://') || meetLinkInput.startsWith('https://')) {
          meetLink = meetLinkInput;
        } else {
          const meetId = meetLinkInput.replace(/[^a-z0-9-]/gi, '');
          if (meetId) {
            meetLink = `https://meet.google.com/${meetId}`;
          }
        }
      }

      const formData: EventFormData = {
        title,
        type: type as any,
        date,
        startTime,
        endTime,
        description,
        participants,
        meetLink
      };
      
      if (state.editingEventId) {
        await this.controller.updateEvent(state.editingEventId, formData);
      } else {
        await this.controller.createEvent(formData);
      }
      
      this.closeEventModal();
      this.renderer.render();
    } catch (error) {
      logError('[EventModalManager] Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save event';
      if ((window as any).confirmationDialog) {
        await (window as any).confirmationDialog.show({
          title: 'Error',
          message: errorMessage,
          confirmText: 'OK',
          cancelText: '',
          type: 'error'
        });
      } else {
        alert(errorMessage);
      }
    }
  }

  /**
   * Close event modal
   */
  closeEventModal(): void {
    const modal = document.getElementById('eventModal');
    if (modal) {
      modal.classList.add('hidden');
      this.stateManager.setEditingEventId(null);
      const form = document.getElementById('eventForm') as HTMLFormElement;
      if (form) form.reset();
      this.stateManager.clearParticipants();
      const searchInput = document.getElementById('participantSearch') as HTMLInputElement;
      const dropdown = document.getElementById('participantDropdown');
      if (searchInput) searchInput.value = '';
      if (dropdown) dropdown.classList.add('hidden');
    }
    this.closeQuickAddModal();
  }

  /**
   * Close view event modal
   */
  closeViewEventModal(): void {
    const modal = document.getElementById('viewEventModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Set up Quick Add button
   */
  private setupQuickAddButton(): void {
    const quickAddBtn = document.getElementById('quickAddBtn');
    const quickAddDropdown = document.getElementById('quickAddDropdown');
    
    if (quickAddBtn && quickAddDropdown) {
      quickAddBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        quickAddDropdown.classList.toggle('hidden');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!quickAddBtn.contains(e.target as Node) && !quickAddDropdown.contains(e.target as Node)) {
          quickAddDropdown.classList.add('hidden');
        }
      });

      // Handle quick add option clicks
      quickAddDropdown.querySelectorAll('.quick-add-option').forEach(option => {
        option.addEventListener('click', () => {
          const type = option.getAttribute('data-type');
          if (type) {
            this.showQuickAddOptions(type);
          }
        });
      });
    }
  }

  /**
   * Show quick add options modal
   */
  showQuickAddOptions(type: string): void {
    this.currentQuickAddType = type;
    const modal = document.getElementById('quickAddModal');
    const modalTitle = document.getElementById('quickAddModalTitle');
    const optionsList = document.getElementById('quickAddOptionsList');
    const quickAddSearch = document.getElementById('quickAddSearch') as HTMLInputElement;
    const quickAddDropdown = document.getElementById('quickAddDropdown');
    
    if (!modal || !optionsList) return;
    
    // Close the quick add dropdown
    if (quickAddDropdown) {
      quickAddDropdown.classList.add('hidden');
    }
    
    // Set modal title
    const titles: Record<string, string> = {
      'channel': 'Add by Channel',
      'team': 'Add by Team',
      'supervisor': 'Add by Supervisor',
      'quality_mentor': 'Add by Quality Mentor',
      'country': 'Add by Country',
      'role': 'Add by Role'
    };
    if (modalTitle) {
      modalTitle.textContent = titles[type] || 'Add by Group';
    }
    
    // Get unique values for the selected type
    const fieldMap: Record<string, string> = {
      'channel': 'channel',
      'team': 'team',
      'supervisor': 'team_supervisor',
      'quality_mentor': 'quality_mentor',
      'country': 'country',
      'role': 'role'
    };
    
    const field = fieldMap[type];
    if (!field) return;
    
    const state = this.stateManager.getState();
    const values = state.users
      .map(user => (user as any)[field])
      .filter(value => value && value.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    
    // Render options
    this.renderQuickAddOptions(values, field);
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Clear and focus search
    if (quickAddSearch) {
      quickAddSearch.value = '';
      setTimeout(() => quickAddSearch.focus(), 100);
    }
  }

  /**
   * Render quick add options
   */
  private renderQuickAddOptions(values: string[], field: string): void {
    const optionsList = document.getElementById('quickAddOptionsList');
    if (!optionsList) return;
    
    if (values.length === 0) {
      optionsList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No options available</p>';
      return;
    }
    
    const state = this.stateManager.getState();
    
    optionsList.innerHTML = values.map(value => {
      // Count members in this group
      const memberCount = state.users.filter(user => (user as any)[field] === value).length;
      
      return `
        <button type="button" onclick="window.eventHandlers?.addGroupMembers('${escapeHtml(field)}', '${escapeHtml(value)}')" class="w-full text-left px-4 py-3 hover:bg-gray-50 border border-gray-200 rounded transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="font-medium text-sm text-gray-900">${escapeHtml(value)}</div>
              <div class="text-xs text-gray-500 mt-0.5">${memberCount} member${memberCount !== 1 ? 's' : ''}</div>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
        </button>
      `;
    }).join('');
  }

  /**
   * Filter quick add options
   */
  private filterQuickAddOptions(query: string): void {
    const optionsList = document.getElementById('quickAddOptionsList');
    if (!optionsList || !this.currentQuickAddType) return;
    
    const fieldMap: Record<string, string> = {
      'channel': 'channel',
      'team': 'team',
      'supervisor': 'team_supervisor',
      'quality_mentor': 'quality_mentor',
      'country': 'country',
      'role': 'role'
    };
    
    const field = fieldMap[this.currentQuickAddType];
    if (!field) return;
    
    const searchQuery = query.toLowerCase().trim();
    const state = this.stateManager.getState();
    
    // Get filtered unique values
    let values = state.users
      .map(user => (user as any)[field])
      .filter(value => value && value.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index);
    
    if (searchQuery) {
      values = values.filter(value => 
        value.toLowerCase().includes(searchQuery)
      );
    }
    
    values.sort();
    this.renderQuickAddOptions(values, field);
  }

  /**
   * Add group members
   */
  addGroupMembers(field: string, value: string): void {
    const state = this.stateManager.getState();
    
    // Find all users matching this field value
    const groupMembers = state.users.filter(user => {
      const userValue = (user as any)[field];
      return userValue && userValue === value;
    });
    
    // Add all members to selected participants (avoid duplicates)
    let addedCount = 0;
    groupMembers.forEach(user => {
      if (!state.selectedParticipants.some(p => p.email === user.email)) {
        this.stateManager.addParticipant(user);
        addedCount++;
      }
    });
    
    // Close modal
    this.closeQuickAddModal();
    
    // Show feedback
    if (addedCount > 0) {
      const quickAddBtn = document.getElementById('quickAddBtn');
      if (quickAddBtn) {
        const originalHTML = quickAddBtn.innerHTML;
        quickAddBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Added ${addedCount}`;
        quickAddBtn.classList.add('bg-green-600', 'text-white', 'border-green-600');
        quickAddBtn.classList.remove('bg-gray-100', 'text-gray-700', 'border-gray-300');
        setTimeout(() => {
          quickAddBtn.innerHTML = originalHTML;
          quickAddBtn.classList.remove('bg-green-600', 'text-white', 'border-green-600');
          quickAddBtn.classList.add('bg-gray-100', 'text-gray-700', 'border-gray-300');
        }, 2000);
      }
    }
  }

  /**
   * Close quick add modal
   */
  closeQuickAddModal(): void {
    const modal = document.getElementById('quickAddModal');
    const quickAddSearch = document.getElementById('quickAddSearch') as HTMLInputElement;
    if (modal) {
      modal.classList.add('hidden');
    }
    if (quickAddSearch) {
      quickAddSearch.value = '';
    }
    this.currentQuickAddType = null;
  }

  /**
   * Paste meet link from clipboard
   */
  async pasteMeetLink(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const meetLinkInput = document.getElementById('eventMeetLink') as HTMLInputElement;
        if (meetLinkInput) {
          let meetLink = text.trim();
          if (meetLink && !meetLink.startsWith('http://') && !meetLink.startsWith('https://')) {
            const meetId = meetLink.replace(/[^a-z0-9-]/gi, '');
            if (meetId) {
              meetLink = `https://meet.google.com/${meetId}`;
            }
          }
          meetLinkInput.value = meetLink;
          
          // Show success feedback
          const button = document.getElementById('pasteMeetLinkBtn');
          if (button) {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Pasted';
            button.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white');
            button.classList.remove('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
            setTimeout(() => {
              button.innerHTML = originalHTML;
              button.classList.remove('bg-green-600', 'hover:bg-green-700', 'text-white');
              button.classList.add('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
            }, 1500);
          }
        }
      }
    } catch (error) {
      logError('Error pasting from clipboard:', error);
      alert('Unable to paste from clipboard. Please make sure you have clipboard access permissions.');
    }
  }

  /**
   * Create meet link (opens Google Meet)
   */
  createMeetLink(): void {
    window.open('https://meet.google.com', '_blank');
    
    // Show feedback
    const button = document.getElementById('createMeetLinkBtn');
    if (button) {
      const originalHTML = button.innerHTML;
      button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg> Opened';
      button.classList.add('bg-green-600', 'hover:bg-green-700');
      button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove('bg-green-600', 'hover:bg-green-700');
        button.classList.add('bg-blue-600', 'hover:bg-blue-700');
      }, 2000);
    }
  }

  /**
   * Format date
   */
  private formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Format date time
   */
  private formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
