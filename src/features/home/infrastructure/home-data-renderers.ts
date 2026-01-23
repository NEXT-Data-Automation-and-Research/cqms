/**
 * Home Data Renderers
 * Extracted rendering functions for better code organization and caching
 */

/**
 * Render assigned audits list with pagination support
 */
export function renderAssignedAuditsList(
  audits: any[],
  options: {
    isAgent: boolean;
    allUsers: any[];
    getInitials: (name: string) => string;
    formatTimestamp: (date: string) => string;
    escapeHtml: (text: string) => string;
    sortBy: string;
    sortAudits: (audits: any[]) => void;
    pageSize?: number;
    displayed?: number;
  }
): string {
  const {
    isAgent,
    allUsers,
    getInitials,
    formatTimestamp,
    escapeHtml,
    sortBy,
    sortAudits,
    pageSize = 20,
    displayed = pageSize
  } = options;

  if (audits.length === 0) {
    const emptyMessage = isAgent 
      ? 'Your completed audits will appear here'
      : 'No pending audits assigned';
    return `
      <div class="px-4 py-8 text-center text-gray-500 text-xs">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="font-medium text-gray-700 mb-1">No audits found</p>
        <p class="text-gray-500">${emptyMessage}</p>
      </div>
    `;
  }

  // Sort audits
  const sorted = [...audits];
  sortAudits(sorted);

  // Pagination: only show first N items
  const toDisplay = sorted.slice(0, displayed);
  const hasMore = sorted.length > displayed;

  return toDisplay.map(audit => {
    const isAssignment = audit._isAssignment === true;
    
    if (isAssignment) {
      // Render assignment (pending audit) for auditors
      const employeeEmail = (audit.employee_email || '').toLowerCase().trim();
      const displayUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
      const displayName = audit.employee_name || displayUser?.name || audit.employee_email?.split('@')[0] || 'Unknown';
      const displayEmail = audit.employee_email || '';
      const scorecardName = audit._scorecard_name || 'Unknown Scorecard';
      const initials = getInitials(displayName);
      
      let statusBadge = '';
      if (audit.status === 'in_progress') {
        statusBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-800">In Progress</span>';
      } else {
        statusBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">Pending</span>';
      }
      
      const requestDate = formatTimestamp(audit.created_at);

      return `
        <div class="px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0" onclick="window.location.href='create-audit.html'">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <div class="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                ${initials}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <h4 class="text-xs font-semibold text-gray-900 truncate">
                    ${escapeHtml(displayName)}
                  </h4>
                </div>
                <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap">
                  <span class="truncate">${escapeHtml(displayEmail)}</span>
                  <span class="text-gray-300">•</span>
                  <span class="font-medium text-gray-700">${escapeHtml(scorecardName)}</span>
                  <span class="text-gray-300">•</span>
                  <span>${requestDate}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              ${statusBadge}
              <button data-action="create-audit" class="px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded hover:bg-primary-dark transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Render completed audit
      // Implementation continues...
      return ''; // Placeholder - full implementation would go here
    }
  }).join('') + (hasMore ? `
    <div class="px-4 py-3 border-t border-gray-200">
      <button onclick="loadMoreAssignedAudits()" class="w-full px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors">
        Load More (${sorted.length - displayed} remaining)
      </button>
    </div>
  ` : '');
}
