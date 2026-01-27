/**
 * Audit List Renderer
 * Renders the list of audit cards
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { AuditReport, PaginationState } from '../../domain/entities.js';
import type { AuditReportsController } from '../audit-reports-controller.js';

/**
 * Format date for display
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return 'N/A';
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return '';
  }
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}


/**
 * Normalize passing status
 * Handles various formats: boolean, string, number, etc.
 * Database stores: "Passing" and "Not Passing"
 */
function normalizePassingStatus(status: string | boolean | number | undefined | null): string {
  // Handle null or undefined
  if (status === null || status === undefined) {
    return 'Not Passed';
  }
  
  // Handle boolean values
  if (typeof status === 'boolean') {
    return status ? 'Passed' : 'Not Passed';
  }
  
  // Handle number values (1 = passed, 0 = not passed)
  if (typeof status === 'number') {
    return status === 1 || status > 0 ? 'Passed' : 'Not Passed';
  }
  
  // Handle string values
  if (typeof status === 'string') {
    const normalized = status.toLowerCase().trim();
    
    // IMPORTANT: Check for "not" variations FIRST to avoid matching "Not Passing" as "Passed"
    // Check for not passed variations (must come before checking for "pass")
    if (normalized === 'not passing' || 
        normalized === 'not passed' || 
        normalized === 'notpass' ||
        normalized === 'notpassing' ||
        normalized.startsWith('not pass') ||
        normalized === 'failed' ||
        normalized === 'fail' ||
        normalized === 'false' ||
        normalized === '0' ||
        normalized === 'no' ||
        normalized === 'n') {
      return 'Not Passed';
    }
    
    // Check for passed variations (only after checking for "not")
    if (normalized === 'passed' || 
        normalized === 'passing' ||
        normalized === 'pass' || 
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'yes' ||
        normalized === 'y') {
      return 'Passed';
    }
    
    // If it's a non-empty string that doesn't match, try to infer
    if (normalized.length > 0) {
      // Check for "not" first
      if (normalized.includes('not')) {
        return 'Not Passed';
      }
      // Then check for "pass" (but not "not pass")
      if (normalized.includes('pass')) {
        return 'Passed';
      }
      // Check for fail
      if (normalized.includes('fail')) {
        return 'Not Passed';
      }
      // Default to the original string capitalized
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  }
  
  // Default fallback
  return 'Not Passed';
}

/**
 * Render audit list
 */
export function renderAuditList(
  container: HTMLElement,
  audits: AuditReport[],
  controller: AuditReportsController
): void {
  const auditCards = audits.map(audit => renderAuditCard(audit, controller));
  safeSetHTML(container, auditCards.join(''));
  
  // Ensure container has proper styling
  if (!container.style.display || container.style.display === 'none') {
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '0.375rem';
    container.style.width = '100%';
  }
  
  // Setup profile tooltips for participant chips
  setupProfileTooltips(container, audits);
  
  // Setup event delegation for View Details buttons
  setupViewDetailsButtonHandlers(container, controller);
}

/**
 * Setup event delegation for View Details button clicks
 */
function setupViewDetailsButtonHandlers(container: HTMLElement, controller: AuditReportsController): void {
  // Remove any existing listener to prevent duplicates
  const existingHandler = (container as any).__viewDetailsHandler;
  if (existingHandler) {
    container.removeEventListener('click', existingHandler);
  }
  
  // Create new handler
  const handler = async (e: Event) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action="view-details"]') as HTMLButtonElement;
    
    if (button) {
      e.preventDefault();
      e.stopPropagation();
      
      const auditId = button.dataset.auditId;
      if (auditId) {
        console.log('[AuditReports] View Details button clicked for audit:', auditId);
        
        // Always prefer window.auditReportsController as it has the methods attached
        const globalController = (window as any).auditReportsController;
        
        if (globalController?.showAuditModal) {
          console.log('[AuditReports] Using global controller showAuditModal');
          try {
            await globalController.showAuditModal(auditId);
          } catch (error) {
            console.error('[AuditReports] Error calling showAuditModal:', error);
          }
        } else if ((controller as any).showAuditModal) {
          console.log('[AuditReports] Using local controller showAuditModal');
          try {
            await (controller as any).showAuditModal(auditId);
          } catch (error) {
            console.error('[AuditReports] Error calling showAuditModal:', error);
          }
        } else {
          console.error('[AuditReports] showAuditModal method not found on any controller');
          console.log('[AuditReports] Global controller available:', !!globalController);
          console.log('[AuditReports] Global controller methods:', globalController ? Object.keys(globalController) : 'N/A');
        }
      }
    }
  };
  
  // Store reference for cleanup
  (container as any).__viewDetailsHandler = handler;
  
  // Add event listener with capture phase to ensure it runs before any blocking handlers
  container.addEventListener('click', handler, { capture: true });
}

