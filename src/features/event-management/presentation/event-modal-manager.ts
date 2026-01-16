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
import userProfileTooltip from './user-profile-tooltip.js';

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

    // H7: Setup keyboard navigation
    this.setupKeyboardNavigation();

    // H3: Setup real-time form validation
    this.setupFormValidation();

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
          // Fallback to alert if confirmationDialog not available
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
                <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded participant-name-view" style="cursor: pointer;" data-user-email="${escapeHtml(user.email)}">${escapeHtml(user.name || user.email)}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${event.meet_link ? `
          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1">Google Meet Link</label>
            <a href="${escapeHtml(event.meet_link)}" target="_blank" rel="noopener noreferrer" class="join-meet-link inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors no-underline">
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

      // Add hover tooltip for participant names in view modal
      content.querySelectorAll('.participant-name-view').forEach(element => {
        const email = element.getAttribute('data-user-email');
        if (!email) return;

        const user = participantUsers.find(u => u.email === email);
        if (!user) return;

        element.addEventListener('mouseenter', () => {
          userProfileTooltip.show(user, element as HTMLElement);
        });

        element.addEventListener('mouseleave', () => {
          userProfileTooltip.hide();
        });
      });
    } catch (error) {
      logError('[EventModalManager] Error viewing event:', error);
    }
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    
    // Get submit button and disable immediately (B1: Loading state)
    const submitBtn = document.querySelector('#eventForm button[type="submit"]') as HTMLButtonElement;
    const originalText = submitBtn?.textContent || 'Save Event';
    const originalDisabled = submitBtn?.disabled || false;
    
    // Disable button immediately to prevent double submission
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
    }
    
    try {
      const title = (document.getElementById('eventTitle') as HTMLInputElement).value.trim();
      const type = (document.getElementById('eventType') as HTMLSelectElement).value;
      const date = (document.getElementById('eventDate') as HTMLInputElement).value;
      const startTime = (document.getElementById('eventStartTime') as HTMLInputElement).value;
      const endTime = (document.getElementById('eventEndTime') as HTMLInputElement).value;
      const description = (document.getElementById('eventDescription') as HTMLTextAreaElement).value.trim();
      const meetLinkInput = (document.getElementById('eventMeetLink') as HTMLInputElement).value.trim();
      
      // Validate required fields (H1: Use confirmationDialog instead of alert)
      if (!title || !type || !date || !startTime || !endTime) {
        if ((window as any).confirmationDialog) {
          await (window as any).confirmationDialog.show({
            title: 'Validation Error',
            message: 'Please fill in all required fields',
            confirmText: 'OK',
            cancelText: '',
            type: 'error'
          });
        } else {
          alert('Please fill in all required fields');
        }
        return;
      }

      // Validate time (H1: Use confirmationDialog instead of alert)
      if (startTime >= endTime) {
        if ((window as any).confirmationDialog) {
          await (window as any).confirmationDialog.show({
            title: 'Validation Error',
            message: 'End time must be after start time',
            confirmText: 'OK',
            cancelText: '',
            type: 'error'
          });
        } else {
          alert('End time must be after start time');
        }
        return;
      }

      const state = this.stateManager.getState();
      const participants = state.selectedParticipants.map(p => p.email);

      // Process meet link (M3: Add validation)
      let meetLink: string | null = null;
      if (meetLinkInput) {
        const meetUrlPattern = /^https?:\/\/(meet\.google\.com\/[a-z0-9-]+|.*meet\.google\.com)/i;
        const meetIdPattern = /^[a-z0-9-]+$/i;
        
        if (meetLinkInput.startsWith('http://') || meetLinkInput.startsWith('https://')) {
          if (!meetUrlPattern.test(meetLinkInput)) {
            throw new Error('Invalid Google Meet URL format. Please enter a valid Google Meet URL.');
          }
          meetLink = meetLinkInput;
        } else {
          const cleanedId = meetLinkInput.replace(/[^a-z0-9-]/gi, '');
          if (!meetIdPattern.test(cleanedId)) {
            throw new Error('Invalid Google Meet ID format. Please enter a valid Meet ID (e.g., abc-defg-hij).');
          }
          if (cleanedId) {
            meetLink = `https://meet.google.com/${cleanedId}`;
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
      
      // H2: Add success feedback
      if (state.editingEventId) {
        await this.controller.updateEvent(state.editingEventId, formData);
        await this.showSuccessMessage('Event updated successfully!');
      } else {
        await this.controller.createEvent(formData);
        await this.showSuccessMessage('Event created successfully!');
      }
      
      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    } finally {
      // Re-enable button on error or after success
      if (submitBtn) {
        submitBtn.disabled = originalDisabled;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    }
  }

  /**
   * Show success message (H2: Success feedback)
   */
  private async showSuccessMessage(message: string): Promise<void> {
    if ((window as any).confirmationDialog) {
      await (window as any).confirmationDialog.show({
        title: 'Success',
        message: message,
        confirmText: 'OK',
        cancelText: '',
        type: 'success'
      });
    } else {
      // Fallback to alert if confirmationDialog not available
      alert(message);
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

      // H8: Add keyboard navigation to Quick Add dropdown
      quickAddDropdown.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          quickAddDropdown.classList.add('hidden');
          quickAddBtn.focus();
        }
      });

      // Focus first option when opened
      quickAddBtn.addEventListener('click', () => {
        setTimeout(() => {
          if (!quickAddDropdown.classList.contains('hidden')) {
            const firstOption = quickAddDropdown.querySelector('.quick-add-option') as HTMLElement;
            if (firstOption) {
              firstOption.setAttribute('tabindex', '0');
              firstOption.focus();
            }
          }
        }, 0);
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
      if ((window as any).confirmationDialog) {
        await (window as any).confirmationDialog.show({
          title: 'Error',
          message: 'Unable to paste from clipboard. Please make sure you have clipboard access permissions.',
          confirmText: 'OK',
          cancelText: '',
          type: 'error'
        });
      } else {
        alert('Unable to paste from clipboard. Please make sure you have clipboard access permissions.');
      }
    }
  }

  /**
   * Create meet link using Google Calendar API
   */
  async createMeetLink(): Promise<void> {
    const button = document.getElementById('createMeetLinkBtn') as HTMLButtonElement;
    const meetLinkInput = document.getElementById('eventMeetLink') as HTMLInputElement;
    
    if (!button || !meetLinkInput) return;

    // Show loading state
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
      <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Generating...
    `;

    try {
      // Import API client dynamically
      const { apiClient } = await import('../../../utils/api-client.js');
      
      // Get event details if available
      const state = this.stateManager.getState();
      const titleInput = document.getElementById('eventTitle') as HTMLInputElement;
      const dateInput = document.getElementById('eventDate') as HTMLInputElement;
      const startTimeInput = document.getElementById('eventStartTime') as HTMLInputElement;
      const endTimeInput = document.getElementById('eventEndTime') as HTMLInputElement;
      
      const title = titleInput?.value || 'Quick Meeting';
      const date = dateInput?.value;
      const startTime = startTimeInput?.value;
      const endTime = endTimeInput?.value;
      
      // Prepare options
      const options: any = { title };
      
      // If we have date and times, create a scheduled event
      if (date && startTime && endTime) {
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        options.startTime = startDateTime.toISOString();
        options.endTime = endDateTime.toISOString();
        
        // Add participants if available
        if (state.selectedParticipants.length > 0) {
          options.attendees = state.selectedParticipants.map(p => p.email);
        }
      }
      
      // Generate Meet link
      let result;
      try {
        result = await apiClient.googleMeet.generate(options);
      } catch (generateError: any) {
        // Fallback: Open Google Meet landing page in new tab for manual link generation
        logError('[EventModalManager] Meet link generation failed, opening fallback page:', generateError);
        
        // Open Google Meet landing page in a new tab
        const fallbackUrl = 'https://meet.google.com/landing';
        window.open(fallbackUrl, '_blank');
        
        // Reset button state
        button.innerHTML = originalHTML;
        button.disabled = false;
        
        // Show instruction message
        if ((window as any).confirmationDialog) {
          await (window as any).confirmationDialog.show({
            title: 'Manual Meet Link Generation',
            message: 'Automatic Meet link generation is temporarily unavailable. A new tab has been opened to Google Meet where you can generate a link. Please:\n\n1. Generate or copy a Meet link from the opened page\n2. Return to this page\n3. Paste the link in the "Google Meet Link" field below',
            confirmText: 'OK',
            cancelText: '',
            type: 'info',
          });
        } else {
          alert('Automatic Meet link generation failed. A new tab has been opened to Google Meet. Please generate a link there and paste it in the Meet Link field.');
        }
        
        // Focus on the Meet link input field to make it easy for user to paste
        setTimeout(() => {
          meetLinkInput.focus();
          // Add a visual indicator that the field is ready for input
          meetLinkInput.placeholder = 'Paste your Meet link here...';
          meetLinkInput.style.borderColor = '#3b82f6'; // Blue border to indicate it's ready
          setTimeout(() => {
            meetLinkInput.style.borderColor = '';
          }, 3000);
        }, 500);
        
        return; // Exit early, user will paste the link manually
      }
      
      // Result should have meetLink if successful
      if (result && result.meetLink) {
        // Fill in the Meet link input
        meetLinkInput.value = result.meetLink;
        
        // Show success feedback
        button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Generated';
        button.classList.add('bg-green-600', 'hover:bg-green-700');
        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.classList.remove('bg-green-600', 'hover:bg-green-700');
          button.classList.add('bg-blue-600', 'hover:bg-blue-700');
          button.disabled = false;
        }, 2000);
      } else {
        throw new Error('Failed to generate Meet link');
      }
    } catch (error: any) {
      // Fallback: Open Google Meet landing page in new tab for manual link generation
      logError('[EventModalManager] Meet link generation failed, opening fallback page:', error);
      
      // Open Google Meet landing page in a new tab
      const fallbackUrl = 'https://meet.google.com/landing';
      window.open(fallbackUrl, '_blank');
      
      // Reset button state
      button.innerHTML = originalHTML;
      button.disabled = false;
      
      // Show instruction message
      if ((window as any).confirmationDialog) {
        await (window as any).confirmationDialog.show({
          title: 'Manual Meet Link Generation',
          message: 'Automatic Meet link generation is temporarily unavailable. A new tab has been opened to Google Meet where you can generate a link. Please:\n\n1. Generate or copy a Meet link from the opened page\n2. Return to this page\n3. Paste the link in the "Google Meet Link" field below',
          confirmText: 'OK',
          cancelText: '',
          type: 'info',
        });
      } else {
        alert('Automatic Meet link generation failed. A new tab has been opened to Google Meet. Please generate a link there and paste it in the Meet Link field.');
      }
      
      // Focus on the Meet link input field to make it easy for user to paste
      setTimeout(() => {
        meetLinkInput.focus();
        // Add a visual indicator that the field is ready for input
        meetLinkInput.placeholder = 'Paste your Meet link here...';
        meetLinkInput.style.borderColor = '#3b82f6'; // Blue border to indicate it's ready
        setTimeout(() => {
          meetLinkInput.style.borderColor = '';
          meetLinkInput.placeholder = ''; // Reset placeholder after 3 seconds
        }, 3000);
      }, 500);
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

  /**
   * Setup keyboard navigation (H7)
   */
  private setupKeyboardNavigation(): void {
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    
    // Escape to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        this.closeEventModal();
      }
    });
    
    // Enter to submit when focus is on submit button
    form?.addEventListener('keydown', (e) => {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (e.key === 'Enter' && e.target === submitBtn) {
        e.preventDefault();
        (form as HTMLFormElement).requestSubmit();
      }
    });
  }

  /**
   * Setup real-time form validation (H3)
   */
  private setupFormValidation(): void {
    const requiredFields = [
      { id: 'eventTitle', name: 'Event Title' },
      { id: 'eventType', name: 'Event Type' },
      { id: 'eventDate', name: 'Date' },
      { id: 'eventStartTime', name: 'Start Time' },
      { id: 'eventEndTime', name: 'End Time' }
    ];
    
    requiredFields.forEach(({ id, name }) => {
      const field = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
      if (field) {
        field.addEventListener('blur', () => {
          this.validateField(field, name);
        });
      }
    });
    
    // Time range validation
    const endTimeField = document.getElementById('eventEndTime') as HTMLInputElement;
    const startTimeField = document.getElementById('eventStartTime') as HTMLInputElement;
    if (endTimeField && startTimeField) {
      endTimeField.addEventListener('change', () => {
        this.validateTimeRange(startTimeField, endTimeField);
      });
      startTimeField.addEventListener('change', () => {
        this.validateTimeRange(startTimeField, endTimeField);
      });
    }
  }

  /**
   * Validate a single field
   */
  private validateField(field: HTMLInputElement | HTMLSelectElement, fieldName: string): void {
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    
    // Remove existing error styling
    field.classList.remove('border-red-500');
    this.removeFieldError(field);
    
    if (isRequired && !value) {
      field.classList.add('border-red-500');
      this.showFieldError(field, `${fieldName} is required`);
    }
  }

  /**
   * Validate time range
   */
  private validateTimeRange(startField: HTMLInputElement, endField: HTMLInputElement): void {
    const startTime = startField.value;
    const endTime = endField.value;
    
    // Remove existing error styling
    startField.classList.remove('border-red-500');
    endField.classList.remove('border-red-500');
    this.removeFieldError(startField);
    this.removeFieldError(endField);
    
    if (startTime && endTime && startTime >= endTime) {
      endField.classList.add('border-red-500');
      this.showFieldError(endField, 'End time must be after start time');
    }
  }

  /**
   * Show field error message
   */
  private showFieldError(field: HTMLElement, message: string): void {
    // Remove existing error
    this.removeFieldError(field);
    
    // Create error element
    const errorEl = document.createElement('p');
    errorEl.className = 'text-xs text-red-600 mt-1 field-error';
    errorEl.textContent = message;
    
    // Insert after field
    field.parentElement?.appendChild(errorEl);
  }

  /**
   * Remove field error message
   */
  private removeFieldError(field: HTMLElement): void {
    const parent = field.parentElement;
    if (parent) {
      const errorEl = parent.querySelector('.field-error');
      if (errorEl) {
        errorEl.remove();
      }
    }
  }
}
