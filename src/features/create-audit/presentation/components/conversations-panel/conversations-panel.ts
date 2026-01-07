/**
 * Conversations Panel Component
 * Displays filters and conversation table for selected audit
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../../../utils/logging-helper.js';
import { getAuthenticatedSupabase } from '../../../../../utils/authenticated-supabase.js';
// ConversationStatistics interface definition
export interface ConversationStatistics {
  totalConversations: number;
  totalParticipationParts: number;
  averageCSAT: number;
  conversationsWithRating: number;
  averageConversationLength: number;
  totalConversationLength: number;
  channelBreakdown: Record<string, number>;
  tagBreakdown: Record<string, number>;
  conversationsByDate: Record<string, number>;
}

export interface Conversation {
  id: string;
  client: string;
  subject: string;
  csat: number;
  cxScore: number;
  length: number;
  errorsDetected: number;
  tags: string[];
  created: string;
  aiStatus: 'Completed' | 'Processing' | 'Failed';
  channel?: string;
}

export class ConversationsPanel {
  private container: HTMLElement;
  private emptyState!: HTMLElement;
  private contentPanel!: HTMLElement;
  private tableBody: HTMLTableSectionElement | null = null;
  private selectedAudit: any = null;
  private conversations: Conversation[] = [];
  private selectedConversationIds: Set<string> = new Set();
  private onConversationsSelectedCallback?: (conversationIds: string[]) => void;
  private channelDropdownContainer!: HTMLElement;
  private channelDropdownButton!: HTMLElement;
  private channelDropdownMenu!: HTMLElement;
  private selectedChannel: string = '';
  private onStatisticsUpdatedCallback?: (stats: ConversationStatistics) => void;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    if (!this.container) {
      logError(`ConversationsPanel: Container with ID "${containerId}" not found.`);
      return;
    }

    this.render();
    this.emptyState = this.container.querySelector('#conversations-panel-empty')!;
    this.contentPanel = this.container.querySelector('#conversations-panel-content')!;
    
    // Try to get tableBody, but it might be inside a hidden div
    // We'll lazy-load it when needed if not found initially
    this.tableBody = this.container.querySelector('#conversations-table-body') as HTMLTableSectionElement | null;
    
    if (!this.tableBody) {
      logWarn('Table body not found during initialization, will query when needed');
    }

    this.attachEventListeners();
  }
  
  /**
   * Get table body element, lazy-loading if needed
   * Works even when element is inside hidden panel
   */
  private getTableBody(): HTMLTableSectionElement {
    // Always re-query if tableBody exists but is not in DOM
    if (this.tableBody && !this.tableBody.parentElement) {
      this.tableBody = null;
    }
    
    if (!this.tableBody) {
      // Try to find the table body - it might be inside hidden content panel
      // querySelector works even on hidden elements
      this.tableBody = this.container.querySelector('#conversations-table-body') as HTMLTableSectionElement;
      
      if (!this.tableBody) {
        // If still not found, try finding the content panel first
        const contentPanel = this.container.querySelector('#conversations-panel-content');
        if (contentPanel) {
          this.tableBody = contentPanel.querySelector('#conversations-table-body') as HTMLTableSectionElement;
        }
      }
      
      if (!this.tableBody) {
        // Try to find the table and get its tbody
        const table = this.container.querySelector('#conversations-panel-content table') ||
                     this.container.querySelector('table');
        if (table) {
          // Check if tbody already exists
          this.tableBody = table.querySelector('tbody#conversations-table-body') as HTMLTableSectionElement;
          if (!this.tableBody) {
            // Create new tbody if it doesn't exist
            this.tableBody = document.createElement('tbody');
            this.tableBody.id = 'conversations-table-body';
            table.appendChild(this.tableBody);
          }
        } else {
          logError('Table body element not found and no table element available');
          // Last resort: create standalone tbody (won't be visible but prevents crash)
          this.tableBody = document.createElement('tbody');
          this.tableBody.id = 'conversations-table-body';
        }
      }
    }
    
    return this.tableBody;
  }

  private render(): void {
    // HTML is loaded from conversations-panel.html
  }

  private initializeChannelDropdown(): void {
    this.channelDropdownContainer = this.container.querySelector('#channel-dropdown-container')!;
    if (!this.channelDropdownContainer) {
      logWarn('Channel dropdown container not found');
      return;
    }
    
    // Don't re-initialize if already initialized
    if (this.channelDropdownButton) {
      return;
    }

    const channels = [
      { value: '', label: 'All Channels' },
      { value: 'chat', label: 'Chat' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' }
    ];

    // Clear container
    this.channelDropdownContainer.textContent = '';
    
    // Create button
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'conversation-channel-dropdown-button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'true');
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'conversation-channel-dropdown-label';
    labelSpan.textContent = 'All Channels';
    button.appendChild(labelSpan);
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'conversation-channel-dropdown-chevron');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M2 4L6 8L10 4');
    svg.appendChild(path);
    button.appendChild(svg);
    
    // Create menu
    const menu = document.createElement('div');
    menu.className = 'conversation-channel-dropdown-menu';
    
    channels.forEach(channel => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = `conversation-channel-dropdown-option ${channel.value === '' ? 'selected' : ''}`;
      option.setAttribute('data-value', this.escapeHtml(channel.value));
      option.textContent = channel.label;
      menu.appendChild(option);
    });
    
    this.channelDropdownContainer.appendChild(button);
    this.channelDropdownContainer.appendChild(menu);

    this.channelDropdownButton = this.channelDropdownContainer.querySelector('.conversation-channel-dropdown-button')!;
    this.channelDropdownMenu = this.channelDropdownContainer.querySelector('.conversation-channel-dropdown-menu')!;

    // Toggle dropdown
    this.channelDropdownButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleChannelDropdown();
    });

    // Handle option selection
    const options = this.channelDropdownMenu.querySelectorAll('.conversation-channel-dropdown-option');
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = (option as HTMLElement).dataset.value || '';
        this.selectChannel(value);
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.channelDropdownContainer && !this.channelDropdownContainer.contains(e.target as Node)) {
        this.closeChannelDropdown();
      }
    });
  }

  private toggleChannelDropdown(): void {
    const isOpen = this.channelDropdownMenu.classList.contains('show');
    if (isOpen) {
      this.closeChannelDropdown();
    } else {
      this.openChannelDropdown();
    }
  }

  private openChannelDropdown(): void {
    this.channelDropdownMenu.classList.add('show');
    this.channelDropdownButton.setAttribute('aria-expanded', 'true');
  }

  private closeChannelDropdown(): void {
    this.channelDropdownMenu.classList.remove('show');
    this.channelDropdownButton.setAttribute('aria-expanded', 'false');
  }

  private selectChannel(value: string): void {
    this.selectedChannel = value;
    const channels = [
      { value: '', label: 'All Channels' },
      { value: 'chat', label: 'Chat' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' }
    ];
    const selectedChannel = channels.find(c => c.value === value);
    const labelElement = this.channelDropdownButton.querySelector('.conversation-channel-dropdown-label');
    if (labelElement && selectedChannel) {
      labelElement.textContent = selectedChannel.label;
    }

    // Update selected state in menu
    const options = this.channelDropdownMenu.querySelectorAll('.conversation-channel-dropdown-option');
    options.forEach(option => {
      const optionValue = (option as HTMLElement).dataset.value || '';
      if (optionValue === value) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });

    this.closeChannelDropdown();
    this.pullConversations();
  }

  private attachEventListeners(): void {
    const selectAll = this.container.querySelector('#select-all-conversations') as HTMLInputElement;
    selectAll?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.toggleAllConversations(checked);
    });

    const useSelectedBtn = this.container.querySelector('#use-selected-conversations');
    useSelectedBtn?.addEventListener('click', () => this.useSelectedConversations());

    // Filter button
    const filterButton = this.container.querySelector('#conversation-filter-button');
    filterButton?.addEventListener('click', () => {
      // TODO: Open advanced filters modal/panel
      logInfo('Advanced filters clicked');
    });

    // Filter listeners - trigger pull when filters change
    const startDate = this.container.querySelector('#conversation-start-date') as HTMLInputElement;
    const endDate = this.container.querySelector('#conversation-end-date') as HTMLInputElement;
    const searchInput = this.container.querySelector('#conversation-search') as HTMLInputElement;

    [startDate, endDate].forEach(input => {
      input?.addEventListener('change', () => this.pullConversations());
    });

    searchInput?.addEventListener('input', () => this.applyFilters());
  }

  onConversationsSelected(callback: (conversationIds: string[]) => void): void {
    this.onConversationsSelectedCallback = callback;
  }

  onStatisticsUpdated(callback: (stats: ConversationStatistics) => void): void {
    this.onStatisticsUpdatedCallback = callback;
  }

  selectAudit(audit: any): void {
    this.selectedAudit = audit;
    this.showContent();
    this.updateAuditInfo();
    this.clearConversations();
  }

  async displayEmployee(employee: any): Promise<void> {
    try {
      logInfo('👤 displayEmployee called', { 
        employeeEmail: employee?.employee_email,
        employeeName: employee?.employee_name,
        hasEmployee: !!employee
      });
      
      if (!employee) {
        logError('displayEmployee called with null/undefined employee');
        return;
      }
      
      if (!employee.employee_email) {
        logError('displayEmployee called with employee missing email', { employee });
        return;
      }
      
      // Store employee summary for conversation filtering
      this.selectedAudit = {
        employee_id: employee.employee_id,
        employee_name: employee.employee_name,
        employee_email: employee.employee_email,
        intercom_alias: employee.intercom_alias,
        audit_count: employee.audit_count,
        audits: employee.audits
      };
      
      logInfo('✅ Employee stored in selectedAudit', { 
        employeeEmail: this.selectedAudit.employee_email 
      });
      
      // Ensure DOM elements are ready
      if (!this.contentPanel) {
        logError('Content panel not ready', { 
          hasContentPanel: !!this.contentPanel
        });
        return;
      }
      
      this.showContent();
      
      // Wait a tick for DOM to update after removing hidden class
      // Then lazy-load tableBody (it's inside the content panel)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Force re-query the table body after content is shown
      this.tableBody = null;
      const tableBody = this.getTableBody();
      if (!tableBody || !tableBody.parentElement) {
        logError('Cannot proceed: table body element not found after showing content', {
          hasTableBody: !!tableBody,
          hasParent: tableBody ? !!tableBody.parentElement : false,
          contentPanelVisible: !this.contentPanel.classList.contains('hidden'),
          contentPanelExists: !!this.contentPanel
        });
        return;
      }
      
      this.updateEmployeeInfo(employee);
      this.setDefaultDateRange();
      this.clearConversations();
      
      logInfo('📞 About to call pullConversations', {
        employeeEmail: this.selectedAudit?.employee_email
      });
      
      // Automatically pull conversations when employee is selected
      // Don't await - let it run asynchronously
      this.pullConversations().catch((error) => {
        logError('Error in pullConversations:', error);
      });
      
    } catch (error) {
      logError('Error in displayEmployee:', error);
      // Don't re-throw - log the error and let the UI continue
      // The error is already logged, and we don't want to break the UI flow
    }
  }

  private setDefaultDateRange(): void {
    const startDateInput = this.container.querySelector('#conversation-start-date') as HTMLInputElement;
    const endDateInput = this.container.querySelector('#conversation-end-date') as HTMLInputElement;

    if (startDateInput && endDateInput) {
      // Always set to yesterday when employee is selected
      // Set start to beginning of yesterday (00:00:00 UTC)
      const yesterdayStart = new Date();
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setUTCHours(0, 0, 0, 0);
      const startDateStr = yesterdayStart.toISOString().split('T')[0];

      // Set end to end of yesterday (23:59:59 UTC)
      const yesterdayEnd = new Date();
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setUTCHours(23, 59, 59, 999);
      const endDateStr = yesterdayEnd.toISOString().split('T')[0];

      startDateInput.value = startDateStr;
      endDateInput.value = endDateStr;
    }
  }

  private updateEmployeeInfo(employee: any): void {
    const employeeName = this.container.querySelector('#selected-audit-employee-name');
    const auditMeta = this.container.querySelector('#selected-audit-meta');

    if (employeeName) {
      employeeName.textContent = employee.employee_name || employee.employee_email;
    }

    if (auditMeta) {
      const alias = employee.intercom_alias ? `${employee.intercom_alias}` : 'No alias';
      auditMeta.textContent = `${employee.audit_count} audit${employee.audit_count !== 1 ? 's' : ''} • ${alias}`;
    }
  }

  private showContent(): void {
    try {
      if (!this.emptyState || !this.contentPanel) {
        logError('Cannot show content: DOM elements not ready', {
          hasEmptyState: !!this.emptyState,
          hasContentPanel: !!this.contentPanel
        });
        return;
      }
      
      this.emptyState.classList.add('hidden');
      this.contentPanel.classList.remove('hidden');
      
      // Reset tableBody reference so it will be re-queried after content is shown
      this.tableBody = null;
      
      // Initialize dropdown when content is shown (container is inside hidden panel initially)
      // Use setTimeout to ensure DOM is ready after removing hidden class
      setTimeout(() => {
        try {
          if (!this.channelDropdownContainer || !this.channelDropdownButton) {
            this.initializeChannelDropdown();
          }
        } catch (error) {
          logError('Error initializing channel dropdown:', error);
        }
      }, 0);
    } catch (error) {
      logError('Error in showContent:', error);
    }
  }

  private updateAuditInfo(): void {
    const employeeName = this.container.querySelector('#selected-audit-employee-name');
    const auditMeta = this.container.querySelector('#selected-audit-meta');

    if (employeeName) {
      employeeName.textContent = this.selectedAudit.employee_name || this.selectedAudit.employee_email;
    }

    if (auditMeta) {
      const date = this.selectedAudit.scheduled_date || this.selectedAudit.created_at?.split('T')[0] || 'N/A';
      auditMeta.textContent = `${this.selectedAudit.scorecard_name || 'N/A'} • ${date}`;
    }
  }

  async pullConversations(): Promise<void> {
    if (!this.selectedAudit) {
      const tableBody = this.getTableBody();
      if (tableBody && tableBody.parentElement) {
        tableBody.textContent = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 11; // Fixed: 11 columns in table
        cell.className = 'px-4 py-8 text-center text-white/60 text-sm';
        cell.textContent = 'No employee selected';
      }
      return;
    }

    const startDateInput = this.container.querySelector('#conversation-start-date') as HTMLInputElement;
    const endDateInput = this.container.querySelector('#conversation-end-date') as HTMLInputElement;
    const startDate = startDateInput?.value;
    const endDate = endDateInput?.value;

    // Set default dates if not provided (yesterday)
    if (!startDate || !endDate) {
      this.setDefaultDateRange();
      const updatedStartDate = (this.container.querySelector('#conversation-start-date') as HTMLInputElement)?.value;
      const updatedEndDate = (this.container.querySelector('#conversation-end-date') as HTMLInputElement)?.value;
      if (!updatedStartDate || !updatedEndDate) {
        const tableBody = this.getTableBody();
        if (tableBody && tableBody.parentElement) {
          tableBody.textContent = '';
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 11; // Fixed: 11 columns in table
          cell.className = 'px-4 py-8 text-center text-white/60 text-sm';
          cell.textContent = 'Please select date range';
        }
        return;
      }
    }

    // Show loading state
    const tableBody = this.getTableBody();
    if (tableBody && tableBody.parentElement) {
      tableBody.textContent = '';
      const row = tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 11; // Fixed: 11 columns in table
      cell.className = 'px-4 py-8 text-center text-white/60';
      cell.textContent = 'Loading conversations...';
    } else {
      logWarn('Cannot show loading state: table body not available');
    }

    try {
      const employeeEmail = this.selectedAudit.employee_email;
      const intercomAlias = this.selectedAudit.intercom_alias;
      
      if (!employeeEmail) {
        throw new Error('Employee email is required');
      }

      // ✅ SECURITY: Use authenticated Supabase helper
      const supabase = await getAuthenticatedSupabase();

      // Get authentication token (auth methods are allowed per security rules)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Get Supabase URL from client or environment
      // Try to get from the Supabase client first (most reliable)
      let supabaseUrl: string | null = null;
      
      // Method 1: Try to get from Supabase client instance
      try {
        if (supabase && (supabase as any).supabaseUrl) {
          supabaseUrl = (supabase as any).supabaseUrl;
        } else if (supabase && (supabase as any).supabaseKey) {
          // If we have the client, try to get URL from window.env or fetch
          supabaseUrl = (window as any).env?.SUPABASE_URL || null;
        }
      } catch (e) {
        logWarn('Could not get Supabase URL from client:', e);
      }
      
      // Method 2: Try window.env
      if (!supabaseUrl) {
        supabaseUrl = (window as any).env?.SUPABASE_URL || null;
      }
      
      // Method 3: Fetch from API
      if (!supabaseUrl) {
        supabaseUrl = await this.getSupabaseUrlFromEnv();
      }
      
      if (!supabaseUrl) {
        logError('Supabase URL not found. Tried: client instance, window.env, /api/env');
        throw new Error('Supabase URL not configured. Please check your environment variables.');
      }

      // Build edge function URL
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-conversations`;
      
      logInfo('🔗 Edge function URL', { url: edgeFunctionUrl, employeeEmail });
      
      // Build query parameters
      const params = new URLSearchParams({
        employee_email: employeeEmail,
      });

      // Add date range
      const finalStartDate = startDate || (this.container.querySelector('#conversation-start-date') as HTMLInputElement)?.value;
      const finalEndDate = endDate || (this.container.querySelector('#conversation-end-date') as HTMLInputElement)?.value;
      
      if (finalStartDate && finalEndDate) {
        // Convert to Unix timestamps (seconds) - Use UTC to avoid timezone issues
        const startDateObj = new Date(finalStartDate + 'T00:00:00Z');
        const endDateObj = new Date(finalEndDate + 'T23:59:59Z');
        const startTimestamp = Math.floor(startDateObj.getTime() / 1000);
        const endTimestamp = Math.floor(endDateObj.getTime() / 1000);
        params.append('updated_since', String(startTimestamp));
        params.append('updated_before', String(endTimestamp));
      } else {
        // If no dates provided, use yesterday as default
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setUTCHours(23, 59, 59, 999);
        params.append('updated_since', String(Math.floor(yesterday.getTime() / 1000)));
        params.append('updated_before', String(Math.floor(endOfYesterday.getTime() / 1000)));
      }

      logInfo('📞 Fetching conversations for employee', { 
        employeeEmail, 
        intercomAlias, 
        dateRange: `${finalStartDate} to ${finalEndDate}`,
        url: edgeFunctionUrl,
        params: params.toString()
      });

      // Call edge function with authentication
      let response: Response;
      try {
        const requestUrl = `${edgeFunctionUrl}?${params.toString()}`;
        logInfo('🔗 Calling edge function', { url: requestUrl, employeeEmail });
        
        response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        logInfo('📥 Edge function response received', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok 
        });
      } catch (fetchError) {
        logError('Network error calling edge function:', fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to edge function'}`);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        logError('Edge function error response', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData 
        });
        
        throw new Error(errorData.error || errorData.message || `Failed to fetch conversations: ${response.status} ${response.statusText}`);
      }

      const data = await response.json().catch(async (parseError) => {
        const text = await response.text();
        logError('Failed to parse edge function response', { error: parseError, responseText: text });
        throw new Error('Invalid response from edge function');
      });
      
      logInfo('📊 Edge function response', { 
        conversationCount: data.conversations?.length || 0,
        totalCount: data.total_count,
        hasMore: data.has_more,
        participationCount: data.participation_count,
        employeeEmail: data.employee_email,
        date: data.date
      });
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        logError('Invalid edge function response structure', { data });
        throw new Error('Invalid response format from edge function');
      }
      
      if (!Array.isArray(data.conversations)) {
        logWarn('Edge function returned non-array conversations', { conversations: data.conversations });
        data.conversations = [];
      }
      
      // Transform Intercom conversations to our Conversation format
      this.conversations = (data.conversations || []).map((conv: any) => {
        try {
        // Helper function to extract conversation parts array
        const getConversationParts = (conv: any): any[] => {
          if (!conv.conversation_parts) return [];
          
          // If it's already an array, return it
          if (Array.isArray(conv.conversation_parts)) {
            return conv.conversation_parts;
          }
          
          // If it's an object, check for nested arrays
          if (typeof conv.conversation_parts === 'object') {
            if (Array.isArray(conv.conversation_parts.conversation_parts)) {
              return conv.conversation_parts.conversation_parts;
            }
            if (Array.isArray(conv.conversation_parts.parts)) {
              return conv.conversation_parts.parts;
            }
          }
          
          return [];
        };
        
        const parts = getConversationParts(conv);
        
        // Extract subject from source or first part body
        let subject = '';
        if (conv.source && typeof conv.source === 'object') {
          subject = conv.source.subject || conv.source.body || '';
        }
        
        if (!subject && parts.length > 0) {
          // Try to get subject from first user message
          const firstUserPart = parts.find((p: any) => p.author?.type === 'user');
          if (firstUserPart?.body) {
            subject = String(firstUserPart.body).substring(0, 100).replace(/\n/g, ' ').trim();
          } else if (parts[0]?.body) {
            subject = String(parts[0].body).substring(0, 100).replace(/\n/g, ' ').trim();
          }
        }
        if (!subject) {
          subject = `Conversation ${conv.id || 'unknown'}`;
        }
        
        // Extract client email/name from source or conversation parts
        let clientEmail = '';
        let clientName = '';
        
        if (conv.source && typeof conv.source === 'object' && conv.source.author) {
          clientEmail = conv.source.author.email || '';
          clientName = conv.source.author.name || '';
        }
        
        if (!clientEmail && !clientName) {
          const userPart = parts.find((p: any) => p.author?.type === 'user');
          if (userPart?.author) {
            clientEmail = userPart.author.email || '';
            clientName = userPart.author.name || '';
          }
        }
        
        // Use email username or name as client identifier
        const client = clientEmail ? clientEmail.split('@')[0] : (clientName || 'Unknown');
        
        // Calculate conversation length (duration) in minutes
        let lengthMinutes = 0;
        if (conv.created_at && conv.updated_at) {
          const created = typeof conv.created_at === 'number' ? conv.created_at * 1000 : new Date(conv.created_at).getTime();
          const updated = typeof conv.updated_at === 'number' ? conv.updated_at * 1000 : new Date(conv.updated_at).getTime();
          lengthMinutes = Math.round((updated - created) / (1000 * 60)); // Convert to minutes
        }
        
        // Use participation_part_count if available, otherwise use parts length
        const partCount = conv.participation_part_count || parts.length;
        
        // Extract tags if available - handle different formats
        let tags: string[] = [];
        if (conv.tags) {
          if (Array.isArray(conv.tags)) {
            tags = conv.tags.map((tag: any) => {
              if (typeof tag === 'string') return tag;
              if (tag && typeof tag === 'object' && tag.name) return tag.name;
              if (tag && typeof tag === 'object' && tag.id) return tag.id;
              return null;
            }).filter((tag: any): tag is string => Boolean(tag));
          } else if (typeof conv.tags === 'object') {
            // If tags is an object, try to extract values
            const tagValues = Object.values(conv.tags);
            tags = tagValues.map((tag: any) => {
              if (typeof tag === 'string') return tag;
              if (tag && typeof tag === 'object' && tag.name) return tag.name;
              return null;
            }).filter((tag: any): tag is string => Boolean(tag));
          }
        }
        
        // Determine channel from source type
        const channelMap: Record<string, string> = {
          'conversation': 'chat',
          'email': 'email',
          'phone': 'phone',
          'twitter': 'twitter',
          'facebook': 'facebook',
          'instagram': 'instagram',
          'whatsapp': 'whatsapp',
        };
        const channel = channelMap[conv.source?.type] || 'chat';

        // Format created date
        let createdDate = '';
        if (conv.created_at_iso) {
          createdDate = conv.created_at_iso.split('T')[0];
        } else if (conv.created_at) {
          const created = typeof conv.created_at === 'number' ? new Date(conv.created_at * 1000) : new Date(conv.created_at);
          createdDate = created.toISOString().split('T')[0];
        }

        return {
          id: conv.id,
          client: client,
          subject: subject,
          csat: conv.rating?.rating || 0, // Intercom rating if available
          cxScore: 0, // Would need custom calculation
          length: lengthMinutes, // Duration in minutes
          errorsDetected: 0, // Would need AI analysis
          tags: Array.isArray(tags) ? tags : [], // Ensure tags is always an array
          created: createdDate,
          aiStatus: 'Completed' as const,
          channel: channel
          };
        } catch (error) {
          logError('❌ Error processing conversation', error);
          // Return a safe default conversation object
          return {
            id: conv.id || 'unknown',
            client: 'Unknown',
            subject: `Conversation ${conv.id || 'unknown'}`,
            csat: 0,
            cxScore: 0,
            length: 0,
            errorsDetected: 0,
            tags: [], // Always an array
            created: conv.created_at_iso || (conv.created_at ? new Date(conv.created_at * 1000).toISOString().split('T')[0] : ''),
            aiStatus: 'Completed' as const,
            channel: 'chat'
          };
        }
      }).filter(Boolean); // Remove any null/undefined entries

      logInfo(`✅ Loaded ${this.conversations.length} conversations`, {
        originalCount: data.conversations?.length || 0,
        transformedCount: this.conversations.length,
        employeeEmail
      });

      // Calculate statistics from conversations using dynamic import
      let statistics: ConversationStatistics;
      try {
        // @ts-ignore - Runtime import path
        const statsModule = await import('/js/features/create-audit/presentation/utils/conversation-statistics.js');
        statistics = statsModule.calculateConversationStatistics(
          this.conversations as Conversation[],
          data.participation_count || 0
        );
      } catch (error) {
        logError('Error loading conversation statistics module:', error);
        // Fallback: create empty statistics
        statistics = {
          totalConversations: this.conversations.length,
          totalParticipationParts: data.participation_count || 0,
          averageCSAT: 0,
          conversationsWithRating: 0,
          averageConversationLength: 0,
          totalConversationLength: 0,
          channelBreakdown: {},
          tagBreakdown: {},
          conversationsByDate: {}
        };
      }

      // Notify statistics callback if registered
      if (this.onStatisticsUpdatedCallback) {
        this.onStatisticsUpdatedCallback(statistics);
      }

      // Ensure conversations are displayed even if filters would hide them initially
      if (this.conversations.length > 0) {
        this.applyFilters();
      } else {
        // If no conversations after transformation, still render to show empty state
        this.renderConversations([]);
      }
    } catch (error) {
      
      logError('❌ Error pulling conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const tableBody = this.getTableBody();
      if (tableBody && tableBody.parentElement) {
        tableBody.textContent = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 11;
        cell.className = 'px-4 py-16 text-center';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'flex flex-col items-center gap-3';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-8 h-8 text-red-400');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('d', 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
        svg.appendChild(path);
        iconDiv.appendChild(svg);
        
        const titleP = document.createElement('p');
        titleP.className = 'text-red-400 text-sm font-semibold';
        titleP.textContent = 'Error loading conversations';
        
        const messageP = document.createElement('p');
        messageP.className = 'text-white/50 text-xs';
        messageP.textContent = errorMessage;
        
        errorDiv.appendChild(iconDiv);
        errorDiv.appendChild(titleP);
        errorDiv.appendChild(messageP);
        cell.appendChild(errorDiv);
      } else {
        logError('Cannot display error: table body not available');
      }
    }
  }

  /**
   * Get Supabase URL from environment API or cached value
   */
  private async getSupabaseUrlFromEnv(): Promise<string | null> {
    try {
      // Try to get from cache first (stored during initialization)
      const cachedUrl = localStorage.getItem('supabase_url');
      if (cachedUrl) {
        logInfo('Using cached Supabase URL');
        return cachedUrl;
      }

      // Fetch from API
      const response = await fetch('/api/env');
      if (response.ok) {
        const env = await response.json();
        const url = env.SUPABASE_URL || null;
        
        // Cache it for future use
        if (url) {
          localStorage.setItem('supabase_url', url);
        }
        
        return url;
      } else {
        logWarn(`Failed to fetch Supabase URL: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logWarn('Failed to fetch Supabase URL from environment:', error);
    }
    return null;
  }

  private applyFilters(): void {
    const startDate = (this.container.querySelector('#conversation-start-date') as HTMLInputElement)?.value;
    const endDate = (this.container.querySelector('#conversation-end-date') as HTMLInputElement)?.value;
    const searchTerm = (this.container.querySelector('#conversation-search') as HTMLInputElement)?.value.toLowerCase();

    let filtered = [...this.conversations];

    if (startDate) {
      filtered = filtered.filter(conv => conv.created >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(conv => conv.created <= endDate);
    }
    if (this.selectedChannel) {
      filtered = filtered.filter(conv => conv.channel === this.selectedChannel);
    }
    if (searchTerm) {
      filtered = filtered.filter(conv =>
        conv.client.toLowerCase().includes(searchTerm) ||
        conv.subject.toLowerCase().includes(searchTerm) ||
        conv.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    this.renderConversations(filtered);
  }

  private renderConversations(conversations: Conversation[]): void {
    const tableBody = this.getTableBody();
    
    if (!tableBody || !tableBody.parentElement) {
      logError('Cannot render conversations: table body not available', {
        hasTableBody: !!tableBody,
        hasParent: tableBody ? !!tableBody.parentElement : false
      });
      return;
    }
    
    if (conversations.length === 0) {
      tableBody.textContent = '';
      const row = tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 11;
      cell.className = 'px-4 py-16 text-center';
      
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'flex flex-col items-center gap-3';
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'w-16 h-16 rounded-full bg-white/5 flex items-center justify-center';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'w-8 h-8 text-white/30');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('d', 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z');
      svg.appendChild(path);
      iconDiv.appendChild(svg);
      
      const titleP = document.createElement('p');
      titleP.className = 'text-white/60 text-sm font-medium';
      titleP.textContent = 'No conversations found';
      
      const messageP = document.createElement('p');
      messageP.className = 'text-white/40 text-xs';
      messageP.textContent = 'Try adjusting your filters or date range';
      
      emptyDiv.appendChild(iconDiv);
      emptyDiv.appendChild(titleP);
      emptyDiv.appendChild(messageP);
      cell.appendChild(emptyDiv);
      return;
    }

    // Build HTML string with proper escaping
    const htmlContent = conversations.map(conv => {
      const isSelected = this.selectedConversationIds.has(conv.id);
      const aiStatusClass = conv.aiStatus.toLowerCase() === 'completed' ? 'completed' :
                           conv.aiStatus.toLowerCase() === 'processing' ? 'processing' : 'failed';

      // Channel icon mapping
      const channelIcons: Record<string, string> = {
        'chat': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
        'email': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
        'phone': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>',
      };
      const channelIcon = channelIcons[conv.channel || 'chat'] || channelIcons['chat'];
      const channelLabel = conv.channel ? conv.channel.charAt(0).toUpperCase() + conv.channel.slice(1) : 'Chat';
      
      // Format subject to be more readable (remove ID if it's in the subject)
      let subjectDisplay = conv.subject;
      // Remove "Conversation" prefix and ID if present
      if (subjectDisplay.startsWith('Conversation ')) {
        subjectDisplay = subjectDisplay.replace(/^Conversation \d+/, '').trim() || 'Conversation';
      }
      // Truncate if too long
      if (subjectDisplay.length > 50) {
        subjectDisplay = subjectDisplay.substring(0, 50) + '...';
      }
      
      // Format date
      const dateDisplay = conv.created || '-';
      
      // CSAT stars
      const csatStars = '★'.repeat(Math.min(conv.csat, 5)) + '☆'.repeat(Math.max(0, 5 - conv.csat));
      
      // Format ID to be more readable (show last 8 digits)
      const shortId = conv.id.length > 12 ? conv.id.substring(conv.id.length - 8) : conv.id;
      
      return `
        <tr class="conversation-row ${isSelected ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''} hover:bg-white/5 transition-colors">
          <td class="px-2 py-2">
            <input type="checkbox" class="conversation-checkbox form-checkbox w-3.5 h-3.5" 
                   value="${this.escapeHtml(conv.id)}" ${isSelected ? 'checked' : ''} />
          </td>
          <td class="px-2 py-2">
            <div class="conversation-id-tile" title="${this.escapeHtml(conv.id)}">
              <span class="text-white/60 text-xs font-mono">${this.escapeHtml(shortId)}</span>
            </div>
          </td>
          <td class="px-2 py-2">
            <div class="flex items-center gap-1.5">
              <div class="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xs font-semibold text-blue-300 border border-white/10 flex-shrink-0">
                ${this.escapeHtml(conv.client.charAt(0).toUpperCase())}
              </div>
              <span class="font-medium text-white/90 text-xs truncate max-w-[120px]" title="${this.escapeHtml(conv.client)}">${this.escapeHtml(conv.client)}</span>
            </div>
          </td>
          <td class="px-2 py-2">
            <div class="flex items-center gap-1.5">
              <div class="w-4 h-4 text-white/50 flex-shrink-0">${channelIcon}</div>
              <span class="text-white/80 text-xs truncate max-w-[200px]" title="${this.escapeHtml(conv.subject)}">${this.escapeHtml(subjectDisplay)}</span>
            </div>
          </td>
          <td class="px-2 py-2 text-center">
            <span class="text-yellow-400 text-xs font-medium">${csatStars}</span>
          </td>
          <td class="px-2 py-2 text-center">
            <span class="inline-flex items-center justify-center w-8 h-5 rounded-md text-xs font-semibold ${conv.cxScore >= 80 ? 'bg-green-500/20 text-green-400' : conv.cxScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}">
              ${conv.cxScore}
            </span>
          </td>
          <td class="px-2 py-2 text-center">
            <span class="text-white/70 text-xs font-medium">${conv.length}m</span>
          </td>
          <td class="px-2 py-2 text-center">
            ${conv.errorsDetected > 0 ? `<span class="inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-semibold bg-red-500/20 text-red-400">${conv.errorsDetected}</span>` : '<span class="text-white/30 text-xs">-</span>'}
          </td>
          <td class="px-2 py-2">
            <div class="flex flex-wrap gap-1">
              ${Array.isArray(conv.tags) && conv.tags.length > 0 ? conv.tags.slice(0, 2).map(tag => `<span class="conversation-tag-compact">${this.escapeHtml(tag)}</span>`).join('') + (conv.tags.length > 2 ? `<span class="text-white/40 text-xs">+${conv.tags.length - 2}</span>` : '') : '<span class="text-white/30 text-xs">-</span>'}
            </div>
          </td>
          <td class="px-2 py-2">
            <span class="text-white/70 text-xs">${dateDisplay}</span>
          </td>
          <td class="px-2 py-2 text-center">
            <span class="ai-status-badge-compact ${aiStatusClass}">${this.escapeHtml(conv.aiStatus.charAt(0))}</span>
          </td>
        </tr>
      `;
    }).join('');

    // Safely set HTML content using DOMPurify
    safeSetHTML(tableBody, htmlContent);

    // Attach checkbox listeners
    tableBody.querySelectorAll('.conversation-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const convId = (e.target as HTMLInputElement).value;
        const checked = (e.target as HTMLInputElement).checked;
        this.toggleConversation(convId, checked);
      });
    });
  }

  private toggleConversation(conversationId: string, checked: boolean): void {
    if (checked) {
      this.selectedConversationIds.add(conversationId);
    } else {
      this.selectedConversationIds.delete(conversationId);
    }
    this.updateSelectionUI();
  }

  private toggleAllConversations(checked: boolean): void {
    const tableBody = this.getTableBody();
    const checkboxes = tableBody.querySelectorAll('.conversation-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      this.toggleConversation(checkbox.value, checked);
    });
  }

  private updateSelectionUI(): void {
    const count = this.selectedConversationIds.size;
    const countElement = this.container.querySelector('#selected-count');
    const actionsPanel = this.container.querySelector('#selected-conversations-actions');

    if (countElement) {
      countElement.textContent = count.toString();
    }

    if (actionsPanel) {
      if (count > 0) {
        actionsPanel.classList.remove('hidden');
      } else {
        actionsPanel.classList.add('hidden');
      }
    }

    // Update select all checkbox
    const selectAll = this.container.querySelector('#select-all-conversations') as HTMLInputElement;
    if (selectAll) {
      const tableBody = this.getTableBody();
      const visibleCheckboxes = Array.from(tableBody.querySelectorAll('.conversation-checkbox') as NodeListOf<HTMLInputElement>);
      const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
      selectAll.checked = allChecked;
    }
  }

  private useSelectedConversations(): void {
    const selectedIds = Array.from(this.selectedConversationIds);
    if (this.onConversationsSelectedCallback) {
      this.onConversationsSelectedCallback(selectedIds);
    }
  }

  private clearConversations(): void {
    this.conversations = [];
    this.selectedConversationIds.clear();
    
    try {
      const tableBody = this.getTableBody();
      if (tableBody && tableBody.parentElement) {
        tableBody.textContent = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 11; // Fixed: should be 11 columns, not 10
        cell.className = 'px-4 py-8 text-center text-white/60 text-sm';
        cell.textContent = 'Loading conversations...';
      } else {
        logWarn('Cannot clear conversations: table body not available');
      }
    } catch (error) {
      logError('Error clearing conversations:', error);
    }
    
    this.updateSelectionUI();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getSelectedConversations(): string[] {
    return Array.from(this.selectedConversationIds);
  }
}