/**
 * Setup profile tooltips and load profile pictures
 */
function setupProfileTooltips(container: HTMLElement, audits: AuditReport[]): void {
  // Load profile pictures for all avatars
  loadProfilePictures(container);
  
  // Setup tooltips
  container.querySelectorAll('.participant-chip').forEach(chip => {
    const auditId = chip.getAttribute('data-audit-id');
    const employeeEmail = chip.getAttribute('data-employee-email');
    if (!auditId || !employeeEmail) return;
    
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;
    
    const employeeName = audit.employeeName || (audit as any).employee_name || '';
    const employeeType = audit.employeeType || (audit as any).employee_type || '';
    const countryOfEmployee = audit.countryOfEmployee || (audit as any).country_of_employee || '';
    
    let tooltip: HTMLDivElement | null = null;
    let hideTimeout: NodeJS.Timeout | null = null;
    
    const showTooltip = async (e: MouseEvent) => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      if (tooltip) {
        tooltip.remove();
      }
      
      tooltip = document.createElement('div');
      tooltip.className = 'participant-profile-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      
      const initials = getInitials(employeeName);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      
      // Try to get avatar URL
      let avatarUrl: string | null = null;
      try {
        const { getSecureSupabase } = await import('../../../../utils/secure-supabase.js');
        const supabase = await getSecureSupabase(false);
        
        const { data: userData } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('email', employeeEmail)
          .single();
        
        avatarUrl = userData?.avatar_url || null;
        
        if (!avatarUrl) {
          const { data: peopleData } = await supabase
            .from('people')
            .select('avatar_url')
            .eq('email', employeeEmail)
            .single();
          avatarUrl = peopleData?.avatar_url || null;
        }
      } catch (error) {
        // Keep avatarUrl as null
      }
      
      tooltip.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        padding: 1rem;
        z-index: 10000;
        min-width: 280px;
        max-width: 320px;
        pointer-events: auto;
        border: 0.0469rem solid var(--border-light, #e5e7eb);
      `;
      
      const avatarHtml = avatarUrl && avatarUrl.trim() !== '' && avatarUrl !== 'null' && avatarUrl !== 'undefined'
        ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(employeeName)}" style="width: 100%; height: 100%; object-fit: cover; display: block;" referrerPolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background-color: var(--primary-color, #1a733e);">
             <span style="color: white; font-weight: 700; font-size: 1rem; font-family: 'Poppins', sans-serif;">${escapeHtml(initials)}</span>
           </div>`
        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--primary-color, #1a733e);">
             <span style="color: white; font-weight: 700; font-size: 1rem; font-family: 'Poppins', sans-serif;">${escapeHtml(initials)}</span>
           </div>`;
      
      safeSetHTML(tooltip, `
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="width: 3rem; height: 3rem; border-radius: 0.25rem; overflow: hidden; flex-shrink: 0; position: relative; background-color: var(--primary-color, #1a733e);">
            ${avatarHtml}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.9375rem; color: var(--text-color, #111827); margin-bottom: 0.25rem; font-family: 'Poppins', sans-serif;">${escapeHtml(employeeName || 'N/A')}</div>
            <div style="font-size: 0.8125rem; color: var(--text-secondary, #6b7280); font-family: 'Poppins', sans-serif;">${escapeHtml(employeeEmail)}</div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${employeeType ? `<div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
            <span style="color: var(--text-secondary, #6b7280);">Employee Type:</span>
            <span style="color: var(--text-color, #111827); font-weight: 500;">${escapeHtml(employeeType)}</span>
          </div>` : ''}
          ${countryOfEmployee ? `<div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
            <span style="color: var(--text-secondary, #6b7280);">Country:</span>
            <span style="color: var(--text-color, #111827); font-weight: 500;">${escapeHtml(countryOfEmployee)}</span>
          </div>` : ''}
        </div>
      `);
      
      document.body.appendChild(tooltip);
      
      // Position tooltip
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.bottom + 8;
      
      // Adjust if tooltip goes off screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }
      if (top + tooltipRect.height > viewportHeight - 8) {
        top = rect.top - tooltipRect.height - 8;
      }
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      
      // Keep tooltip visible when hovering over it
      tooltip.addEventListener('mouseenter', () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      });
      
      tooltip.addEventListener('mouseleave', () => {
        hideTooltip();
      });
    };
    
    const hideTooltip = () => {
      hideTimeout = setTimeout(() => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      }, 100);
    };
    
    chip.addEventListener('mouseenter', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      showTooltip(mouseEvent);
    });
    chip.addEventListener('mouseleave', (e: Event) => {
      hideTooltip();
    });
  });
}

/**
 * Load profile pictures for all employee avatars
 */
async function loadProfilePictures(container: HTMLElement): Promise<void> {
  const participantChips = container.querySelectorAll('.participant-chip');
  if (participantChips.length === 0) {
    return;
  }
  
  const uniqueEmails = new Set<string>();
  const emailToAvatarsMap = new Map<string, HTMLElement[]>();
  
  // Collect unique employee emails and map them to their avatars (can have multiple avatars per email)
  participantChips.forEach(chip => {
    const email = chip.getAttribute('data-employee-email');
    if (email && email !== 'N/A' && email.trim() !== '') {
      uniqueEmails.add(email);
      // Find the avatar in the same audit card (parent container)
      const auditCard = chip.closest('.audit-card');
      const avatar = auditCard?.querySelector('.employee-avatar') as HTMLElement;
      if (avatar) {
        // Store all avatars for this email (in case same employee appears multiple times)
        if (!emailToAvatarsMap.has(email)) {
          emailToAvatarsMap.set(email, []);
        }
        emailToAvatarsMap.get(email)!.push(avatar);
      }
    }
  });
  
  if (uniqueEmails.size === 0) {
    return;
  }
  
  // Fetch avatar URLs for all unique emails
  try {
    const { getSecureSupabase } = await import('../../../../utils/secure-supabase.js');
    const supabase = await getSecureSupabase(false);
    
    const emailArray = Array.from(uniqueEmails);
    
    // Fetch from users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('email, avatar_url')
      .in('email', emailArray);
    
    if (usersError) {
      // Error fetching from users table - will try people table
    }
    
    // Fetch from people table for any missing
    const foundEmails = new Set((usersData || []).map((u: any) => u.email));
    const missingEmails = emailArray.filter(e => !foundEmails.has(e));
    
    let peopleData: any[] = [];
    if (missingEmails.length > 0) {
      const { data, error: peopleError } = await supabase
        .from('people')
        .select('email, avatar_url')
        .in('email', missingEmails);
      
      if (peopleError) {
        // Error fetching from people table
      } else {
        peopleData = data || [];
      }
    }
    
    // Create a map of email -> avatar_url
    const avatarUrlMap = new Map<string, string | null>();
    (usersData || []).forEach((u: any) => {
      if (u.avatar_url && u.avatar_url.trim() !== '' && u.avatar_url !== 'null' && u.avatar_url !== 'undefined') {
        avatarUrlMap.set(u.email, u.avatar_url);
      }
    });
    peopleData.forEach(p => {
      if (p.avatar_url && p.avatar_url.trim() !== '' && p.avatar_url !== 'null' && p.avatar_url !== 'undefined') {
        if (!avatarUrlMap.has(p.email)) {
          avatarUrlMap.set(p.email, p.avatar_url);
        }
      }
    });
    
    // Update all avatars with profile pictures
    let loadedCount = 0;
    emailToAvatarsMap.forEach((avatars, email) => {
      const avatarUrl = avatarUrlMap.get(email);
      if (avatarUrl) {
        // Update all avatars for this email
        avatars.forEach(avatar => {
          // Check if image already exists to avoid duplicates
          if (avatar.querySelector('img')) return;
          
          const initialsEl = avatar.querySelector('.avatar-initials') as HTMLElement;
          const img = document.createElement('img');
          img.src = avatarUrl;
          img.alt = 'Profile';
          img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; top: 0; left: 0; z-index: 2;';
          img.referrerPolicy = 'no-referrer';
          
          img.onerror = () => {
            // If image fails, keep initials visible
            img.remove();
          };
          
          img.onload = () => {
            // Hide initials when image loads successfully
            if (initialsEl) {
              initialsEl.style.display = 'none';
            }
            loadedCount++;
          };
          
          avatar.appendChild(img);
        });
      }
    });
  } catch (error) {
    // Log error for debugging
    console.error('Failed to load profile pictures:', error);
  }
}

/**
 * Render single audit card
 */
function renderAuditCard(audit: AuditReport, controller: AuditReportsController): string {
  // Get passing status from various possible field names
  const passingStatus = audit.passingStatus || 
                       (audit as any).passing_status || 
                       (audit as any).passingStatus || 
                       undefined;
  
  const status = normalizePassingStatus(passingStatus);
  const statusIcon = status === 'Passed' ? '✓' : '✗';
  
  const submittedDate = formatDate(
    typeof audit.submittedAt === 'string' ? audit.submittedAt :
    typeof audit.submitted_at === 'string' ? audit.submitted_at :
    typeof audit.auditTimestamp === 'string' ? audit.auditTimestamp :
    (audit as any).submitted_at || (audit as any).submittedAt || undefined
  );
  
  const timeAgo = formatTimeAgo(
    typeof audit.submittedAt === 'string' ? audit.submittedAt :
    typeof audit.submitted_at === 'string' ? audit.submitted_at :
    typeof audit.auditTimestamp === 'string' ? audit.auditTimestamp :
    (audit as any).submitted_at || (audit as any).submittedAt || undefined
  );
  
  // Handle both camelCase and snake_case field names
  const employeeName = escapeHtml(
    audit.employeeName || 
    (audit as any).employee_name || 
    ''
  ) || 'N/A';
  const employeeEmail = escapeHtml(
    audit.employeeEmail || 
    (audit as any).employee_email || 
    ''
  ) || 'N/A';
  const interactionId = escapeHtml(
    audit.interactionId || 
    (audit as any).interaction_id || 
    ''
  ) || 'N/A';
  // Use channelName if available, otherwise fall back to channel
  const channelDisplay = escapeHtml(
    audit.channelName || 
    audit.channel || 
    (audit as any).channel_name ||
    (audit as any).channel || 
    ''
  ) || 'N/A';
  const scorecardName = escapeHtml(
    audit._scorecard_name || 
    (audit as any)._scorecard_name || 
    'Unknown Scorecard'
  );
  
  const auditorName = escapeHtml(
    audit.auditorName || 
    (audit as any).auditor_name || 
    ''
  ) || 'N/A';
  
  const acknowledgementStatus = (audit.acknowledgementStatus || (audit as any).acknowledgement_status || '').toLowerCase();
  const isAcknowledged = acknowledgementStatus === 'acknowledged' || acknowledgementStatus === 'acknowledge';
  
  // Handle numeric values - convert to number if string
  const averageScore = typeof audit.averageScore === 'number' 
    ? audit.averageScore 
    : (typeof audit.averageScore === 'string' 
        ? parseFloat(audit.averageScore) || 0 
        : ((audit as any).average_score !== undefined && (audit as any).average_score !== null
            ? (typeof (audit as any).average_score === 'number' 
                ? (audit as any).average_score 
                : parseFloat(String((audit as any).average_score)) || 0)
            : 0));
  
  const totalErrors = typeof audit.totalErrorsCount === 'number'
    ? audit.totalErrorsCount
    : (typeof audit.totalErrorsCount === 'string'
        ? parseInt(audit.totalErrorsCount, 10) || 0
        : ((audit as any).total_errors_count !== undefined && (audit as any).total_errors_count !== null
            ? (typeof (audit as any).total_errors_count === 'number'
                ? (audit as any).total_errors_count
                : parseInt(String((audit as any).total_errors_count), 10) || 0)
            : 0));

  const initials = getInitials(employeeName);
  const auditId = escapeHtml(audit.id);
  
  // Determine score color based on value
  const scoreValue = typeof averageScore === 'number' ? averageScore : parseFloat(String(averageScore)) || 0;
  const scoreColor = scoreValue >= 80 ? 'var(--success, #10b981)' : scoreValue >= 60 ? 'var(--warning, #f59e0b)' : 'var(--error, #ef4444)';
  
  // Error color - green when 0 errors (like passing), red otherwise (same as not passing chip)
  const errorColor = totalErrors === 0 ? 'var(--primary-color, #1a733e)' : '#dc2626';

  return `
    <div class="audit-card" data-audit-id="${auditId}" style="background: var(--background-white, #ffffff); border: 0.0469rem solid var(--border-light, #e5e7eb); border-radius: 0.375rem; padding: 0.5rem; margin-bottom: 0.375rem; box-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05);">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
        <!-- Left Section: Avatar, Name, Badges, Metadata -->
        <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0;">
          <!-- Avatar -->
          <div class="employee-avatar" style="width: 1.875rem; height: 1.875rem; background-color: var(--primary-color, #1a733e); border-radius: 0.25rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; position: relative; transition: transform 0.2s;">
            <span class="avatar-initials" style="color: white; font-size: 0.6875rem; font-weight: 700; font-family: 'Poppins', sans-serif; z-index: 1;">${initials}</span>
          </div>
          
          <!-- Name, Badges, and Metadata Container -->
          <div style="display: flex; flex-direction: column; gap: 0.1875rem; flex: 1; min-width: 0;">
            <!-- First Row: Name + Badges (horizontally aligned) -->
            <div style="display: flex; align-items: center; gap: 0.4375rem; flex-wrap: wrap;">
              <!-- Employee Name - Hoverable -->
              <div class="participant-chip" data-audit-id="${auditId}" data-employee-email="${escapeHtml(employeeEmail)}" style="cursor: pointer; flex-shrink: 0;">
                <span class="participant-name" style="font-size: 0.8125rem; font-weight: 600; color: var(--text-color, #1a202c); font-family: 'Poppins', sans-serif;">${employeeName}</span>
              </div>
              
              <!-- Badges: Channel, Status+Score (split chip), Errors (start right after name) -->
              <!-- Channel Badge -->
              <span style="background-color: var(--gray-100, #f3f4f6); color: var(--text-secondary, #6b7280); padding: 0.125rem 0.3125rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 600; white-space: nowrap;">${channelDisplay}</span>
              
              <!-- Split Chip: Passing Status + Score (merged) -->
              <span style="display: inline-flex; align-items: center; border-radius: 0.25rem; overflow: hidden; white-space: nowrap; font-size: 0.625rem; font-weight: 600; box-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.1);">
                ${status === 'Passed' ? `
                  <!-- Status Side (Left) - Using #1A733E as requested -->
                  <span style="background-color: #1A733E; color: white; padding: 0.125rem 0.3125rem; display: inline-flex; align-items: center; gap: 0.1875rem;">
                    <svg style="width: 0.6875rem; height: 0.6875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span style="color: white !important;">Passed</span>
                  </span>
                  <!-- Score Side (Right) - Darker shade of #1A733E -->
                  <span style="background-color: #0d5e3a; color: white; padding: 0.125rem 0.3125rem; border-left: 0.0469rem solid rgba(255, 255, 255, 0.2); display: inline-flex; align-items: center;">
                    <span style="color: white !important;">${typeof averageScore === 'number' ? averageScore.toFixed(0) : averageScore}%</span>
                  </span>
                ` : `
                  <!-- Status Side (Left) - Darker red -->
                  <span style="background-color: #dc2626; color: white; padding: 0.125rem 0.3125rem; display: inline-flex; align-items: center; gap: 0.1875rem;">
                    <svg style="width: 0.6875rem; height: 0.6875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span style="color: white !important;">Not Passed</span>
                  </span>
                  <!-- Score Side (Right) - Even darker red -->
                  <span style="background-color: #b91c1c; color: white; padding: 0.125rem 0.3125rem; border-left: 0.0469rem solid rgba(255, 255, 255, 0.2); display: inline-flex; align-items: center;">
                    <span style="color: white !important;">${typeof averageScore === 'number' ? averageScore.toFixed(0) : averageScore}%</span>
                  </span>
                `}
              </span>
              
              <!-- Error Count Badge (separate) - Green when 0 errors, red otherwise -->
              <span style="background-color: ${errorColor}15; color: ${errorColor}; padding: 0.125rem 0.3125rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 600; white-space: nowrap; border: 0.0469rem solid ${errorColor}40; display: inline-flex; align-items: center; gap: 0.1875rem;">
                <svg xmlns="http://www.w3.org/2000/svg" height="11px" viewBox="0 -960 960 960" width="11px" fill="${errorColor}">
                  <path d="m376-400 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/>
                </svg>
                <span>${totalErrors} ${totalErrors === 1 ? 'Error' : 'Errors'}</span>
              </span>
            </div>
            
            <!-- Second Row: Metadata Line (below name) -->
            <div style="font-size: 0.625rem; color: var(--text-secondary, #6b7280); font-family: 'Poppins', sans-serif;">
              ${auditId} • ${interactionId} • ${channelDisplay} • ${auditorName} • ${timeAgo}
            </div>
          </div>
        </div>
        
        <!-- Right Section: Acknowledgement Status and View Details Button -->
        <div style="display: flex; align-items: center; gap: 0.4375rem; flex-shrink: 0;">
          <!-- Acknowledgement Status Badge -->
          ${isAcknowledged ? `
            <span style="background-color: var(--success, #10b981)15; color: var(--success, #10b981); padding: 0.1875rem 0.4375rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 600; white-space: nowrap; border: 0.0469rem solid var(--success, #10b981)40; display: inline-flex; align-items: center; gap: 0.1875rem;">
              <svg style="width: 0.6875rem; height: 0.6875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Acknowledged</span>
            </span>
          ` : `
            <span style="background-color: var(--warning, #f59e0b)15; color: var(--warning, #f59e0b); padding: 0.1875rem 0.4375rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 600; white-space: nowrap; border: 0.0469rem solid var(--warning, #f59e0b)40; display: inline-flex; align-items: center; gap: 0.1875rem;">
              <svg style="width: 0.6875rem; height: 0.6875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Acknowledgement Pending</span>
            </span>
          `}
          
          <!-- View Details Button -->
          <button 
            data-action="view-details"
            data-audit-id="${auditId}"
            class="btn-view-details"
            style="position: relative; z-index: 10; pointer-events: auto;"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  `;
}

